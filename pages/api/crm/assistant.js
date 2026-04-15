import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@notionhq/client';

export const config = { maxDuration: 30 };

const notion    = new Client({ auth: process.env.NOTION_TOKEN });
const CONTENT_DB = process.env.NOTION_CONTENT_DB_ID || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';
const TASKS_DB   = process.env.NOTION_TASKS_DB_ID   || '343f7ecb-bb9b-802c-b08a-daf9cff75672';

// ── Notion helpers ────────────────────────────────────────────────────────────
function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || '';
    case 'select':       return prop.select?.name || '';
    case 'multi_select': return prop.multi_select?.map(s => s.name) || [];
    case 'status':       return prop.status?.name || '';
    case 'date':         return prop.date?.start || null;
    default:             return null;
  }
}

function mapContent(p) {
  const pr = p.properties;
  return {
    id:            p.id,
    nome:          getProp(pr['Nome'])            || 'Sem título',
    cliente:       getProp(pr['Cliente'])          || '',
    formato:       getProp(pr['Formato'])          || '',
    responsavel:   getProp(pr['responsável'])      || '',
    estado:        getProp(pr['Estado'])           || '',
    estadoRoteiro: getProp(pr['EstadoRoteiro'])    || '',
    postagem:      getProp(pr['Postagem'])         || null,
    dataGravacao:  getProp(pr['Data de Gravação']) || null,
    roteiro:       getProp(pr['Roteiro'])          || '',
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

// ── Tool implementations ──────────────────────────────────────────────────────
async function toolListContent({ cliente, mes } = {}) {
  try {
    const res = await notion.databases.query({
      database_id: CONTENT_DB,
      sorts: [{ property: 'Postagem', direction: 'ascending' }],
      page_size: 50,
    });
    let items = res.results.map(mapContent);
    if (cliente) items = items.filter(i => i.cliente.toLowerCase().includes(cliente.toLowerCase()));
    if (mes)     items = items.filter(i => (i.postagem||'').includes(mes) || (i.dataGravacao||'').includes(mes));
    return { success: true, count: items.length, items: items.slice(0, 25) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolCreateContent({ nome, cliente, formato, responsavel, postagem, dataGravacao }) {
  try {
    const props = { 'Nome': { title: [{ text: { content: nome } }] } };
    if (cliente)       props['Cliente']          = { select: { name: cliente } };
    if (formato)       props['Formato']          = { select: { name: formato } };
    if (responsavel)   props['responsável']      = { select: { name: responsavel } };
    if (postagem)      props['Postagem']         = { date: { start: postagem } };
    if (dataGravacao)  props['Data de Gravação'] = { date: { start: dataGravacao } };
    const page = await notion.pages.create({ parent: { database_id: CONTENT_DB }, properties: props });
    return { success: true, item: mapContent(page), message: `Conteúdo "${nome}" criado` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toolUpdateContent({ id, nome, estado, estadoRoteiro, responsavel, roteiro, postagem, feedbackCliente, feedbackRoteiro }) {
  try {
    const props = {};
    if (nome)                  props['Nome']                = { title: [{ text: { content: nome } }] };
    if (estado)                props['Estado']              = { select: { name: estado } };
    if (estadoRoteiro)         props['EstadoRoteiro']       = { status: { name: estadoRoteiro } };
    if (responsavel)           props['responsável']         = { select: { name: responsavel } };
    if (roteiro !== undefined) props['Roteiro']             = { rich_text: [{ text: { content: roteiro } }] };
    if (postagem)              props['Postagem']            = { date: { start: postagem } };
    if (feedbackCliente)       props['Feedback do Cliente'] = { rich_text: [{ text: { content: feedbackCliente } }] };
    if (feedbackRoteiro)       props['Feedback do Roteiro'] = { rich_text: [{ text: { content: feedbackRoteiro } }] };
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

async function toolListTasks({ status } = {}) {
  try {
    const res = await notion.databases.query({
      database_id: TASKS_DB,
      sorts: [{ property: 'Data de entrega', direction: 'ascending' }],
      page_size: 30,
    });
    let items = res.results.map(mapTask);
    if (status) items = items.filter(i => i.status.toLowerCase().includes(status.toLowerCase()));
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
    if (status)      props['Status']          = { select: { name: status } };
    const page = await notion.pages.create({ parent: { database_id: TASKS_DB }, properties: props });
    return { success: true, item: mapTask(page), message: `Tarefa "${nome}" criada` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function executeTool(name, args) {
  switch (name) {
    case 'list_content':   return toolListContent(args);
    case 'create_content': return toolCreateContent(args);
    case 'update_content': return toolUpdateContent(args);
    case 'delete_content': return toolDeleteContent(args);
    case 'list_tasks':     return toolListTasks(args);
    case 'create_task':    return toolCreateTask(args);
    default: return { success: false, error: `Ferramenta desconhecida: ${name}` };
  }
}

// ── Function declarations ─────────────────────────────────────────────────────
const FUNCTION_DECLARATIONS = [
  {
    name: 'list_content',
    description: 'Lista conteúdos da esteira de produção. Use para consultar o que existe antes de editar ou remover.',
    parameters: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Filtrar por cliente: fastimoveis ou mafro (opcional)' },
        mes:     { type: 'string', description: 'Filtrar por mês no formato YYYY-MM (opcional)' },
      },
    },
  },
  {
    name: 'create_content',
    description: 'Cria um novo conteúdo na esteira.',
    parameters: {
      type: 'object',
      properties: {
        nome:         { type: 'string', description: 'Nome do conteúdo (obrigatório)' },
        cliente:      { type: 'string', description: 'fastimoveis ou mafro' },
        formato:      { type: 'string', description: 'Reels, Carrossel, Stories, Post, Vídeo, TikTok, YouTube' },
        responsavel:  { type: 'string', description: 'Matheus ou Sávio' },
        postagem:     { type: 'string', description: 'Data de postagem YYYY-MM-DD' },
        dataGravacao: { type: 'string', description: 'Data de gravação YYYY-MM-DD' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'update_content',
    description: 'Atualiza campos de um conteúdo existente. Precisa do ID — use list_content para buscá-lo se necessário.',
    parameters: {
      type: 'object',
      properties: {
        id:              { type: 'string', description: 'ID do conteúdo (obrigatório)' },
        nome:            { type: 'string' },
        estado:          { type: 'string', description: 'não iniciado | Em Produção | Aguardando Aprovação | Ajuste Solicitado | Aprovado | Concluido' },
        estadoRoteiro:   { type: 'string', description: 'Não iniciada | Em Produção | Aguardando Aprovação | Ajuste Solicitado | Aprovado | Concluido' },
        responsavel:     { type: 'string', description: 'Matheus ou Sávio' },
        roteiro:         { type: 'string', description: 'Texto do roteiro' },
        postagem:        { type: 'string', description: 'Data de postagem YYYY-MM-DD' },
        feedbackCliente: { type: 'string' },
        feedbackRoteiro: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_content',
    description: 'Remove (arquiva) um conteúdo. Use só após confirmação explícita do usuário.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do conteúdo a remover' },
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
        status: { type: 'string', description: 'Filtrar por status: Pendente, Em Andamento, Concluído (opcional)' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa para a equipe.',
    parameters: {
      type: 'object',
      properties: {
        nome:        { type: 'string',  description: 'Nome da tarefa (obrigatório)' },
        responsavel: { type: 'array',   items: { type: 'string' }, description: 'Responsáveis: Matheus e/ou Sávio' },
        cliente:     { type: 'string',  description: 'Cliente relacionado' },
        dataEntrega: { type: 'string',  description: 'Data de entrega YYYY-MM-DD' },
        status:      { type: 'string',  description: 'Status inicial: Pendente ou Em Andamento' },
      },
      required: ['nome'],
    },
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'Messages são obrigatórias' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no ambiente' });

  const systemPrompt = `Você é o Assistente Virtual da T3 Studio, uma agência de marketing digital brasileira. Você gerencia a plataforma de CRM interna da equipe.

Suas capacidades:
- Consultar, criar, editar e remover conteúdos da esteira de produção
- Consultar e criar tarefas para a equipe
- Responder perguntas sobre o estado atual dos projetos

Contexto:
- Membros da equipe: Matheus, Sávio
- Clientes: fastimoveis, mafro
- Formatos de conteúdo: Reels, Carrossel, Stories, Post, Vídeo, TikTok, YouTube
- Estados de conteúdo: não iniciado, Em Produção, Aguardando Aprovação, Ajuste Solicitado, Aprovado, Concluido
- Estados de roteiro: Não iniciada, Em Produção, Aguardando Aprovação, Ajuste Solicitado, Aprovado, Concluido

Regras:
1. Responda sempre em português brasileiro, de forma concisa e profissional
2. Quando executar uma ação com sucesso, confirme brevemente
3. Antes de excluir qualquer conteúdo, peça confirmação explícita
4. Se precisar do ID de um item, use list_content ou list_tasks para encontrá-lo
5. Se um pedido for ambíguo (ex: "atualize o vídeo do mafro"), busque primeiro para saber qual item
6. Ao listar itens, seja organizado e legível

Data atual: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      systemInstruction: systemPrompt,
    });

    // Build history (everything except the last user message)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat  = model.startChat({ history });
    let result  = await chat.sendMessage(messages[messages.length - 1].content);

    const actions = [];
    let iterations = 0;

    // Function-calling loop (max 6 rounds)
    while (iterations < 6) {
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
        responseParts.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }

      result = await chat.sendMessage(responseParts);
    }

    return res.status(200).json({ reply: result.response.text(), actions });
  } catch (err) {
    console.error('Assistant error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Falha ao processar mensagem' });
  }
}
