import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ── Auto-create DB se não existir ─────────────────────────────────────────────
// A integração cria o banco ela mesma → acesso automático garantido
let _cachedDbId = process.env.NOTION_IDEAS_DB_ID || null;

async function getOrCreateDB() {
  // 1. Tentar ID do env var
  if (_cachedDbId) {
    try {
      await notion.databases.retrieve({ database_id: _cachedDbId });
      return _cachedDbId;
    } catch { _cachedDbId = null; } // sem acesso — vai criar um novo
  }

  // 2. Buscar DB existente com o nome certo acessível pela integração
  try {
    const search = await notion.search({
      query: 'Quadro de Ideias',
      filter: { value: 'database', property: 'object' },
      page_size: 5,
    });
    const found = search.results.find(r =>
      r.object === 'database' &&
      (r.title?.[0]?.plain_text || '').trim() === 'Quadro de Ideias'
    );
    if (found) { _cachedDbId = found.id; return _cachedDbId; }
  } catch {}

  // 3. Criar novo banco usando a integração (terá acesso automático)
  // Precisamos de uma página pai acessível pela integração
  const parentSearch = await notion.search({
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  });
  if (!parentSearch.results.length) {
    throw new Error(
      'A integração não tem acesso a nenhuma página no Notion. ' +
      'Compartilhe ao menos uma página com a integração "App T3 Studio".'
    );
  }
  const parentId = parentSearch.results[0].id;

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentId },
    title: [{ type: 'text', text: { content: 'Quadro de Ideias' } }],
    properties: {
      'Nome':       { title: {} },
      'Cliente':    { select: { options: [
        { name: 'T3 Studio',      color: 'blue'   },
        { name: 'Fast Imóveis',   color: 'green'  },
        { name: 'Mafro',          color: 'orange' },
        { name: 'Fortfer',        color: 'red'    },
        { name: 'Kalebe Martins', color: 'purple' },
      ]}},
      'Formato':    { select: { options: [
        { name: 'Reels',       color: 'blue'   },
        { name: 'Stories',     color: 'orange' },
        { name: 'Post',        color: 'green'  },
        { name: 'Carrossel',   color: 'purple' },
        { name: 'Vídeo Curto', color: 'red'    },
        { name: 'YouTube',     color: 'red'    },
        { name: 'TikTok',      color: 'pink'   },
        { name: 'Pinterest',   color: 'red'    },
        { name: 'Outro',       color: 'gray'   },
      ]}},
      'Link':       { url: {} },
      'Comentário': { rich_text: {} },
    },
  });

  _cachedDbId = db.id;
  console.log('✅ Quadro de Ideias DB criado pela integração. ID:', db.id);
  return _cachedDbId;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

async function queryAll(dbId) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { cliente, formato } = req.query;
    try {
      const dbId = await getOrCreateDB();
      let pages = await queryAll(dbId);
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
      const dbId = await getOrCreateDB();
      const properties = {
        'Nome': { title: [{ text: { content: nome.trim() } }] },
      };
      if (cliente)      properties['Cliente']    = { select: { name: cliente } };
      if (formato)      properties['Formato']    = { select: { name: formato } };
      if (link?.trim()) properties['Link']       = { url: link.trim() };
      if (comentario)   properties['Comentário'] = { rich_text: [{ text: { content: comentario } }] };

      const page = await notion.pages.create({ parent: { database_id: dbId }, properties });
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
