import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SECTORS_DB = process.env.NOTION_SECTORS_DB_ID  || '32df7ecb-bb9b-80a0-af6f-d69061b82a36';
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
    case 'title':        return prop.title?.[0]?.plain_text     || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || '';
    case 'select':       return prop.select?.name               || '';
    case 'status':       return prop.status?.name               || '';
    case 'date':         return prop.date?.start                || null;
    case 'url':          return prop.url                        || null;
    case 'created_time': return prop.created_time               || null;
    default:             return null;
  }
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

export default async function handler(req, res) {
  // ── POST: create new client ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, descricao, paginaCliente } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    try {
      const properties = {
        'Nome':      { title: [{ text: { content: nome.trim() } }] },
        'categoria': { select: { name: 'cliente' } },
      };
      if (descricao?.trim())      properties['Descrição']         = { rich_text: [{ text: { content: descricao.trim() } }] };
      if (paginaCliente?.trim())  properties['Página do cliente'] = { url: paginaCliente.trim() };
      const page = await notion.pages.create({ parent: { database_id: SECTORS_DB }, properties });
      return res.status(201).json({ ok: true, id: page.id, nome: nome.trim() });
    } catch (err) {
      console.error('Client POST error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Erro ao criar cliente' });
    }
  }

  // ── PATCH: update client logo URL ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, logo } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
    try {
      await notion.pages.update({
        page_id: id,
        properties: { 'logo': { url: logo || null } },
      });
      return res.status(200).json({ ok: true, logo: logo || null });
    } catch (err) {
      console.error('Client PATCH error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Erro ao atualizar logo' });
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
    // SECTORS_DB is optional — fall back gracefully if it's unavailable
    const [sectors, allContent] = await Promise.all([
      queryAll(SECTORS_DB).catch(() => []),
      queryAll(CONTENT_DB),
    ]);

    // Normalize helper: lowercase + remove accents + remove spaces → used as dedup key
    const normalize = s => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

    // Build content stats keyed by NORMALIZED client name
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
      if (s.includes('aguardando'))                                    contentByKey[key].awaitingApproval++;
      else if (s === 'aprovado')                                       contentByKey[key].approved++;
      else if (s.includes('producao') || s.includes('producao'))       contentByKey[key].inProduction++;
      else if (s === 'concluido' || s === 'concluido')                 contentByKey[key].done++;
    });

    // Build canonical client map keyed by normalized name.
    // Sectors DB entries are authoritative — their name wins over content's client field.
    const canonicalMap = {}; // key → { nome, sectorPage }

    sectors.forEach(p => {
      const nome = getProp(p.properties['Nome']) || '';
      if (!nome) return;
      const key = normalize(nome);
      // Sectors DB may itself have duplicates — keep only the first occurrence
      if (!canonicalMap[key]) canonicalMap[key] = { nome, sectorPage: p };
    });

    // Add any client names from content that don't already have a sectors record
    Object.keys(contentByKey).forEach(key => {
      if (!canonicalMap[key]) {
        // Recover original display name from content (use first occurrence)
        const original = allContent.find(page => {
          const c = getProp(page.properties['Cliente']) || '';
          return normalize(c) === key;
        });
        const rawName = getProp(original?.properties['Cliente']) || key;
        canonicalMap[key] = { nome: rawName, sectorPage: null };
      }
    });

    const clients = Object.entries(canonicalMap).map(([key, { nome, sectorPage }]) => {
      const stats = contentByKey[key] || { total: 0, approved: 0, awaitingApproval: 0, inProduction: 0, done: 0, id: '' };
      return {
        id:               sectorPage?.id || nome,
        nome,
        logo:             sectorPage ? (getProp(sectorPage.properties['logo']) || null) : null,
        categoria:        sectorPage ? (getProp(sectorPage.properties['categoria']) || '') : '',
        descricao:        sectorPage ? (getProp(sectorPage.properties['Descrição']) || '') : '',
        paginaCliente:    sectorPage ? (getProp(sectorPage.properties['Página do cliente']) || '') : '',
        // Canonical map wins: if Notion content doesn't have the ID yet, resolve it
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
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
}
