import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const IDEAS_DB = process.env.NOTION_IDEAS_DB_ID || '1958cc6e-935c-4edd-84bf-02b5651a7b2e';

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.map(b => b.plain_text).join('') || '';
    case 'rich_text': return prop.rich_text?.map(b => b.plain_text).join('') || '';
    case 'select':    return prop.select?.name || '';
    case 'url':       return prop.url || null;
    default:          return null;
  }
}

function mapIdea(page) {
  const p = page.properties;
  return {
    id:          page.id,
    nome:        getProp(p['Nome'])        || 'Sem título',
    cliente:     getProp(p['Cliente'])     || '',
    formato:     getProp(p['Formato'])     || '',
    link:        getProp(p['Link'])        || null,
    comentario:  getProp(p['Comentário'])  || '',
    createdTime: page.created_time         || null,
  };
}

async function queryAll() {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: IDEAS_DB,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

export default async function handler(req, res) {
  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { cliente, formato } = req.query;
    try {
      let pages = await queryAll();
      if (cliente) pages = pages.filter(p =>
        (getProp(p.properties['Cliente']) || '').toLowerCase() === cliente.toLowerCase());
      if (formato) pages = pages.filter(p =>
        (getProp(p.properties['Formato']) || '').toLowerCase() === formato.toLowerCase());
      return res.status(200).json({ ideas: pages.map(mapIdea) });
    } catch (err) {
      console.error('Ideas GET error:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao buscar ideias' });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, cliente, formato, link, comentario } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: 'Título é obrigatório' });
    try {
      const properties = {
        'Nome': { title: [{ text: { content: nome.trim() } }] },
      };
      if (cliente)    properties['Cliente']    = { select: { name: cliente } };
      if (formato)    properties['Formato']    = { select: { name: formato } };
      if (link?.trim()) properties['Link']     = { url: link.trim() };
      if (comentario) properties['Comentário'] = { rich_text: [{ text: { content: comentario } }] };

      const page = await notion.pages.create({
        parent: { database_id: IDEAS_DB },
        properties,
      });
      return res.status(201).json({ idea: mapIdea(page) });
    } catch (err) {
      console.error('Ideas POST error:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao criar ideia' });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    try {
      await notion.pages.update({ page_id: id, archived: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Ideas DELETE error:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao excluir ideia' });
    }
  }

  return res.status(405).end();
}
