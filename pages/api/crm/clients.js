import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SECTORS_DB = '32df7ecb-bb9b-80a0-af6f-d69061b82a36';
const CONTENT_DB = process.env.NOTION_CONTENT_DB_ID  || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';

// ── Canonical client → portal ID (must match content.js) ─────────────────────
const KNOWN_CLIENT_IDS = {
  't3studio':      '1000',
  'fastimoveis':   '3000',
  'mafro':         '4000',
  'fortfer':       '5000',
  'kalebemartins': '6000',
};

function normalizeKey(name) {
  return (name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function resolveClientId(name) {
  if (!name) return '';
  const key = normalizeKey(name);
  if (KNOWN_CLIENT_IDS[key]) return KNOWN_CLIENT_IDS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
  return String(7000 + (h % 3000));
}

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.map(b => b.plain_text).join('')     || '';
    case 'rich_text':    return prop.rich_text?.map(b => b.plain_text).join('') || '';
    case 'select':       return prop.select?.name                                || '';
    case 'status':       return prop.status?.name                                || '';
    case 'date':         return prop.date?.start                                 || null;
    case 'url':          return prop.url                                         || null;
    case 'created_time': return prop.created_time                                || null;
    default:             return null;
  }
}

// Notion rich_text blocks are limited to 2000 chars each
function toRichText(text) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000)
    chunks.push({ text: { content: text.slice(i, i + 2000) } });
  return chunks;
}

async function queryAll(dbId) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

// ── Auto-create commercial fields in SECTORS_DB on first use ──────────────────
let _comercialReady = false;
async function ensureComercialFields() {
  if (_comercialReady) return;
  try {
    const db = await notion.databases.retrieve({ database_id: SECTORS_DB });
    const existing = Object.keys(db.properties);
    const toCreate = {};
    if (!existing.includes('Contrato'))          toCreate['Contrato']          = { url: {} };
    if (!existing.includes('Contrato Início'))    toCreate['Contrato Início']   = { date: {} };
    if (!existing.includes('Contrato Fim'))       toCreate['Contrato Fim']      = { date: {} };
    if (!existing.includes('Logins'))             toCreate['Logins']            = { rich_text: {} };
    if (!existing.includes('Identidade Visual'))  toCreate['Identidade Visual'] = { rich_text: {} };
    if (!existing.includes('Notas'))              toCreate['Notas']             = { rich_text: {} };
    if (Object.keys(toCreate).length > 0) {
      await notion.databases.update({ database_id: SECTORS_DB, properties: toCreate });
      console.log('✅ Campos comerciais criados no SECTORS_DB:', Object.keys(toCreate).join(', '));
    }
  } catch (e) {
    console.error('ensureComercialFields error:', e?.message);
  }
  _comercialReady = true;
}

export default async function handler(req, res) {
  // ── POST: create new client ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, descricao, paginaCliente, instagram } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    try {
      const properties = {
        'Nome':      { title: [{ text: { content: nome.trim() } }] },
        'categoria': { select: { name: 'cliente' } },
      };
      if (descricao?.trim())      properties['Descrição']         = { rich_text: [{ text: { content: descricao.trim() } }] };
      if (paginaCliente?.trim())  properties['Página do cliente'] = { url: paginaCliente.trim() };
      if (instagram?.trim())      properties['Instagram']         = { rich_text: [{ text: { content: instagram.trim().replace(/^@/, '') } }] };
      const page = await notion.pages.create({ parent: { database_id: SECTORS_DB }, properties });
      return res.status(201).json({ ok: true, id: page.id, nome: nome.trim() });
    } catch (err) {
      console.error('Client POST error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Erro ao criar cliente' });
    }
  }

  // ── PATCH: update client fields ────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const {
      id, logo, instagram,
      contratoLink, contratoInicio, contratoFim,
      logins, identidadeVisual, notas,
    } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    // Auto-create commercial fields on first comercial save
    const hasComercial = [contratoLink, contratoInicio, contratoFim, logins, identidadeVisual, notas]
      .some(v => v !== undefined);
    if (hasComercial) await ensureComercialFields();

    try {
      const properties = {};
      if (logo !== undefined)              properties['logo']             = { url: logo || null };
      if (instagram !== undefined)         properties['Instagram']        = instagram
        ? { rich_text: [{ text: { content: instagram.trim().replace(/^@/, '') } }] }
        : { rich_text: [] };
      if (contratoLink !== undefined)      properties['Contrato']         = { url: contratoLink || null };
      if (contratoInicio !== undefined)    properties['Contrato Início']  = contratoInicio
        ? { date: { start: contratoInicio } } : { date: null };
      if (contratoFim !== undefined)       properties['Contrato Fim']     = contratoFim
        ? { date: { start: contratoFim } } : { date: null };
      if (logins !== undefined)            properties['Logins']           = { rich_text: toRichText(logins) };
      if (identidadeVisual !== undefined)  properties['Identidade Visual']= { rich_text: toRichText(identidadeVisual) };
      if (notas !== undefined)             properties['Notas']            = { rich_text: toRichText(notas) };

      await notion.pages.update({ page_id: id, properties });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Client PATCH error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Erro ao atualizar cliente' });
    }
  }

  // ── DELETE: archive client ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    try {
      await notion.pages.update({ page_id: id, archived: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Client DELETE error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Erro ao excluir' });
    }
  }

  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [sectors, allContent] = await Promise.all([
      queryAll(SECTORS_DB).catch(() => []),
      queryAll(CONTENT_DB),
    ]);

    const normalize = s => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

    const contentByKey = {};
    allContent.forEach(page => {
      const cliente   = getProp(page.properties['Cliente']) || '';
      const idCliente = getProp(page.properties['ID do Cliente']) || '';
      const estado    = getProp(page.properties['Estado']) || '';
      if (!cliente) return;

      const key = normalize(cliente);
      if (!contentByKey[key]) {
        contentByKey[key] = { id: idCliente, total: 0, approved: 0, awaitingApproval: 0, inProduction: 0, done: 0 };
      }
      contentByKey[key].total++;
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (s.includes('aguardando'))                              contentByKey[key].awaitingApproval++;
      else if (s === 'aprovado')                                 contentByKey[key].approved++;
      else if (s.includes('producao'))                          contentByKey[key].inProduction++;
      else if (s === 'concluido')                               contentByKey[key].done++;
    });

    const canonicalMap = {};

    sectors.forEach(p => {
      const nome = getProp(p.properties['Nome']) || '';
      if (!nome) return;
      const key = normalize(nome);
      if (!canonicalMap[key]) canonicalMap[key] = { nome, sectorPage: p };
    });

    Object.keys(contentByKey).forEach(key => {
      if (!canonicalMap[key]) {
        const original = allContent.find(page => {
          const c = getProp(page.properties['Cliente']) || '';
          return normalize(c) === key;
        });
        const rawName = getProp(original?.properties['Cliente']) || key;
        canonicalMap[key] = { nome: rawName, sectorPage: null };
      }
    });

    const clients = Object.entries(canonicalMap).map(([key, { nome, sectorPage: sp }]) => {
      const stats = contentByKey[key] || { total: 0, approved: 0, awaitingApproval: 0, inProduction: 0, done: 0, id: '' };
      return {
        id:               sp?.id || nome,
        nome,
        logo:             sp ? (getProp(sp.properties['logo'])               || null) : null,
        instagram:        sp ? (getProp(sp.properties['Instagram'])           || '')   : '',
        categoria:        sp ? (getProp(sp.properties['categoria'])           || '')   : '',
        descricao:        sp ? (getProp(sp.properties['Descrição'])           || '')   : '',
        paginaCliente:    sp ? (getProp(sp.properties['Página do cliente'])   || '')   : '',
        contratoLink:     sp ? (getProp(sp.properties['Contrato'])            || '')   : '',
        contratoInicio:   sp ? (getProp(sp.properties['Contrato Início'])     || '')   : '',
        contratoFim:      sp ? (getProp(sp.properties['Contrato Fim'])        || '')   : '',
        logins:           sp ? (getProp(sp.properties['Logins'])              || '')   : '',
        identidadeVisual: sp ? (getProp(sp.properties['Identidade Visual'])   || '')   : '',
        notas:            sp ? (getProp(sp.properties['Notas'])               || '')   : '',
        idCliente:        stats.id || resolveClientId(nome),
        totalContent:     stats.total,
        approved:         stats.approved,
        awaitingApproval: stats.awaitingApproval,
        inProduction:     stats.inProduction,
        done:             stats.done,
        portalUrl:        `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?id=${stats.id || resolveClientId(nome)}`,
      };
    });

    return res.status(200).json({ clients: clients.sort((a,b) => b.totalContent - a.totalContent) });
  } catch (err) {
    console.error('Clients error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch clients' });
  }
}
