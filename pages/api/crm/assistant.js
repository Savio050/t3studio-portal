/**
 * POST /api/crm/assistant
 * AI assistant powered by Google Gemini with function-calling tools.
 * Covers: content pipeline, tasks, clients, financial transactions, script prompts.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId } from '../../../lib/notionId';
import path from 'path';
import fs from 'fs';

export const config = { maxDuration: 60 };

const notion      = new Client({ auth: process.env.NOTION_TOKEN });
const CONTENT_DB  = sanitizeNotionId(process.env.NOTION_CONTENT_DB_ID)  || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';
const TASKS_DB    = sanitizeNotionId(process.env.NOTION_TASKS_DB_ID)    || '343f7ecb-bb9b-802c-b08a-daf9cff75672';
const SECTORS_DB  = sanitizeNotionId(process.env.NOTION_SECTORS_DB_ID)  || '32df7ecb-bb9b-80a0-af6f-d69061b82a36';
const FINANCE_DB  = sanitizeNotionId(process.env.NOTION_FINANCE_DB_ID);
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

// ── File helpers ──────────────────────────────────────────────────────────────
function slugify(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}
function readFileIfExists(p) {
  try { return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null; } catch { return null; }
}
function listDir(p) {
  try { return fs.readdirSync(p); } catch { return []; }
}

// ── Notion prop reader ────────────────────────────────────────────────────────
function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text        || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text    || '';
    case 'select':       return prop.select?.name                  || '';
    case 'multi_select': return prop.multi_select?.map(s => s.name) || [];
    case 'status':       return prop.status?.name                  || '';
    case 'date':         return prop.date?.start                   || null;
    case 'number':       return prop.number                        ?? null;
    case 'url':          return prop.url                           || null;
    case 'checkbox':     return prop.checkbox                      ?? false;
    case 'email':        return prop.email                         || '';
    default:             return null;
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function mapContent(p) {
  const pr = p.properties;
  return {
    id:            p.id,
    nome:          getProp(pr['Nome'])            || 'Sem título',
    cliente:       getProp(pr['Cliente'])          || '',
    formato:       getProp(pr['Formato'])          || '',
    plataforma:    getProp(pr['plataforma'])       || getProp(pr['Plataforma']) || '',
    responsavel:   getProp(pr['responsável'])      || '',
    estado:        getProp(pr['Estado'])           || '',
    estadoRoteiro: getProp(pr['EstadoRoteiro'])    || '',
    postagem:      getProp(pr['Postagem'])         || null,
    dataGravacao:  getProp(pr['Data de Gravação']) || null,
  };
}

function mapTask(p) {
  const pr = p.properties;
  return {
    id:          p.id,
    nome:        getProp(pr['Nome'])            || 'Sem título',
    status:      getProp(pr['Status'])          || '',
    responsavel: getProp(pr['Responsável'])     || [],
    cliente:     getProp(pr['cliente'])         || '',
    dataEntrega: getProp(pr['Data de entrega']) || null,
  };
}

function mapTx(p) {
  const pr = p.properties;
  return {
    id:          p.id,
    nome:        getProp(pr['Nome'])        || '',
    tipo:        getProp(pr['Tipo'])        || '',
    categoria:   getProp(pr['Categoria'])   || '',
    valor:       getProp(pr['Valor'])       ?? 0,
    data:        getProp(pr['Data'])        || null,
    cliente:     getProp(pr['Cliente'])     || '',
    responsavel: getProp(pr['Responsavel']) || '',
    status:      getProp(pr['Status'])      || '',
    notas:       getProp(pr['Notas'])       || '',
  };
}

// ── Pagination helper ─────────────────────────────────────────────────────────
async function queryAll(dbId, opts = {}) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      ...opts,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function toolListContent({ cliente, estado, mes } = {}) {
  try {
    const pages = await queryAll(CONTENT_DB, {
      sorts: [{ property: 'Postagem', direction: 'ascending' }],
    });
    let items = pages.map(mapContent);
    if (cliente) items = items.filter(i => i.cliente.toLowerCase().includes(cliente.toLowerCase()));
    if (estado)  items = items.filter(i => i.estado.toLowerCase().includes(estado.toLowerCase()));
    if (mes)     items = items.filter(i => (i.postagem || '').startsWith(mes) || (i.dataGravacao || '').startsWith(mes));
    return { success: true, count: items.length, items: items.slice(0, 30) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Client ID resolution (mirrors content.js) ────────────────────────────────
const KNOWN_CLIENT_IDS = {
  't3studio':      '1000',
  'fastimoveis':   '3000',
  'mafro':         '4000',
  'fortfer':       '5000',
  'kalebemartins': '6000',
};
function normalizeClientKey(name) {
  return (name || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}
function resolveClientId(clienteName) {
  if (!clienteName) return '';
  const key = normalizeClientKey(clienteName);
  if (KNOWN_CLIENT_IDS[key]) return KNOWN_CLIENT_IDS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
  return String(7000 + (h % 3000));
}

async function toolCreateContent({ nome, cliente, formato, plataforma, responsavel, postagem, dataGravacao }) {
  try {
    const props = { 'Nome': { title: [{ text: { content: nome } }] } };
    if (cliente)      props['Cliente']          = { select: { name: cliente } };
    if (formato)      props['Formato']          = { select: { name: formato } };
    if (plataforma)   props['plataforma']       = { select: { name: plataforma } };
    if (responsavel)  props['responsável']      = { select: { name: responsavel } };
    if (postagem)     props['Postagem']         = { date: { start: postagem } };
    if (dataGravacao) props['Data de Gravação'] = { date: { start: dataGravacao } };
    // Always resolve and set ID do Cliente so content appears in the client portal
    const resolvedId = resolveClientId(cliente);
    if (resolvedId)   props['ID do Cliente']    = { rich_text: [{ text: { content: resolvedId } }] };
    const page = await notion.pages.create({ parent: { database_id: CONTENT_DB }, properties: props });
    return { success: true, item: mapContent(page), message: `Conteúdo "${nome}" criado com sucesso` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolUpdateContent({ id, nome, cliente, estado, estadoRoteiro, responsavel, postagem, feedbackCliente, feedbackRoteiro }) {
  try {
    const props = {};
    if (nome)            props['Nome']                = { title: [{ text: { content: nome } }] };
    if (cliente) {
      props['Cliente']   = { select: { name: cliente } };
      const resolvedId = resolveClientId(cliente);
      if (resolvedId)    props['ID do Cliente']       = { rich_text: [{ text: { content: resolvedId } }] };
    }
    if (estado)          props['Estado']              = { select: { name: estado } };
    if (estadoRoteiro)   props['EstadoRoteiro']       = { status: { name: estadoRoteiro } };
    if (responsavel)     props['responsável']         = { select: { name: responsavel } };
    if (postagem)        props['Postagem']            = { date: { start: postagem } };
    if (feedbackCliente) props['Feedback do Cliente'] = { rich_text: [{ text: { content: feedbackCliente } }] };
    if (feedbackRoteiro) props['Feedback do Roteiro'] = { rich_text: [{ text: { content: feedbackRoteiro } }] };
    const page = await notion.pages.update({ page_id: id, properties: props });
    return { success: true, item: mapContent(page), message: 'Conteúdo atualizado' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolDeleteContent({ id }) {
  try {
    await notion.pages.update({ page_id: id, archived: true });
    return { success: true, message: 'Conteúdo removido' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolListTasks({ status, responsavel } = {}) {
  try {
    const pages = await queryAll(TASKS_DB, {
      sorts: [{ property: 'Data de entrega', direction: 'ascending' }],
    });
    let items = pages.map(mapTask);
    if (status)      items = items.filter(i => i.status.toLowerCase().includes(status.toLowerCase()));
    if (responsavel) items = items.filter(i => {
      const r = Array.isArray(i.responsavel) ? i.responsavel.join(' ') : String(i.responsavel);
      return r.toLowerCase().includes(responsavel.toLowerCase());
    });
    return { success: true, count: items.length, items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolCreateTask({ nome, responsavel, cliente, dataEntrega, status }) {
  try {
    const props = { 'Nome': { title: [{ text: { content: nome } }] } };
    if (responsavel) {
      const arr = Array.isArray(responsavel) ? responsavel : [responsavel];
      props['Responsável'] = { multi_select: arr.map(n => ({ name: n })) };
    }
    if (cliente)     props['cliente']         = { select: { name: cliente } };
    if (dataEntrega) props['Data de entrega'] = { date: { start: dataEntrega } };
    if (status) {
      // Try select first, fall back to status type
      try {
        props['Status'] = { status: { name: status } };
      } catch {
        props['Status'] = { select: { name: status } };
      }
    }
    const page = await notion.pages.create({ parent: { database_id: TASKS_DB }, properties: props });
    return { success: true, item: mapTask(page), message: `Tarefa "${nome}" criada` };
  } catch (e) {
    // Retry with select if status type fails
    try {
      const props2 = { 'Nome': { title: [{ text: { content: nome } }] } };
      if (responsavel) {
        const arr = Array.isArray(responsavel) ? responsavel : [responsavel];
        props2['Responsável'] = { multi_select: arr.map(n => ({ name: n })) };
      }
      if (cliente)     props2['cliente']         = { select: { name: cliente } };
      if (dataEntrega) props2['Data de entrega'] = { date: { start: dataEntrega } };
      if (status)      props2['Status']          = { select: { name: status } };
      const page = await notion.pages.create({ parent: { database_id: TASKS_DB }, properties: props2 });
      return { success: true, item: mapTask(page), message: `Tarefa "${nome}" criada` };
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
}

async function toolListClients() {
  try {
    const pages = await queryAll(SECTORS_DB);
    const clients = pages
      .map(p => ({
        id:   p.id,
        nome: getProp(p.properties['Nome']) || '',
        descricao: getProp(p.properties['Descrição']) || '',
        paginaCliente: getProp(p.properties['Página do cliente']) || '',
      }))
      .filter(c => c.nome);
    return { success: true, count: clients.length, clients };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolListFinance({ tipo, periodo, cliente } = {}) {
  if (!FINANCE_DB) return { success: false, error: 'Módulo financeiro não configurado (NOTION_FINANCE_DB_ID ausente).' };
  try {
    const pages = await queryAll(FINANCE_DB, {
      sorts: [{ property: 'Data', direction: 'descending' }],
    });
    let items = pages.map(mapTx).filter(t => t.status !== 'Cancelado');
    if (tipo)    items = items.filter(i => i.tipo?.toLowerCase() === tipo.toLowerCase());
    if (cliente) items = items.filter(i => i.cliente?.toLowerCase().includes(cliente.toLowerCase()));
    if (periodo) {
      const cutoff = new Date();
      if (periodo === '30d')   cutoff.setDate(cutoff.getDate() - 30);
      if (periodo === '90d')   cutoff.setDate(cutoff.getDate() - 90);
      if (periodo === 'month') cutoff.setDate(1);
      if (periodo === 'year')  cutoff.setMonth(0, 1);
      items = items.filter(i => i.data && new Date(i.data) >= cutoff);
    }

    const receita = items.filter(i => i.tipo === 'Receita').reduce((s, i) => s + i.valor, 0);
    const despesa = items.filter(i => i.tipo === 'Despesa').reduce((s, i) => s + i.valor, 0);
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return {
      success: true,
      count: items.length,
      resumo: { receita: fmt(receita), despesa: fmt(despesa), lucro: fmt(receita - despesa) },
      items: items.slice(0, 20),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolCreateFinanceEntry({ nome, tipo, categoria, valor, data, cliente, responsavel, status, notas }) {
  if (!FINANCE_DB) return { success: false, error: 'Módulo financeiro não configurado.' };
  try {
    const props = {
      'Nome': { title: [{ text: { content: nome } }] },
    };
    if (tipo)        props['Tipo']        = { select: { name: tipo } };
    if (categoria)   props['Categoria']   = { select: { name: categoria } };
    if (valor)       props['Valor']       = { number: Number(valor) };
    if (data)        props['Data']        = { date: { start: data } };
    if (cliente)     props['Cliente']     = { rich_text: [{ text: { content: String(cliente) } }] };
    if (responsavel) props['Responsavel'] = { rich_text: [{ text: { content: String(responsavel) } }] };
    if (status)      props['Status']      = { select: { name: status || 'Confirmado' } };
    if (notas)       props['Notas']       = { rich_text: [{ text: { content: String(notas) } }] };

    const page = await notion.pages.create({ parent: { database_id: FINANCE_DB }, properties: props });
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    return {
      success: true,
      item: mapTx(page),
      message: `Transação "${nome}" de ${fmt(valor)} (${tipo}) criada`,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function toolListScriptPrompts({ cliente, formato } = {}) {
  const result = {};
  const clients = listDir(PROMPTS_DIR).filter(f => !f.startsWith('.'));
  for (const c of clients) {
    if (cliente && !c.includes(slugify(cliente))) continue;
    const clientPath = path.join(PROMPTS_DIR, c);
    try { if (!fs.statSync(clientPath).isDirectory()) continue; } catch { continue; }
    result[c] = {};
    const formats = listDir(clientPath).filter(f => !f.startsWith('_') && !f.startsWith('.'));
    for (const f of formats) {
      if (formato && !f.includes(slugify(formato))) continue;
      const fmtPath = path.join(clientPath, f);
      try { if (!fs.statSync(fmtPath).isDirectory()) continue; } catch { continue; }
      result[c][f] = listDir(fmtPath).filter(f => f.endsWith('.txt')).map(f => f.replace('.txt', ''));
    }
  }
  return { success: true, available: result };
}

function toolReadScriptPrompt({ cliente, formato, tema }) {
  if (!cliente || !formato) return { success: false, error: 'cliente e formato são obrigatórios' };
  const cSlug = slugify(cliente);
  const fSlug = slugify(formato);
  const tSlug = tema ? slugify(tema) : null;

  const tryPaths = [
    tSlug ? path.join(PROMPTS_DIR, cSlug, fSlug, `${tSlug}.txt`) : null,
    path.join(PROMPTS_DIR, cSlug, fSlug, 'geral.txt'),
    path.join(PROMPTS_DIR, cSlug, '_instrucoes-gerais.txt'),
  ].filter(Boolean);

  for (const filePath of tryPaths) {
    const content = readFileIfExists(filePath);
    if (content) {
      return {
        success: true,
        content,
        path: filePath.replace(PROMPTS_DIR, ''),
        instructions: `Use como guia de estilo e tom para o roteiro. Tema: "${tema || 'geral'}". Não copie literalmente — use como referência.`,
      };
    }
  }
  return {
    success: false,
    error: `Nenhum arquivo de instrução encontrado para "${cSlug}/${fSlug}/${tSlug}"`,
    tip: 'Use list_script_prompts para ver o disponível, ou gere com instruções gerais de qualidade.',
  };
}

// ── Tool router ───────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'list_content':           return toolListContent(args);
    case 'create_content':         return toolCreateContent(args);
    case 'update_content':         return toolUpdateContent(args);
    case 'delete_content':         return toolDeleteContent(args);
    case 'list_tasks':             return toolListTasks(args);
    case 'create_task':            return toolCreateTask(args);
    case 'list_clients':           return toolListClients();
    case 'list_finance':           return toolListFinance(args);
    case 'create_finance_entry':   return toolCreateFinanceEntry(args);
    case 'list_script_prompts':    return toolListScriptPrompts(args);
    case 'read_script_prompt':     return toolReadScriptPrompt(args);
    default: return { success: false, error: `Ferramenta desconhecida: ${name}` };
  }
}

// ── Function declarations for Gemini ─────────────────────────────────────────
const FUNCTION_DECLARATIONS = [
  {
    name: 'list_content',
    description: 'Lista conteúdos da esteira de produção. Use para consultar o que existe antes de editar ou criar.',
    parameters: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Filtrar por nome do cliente (parcial)' },
        estado:  { type: 'string', description: 'Filtrar por estado: Em Produção, Aguardando Aprovação, Aprovado, etc.' },
        mes:     { type: 'string', description: 'Filtrar por mês no formato YYYY-MM' },
      },
    },
  },
  {
    name: 'create_content',
    description: 'Cria um novo conteúdo na esteira de produção.',
    parameters: {
      type: 'object',
      properties: {
        nome:         { type: 'string', description: 'Título do conteúdo (obrigatório)' },
        cliente:      { type: 'string', description: 'Nome do cliente' },
        formato:      { type: 'string', description: 'Carrossel, Stories, Post, Vídeo curto, Estático' },
        plataforma:   { type: 'string', description: 'Instagram, TikTok, YouTube, WhatsApp, Facebook, LinkedIn' },
        responsavel:  { type: 'string', description: 'Matheus ou Sávio' },
        postagem:     { type: 'string', description: 'Data de postagem YYYY-MM-DD' },
        dataGravacao: { type: 'string', description: 'Data de gravação YYYY-MM-DD' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'update_content',
    description: 'Atualiza campos de um conteúdo. Use list_content para obter o ID se necessário.',
    parameters: {
      type: 'object',
      properties: {
        id:              { type: 'string', description: 'ID do conteúdo (obrigatório)' },
        nome:            { type: 'string' },
        cliente:         { type: 'string', description: 'Nome do cliente (atualiza também o ID do Cliente automaticamente)' },
        estado:          { type: 'string', description: 'não iniciado | Em Produção | Aguardando Aprovação | Ajuste Solicitado | Aprovado | Concluido' },
        estadoRoteiro:   { type: 'string' },
        responsavel:     { type: 'string', description: 'Matheus ou Sávio' },
        postagem:        { type: 'string', description: 'YYYY-MM-DD' },
        feedbackCliente: { type: 'string' },
        feedbackRoteiro: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_content',
    description: 'Remove (arquiva) um conteúdo. Só use após confirmação explícita do usuário.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do conteúdo' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista as tarefas da equipe.',
    parameters: {
      type: 'object',
      properties: {
        status:      { type: 'string', description: 'Filtrar por status: Pendente, Em Andamento, Concluído' },
        responsavel: { type: 'string', description: 'Filtrar por responsável: Matheus ou Sávio' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa para a equipe.',
    parameters: {
      type: 'object',
      properties: {
        nome:        { type: 'string',                       description: 'Nome da tarefa (obrigatório)' },
        responsavel: { type: 'array', items: { type: 'string' }, description: 'Responsáveis: Matheus e/ou Sávio' },
        cliente:     { type: 'string',                       description: 'Cliente relacionado' },
        dataEntrega: { type: 'string',                       description: 'Data YYYY-MM-DD' },
        status:      { type: 'string',                       description: 'Pendente ou Em Andamento' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'list_clients',
    description: 'Lista todos os clientes cadastrados no CRM.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_finance',
    description: 'Consulta transações financeiras (receitas e despesas). Retorna resumo com totais.',
    parameters: {
      type: 'object',
      properties: {
        tipo:    { type: 'string', description: 'Receita ou Despesa' },
        cliente: { type: 'string', description: 'Filtrar por cliente' },
        periodo: { type: 'string', description: '30d, 90d, month (mês atual), year (ano atual)' },
      },
    },
  },
  {
    name: 'create_finance_entry',
    description: 'Cria uma transação financeira (receita ou despesa) no módulo financeiro.',
    parameters: {
      type: 'object',
      properties: {
        nome:        { type: 'string', description: 'Descrição da transação (obrigatório)' },
        tipo:        { type: 'string', description: 'Receita ou Despesa' },
        categoria:   { type: 'string', description: 'Projeto, Mensalidade, Salários, Ferramentas, etc.' },
        valor:       { type: 'number', description: 'Valor em reais' },
        data:        { type: 'string', description: 'Data YYYY-MM-DD' },
        cliente:     { type: 'string', description: 'Nome do cliente relacionado' },
        responsavel: { type: 'string', description: 'Responsável pela transação' },
        status:      { type: 'string', description: 'Confirmado, Pendente ou Cancelado' },
        notas:       { type: 'string', description: 'Observações adicionais' },
      },
      required: ['nome', 'tipo', 'valor'],
    },
  },
  {
    name: 'list_script_prompts',
    description: 'Lista arquivos de instrução de roteiro disponíveis por cliente e formato.',
    parameters: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Filtrar por cliente' },
        formato: { type: 'string', description: 'Filtrar por formato' },
      },
    },
  },
  {
    name: 'read_script_prompt',
    description: 'Lê instruções de estilo para gerar roteiros. SEMPRE use antes de gerar qualquer roteiro.',
    parameters: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Nome do cliente (ex: mafro, fastimoveis)' },
        formato: { type: 'string', description: 'Formato (ex: video-curto, carrossel, stories)' },
        tema:    { type: 'string', description: 'Tema do roteiro' },
      },
      required: ['cliente', 'formato'],
    },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `Você é o Assistente Virtual da T3 Studio, agência de marketing digital brasileira.
Você gerencia o CRM interno da equipe com acesso completo à esteira de conteúdo, tarefas, clientes e financeiro.

Data de hoje: ${hoje}

## Suas capacidades
- Consultar, criar, editar e remover conteúdos da esteira de produção
- Consultar e criar tarefas da equipe
- Listar clientes cadastrados
- Consultar e criar transações financeiras (receitas e despesas)
- Gerar roteiros profissionais por cliente, formato e tema

## Contexto operacional
- **Equipe**: Matheus (Criação), Sávio (Produção)
- **Formatos de conteúdo**: Carrossel, Stories, Post, Vídeo curto, Estático
- **Plataformas**: Instagram, TikTok, YouTube, WhatsApp, Facebook, LinkedIn, Pinterest
- **Estados de conteúdo**: não iniciado → Em Produção → Aguardando Aprovação → Ajuste Solicitado → Aprovado → Concluido
- **Categorias financeiras (receita)**: Projeto, Mensalidade, Consultoria, Bônus, Outros
- **Categorias financeiras (despesa)**: Salários, Ferramentas, Marketing, Infraestrutura, Impostos, Freelancer, Outros

## Regras gerais
1. Responda sempre em **português brasileiro**, de forma concisa e profissional
2. Ao executar uma ação com sucesso, confirme brevemente o que foi feito
3. Antes de excluir qualquer item, peça confirmação explícita do usuário
4. Se precisar de um ID, use list_content ou list_tasks para buscá-lo primeiro
5. Se um pedido for ambíguo, busque antes de agir
6. Ao listar itens, use listas organizadas e claras

## Regras para geração de roteiro
7. Quando pedido para gerar roteiro, SEMPRE:
   a) Chame read_script_prompt com cliente, formato e tema identificados
   b) Use o conteúdo como guia de estilo, estrutura e tom
   c) Gere roteiro completo e profissional
   d) Se não encontrar arquivo, use o mais próximo e mencione isso
8. Mapeamento de formatos:
   - "reels", "vídeo curto", "video" → video-curto
   - "carrossel" → carrossel
   - "stories" → stories
   - "post", "feed" → post
9. Estruture o roteiro com marcações: [GANCHO], [DESENVOLVIMENTO], [CTA]

## Regras financeiras
10. Ao consultar financeiro, sempre apresente o resumo (receita, despesa, lucro)
11. Ao criar transação, confirme tipo, valor e data antes de executar se não estiver claro
12. Use list_clients para sugerir clientes disponíveis quando relevante`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Auth check
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'Messages são obrigatórias.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY não configurada. Adicione a variável de ambiente no Vercel.',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      systemInstruction: buildSystemPrompt(),
    });

    // Build conversation history (all except the last user message)
    const history = messages.slice(0, -1).map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || ' ' }],
    }));

    const chat   = model.startChat({ history });
    let result   = await chat.sendMessage(messages[messages.length - 1].content);

    const actions      = [];
    const toolLabels   = []; // human-readable labels for each tool call
    let iterations     = 0;

    // Function-calling loop (max 8 rounds)
    while (iterations < 8) {
      const calls = result.response.functionCalls();
      if (!calls?.length) break;
      iterations++;

      const responseParts = [];
      for (const call of calls) {
        const toolResult = await executeTool(call.name, call.args);
        actions.push({
          type:    call.name,
          args:    call.args,
          success: toolResult.success !== false,
          message: toolResult.message || (toolResult.success === false ? toolResult.error : ''),
        });
        toolLabels.push(call.name);
        responseParts.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }

      result = await chat.sendMessage(responseParts);
    }

    const reply = result.response.text();
    if (!reply) throw new Error('O modelo não retornou resposta.');

    return res.status(200).json({ reply, actions, toolLabels });
  } catch (err) {
    console.error('Assistant error:', err?.message || err);
    const msg = err?.message || 'Falha ao processar mensagem';
    const isModelError = msg.includes('not found') || msg.includes('invalid') || msg.includes('quota');
    return res.status(500).json({
      error: isModelError
        ? `Erro no modelo de IA: ${msg}. Verifique GEMINI_API_KEY e GEMINI_MODEL no Vercel.`
        : msg,
    });
  }
}
