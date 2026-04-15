import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TASKS_DB = process.env.NOTION_TASKS_DB_ID || '343f7ecb-bb9b-802c-b08a-daf9cff75672';

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || '';
    case 'select':       return prop.select?.name || '';
    case 'multi_select': return prop.multi_select?.map(s => s.name) || [];
    case 'status':       return prop.status?.name || '';
    case 'date':         return prop.date?.start || null;
    case 'created_time': return prop.created_time || null;
    default:             return null;
  }
}

async function queryAll(dbId) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'Data de entrega', direction: 'ascending' }],
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

function mapTask(page) {
  const p = page.properties;
  return {
    id:           page.id,
    nome:         getProp(p['Nome']) || 'Sem título',
    status:       getProp(p['Status']) || 'Pendente',
    responsavel:  getProp(p['Responsável']) || [],
    dataEntrega:  getProp(p['Data de entrega']),
    cliente:      getProp(p['cliente']) || '',
    criadoEm:     getProp(p['Criado em']) || page.created_time,
  };
}

export default async function handler(req, res) {
  // ── GET: fetch all tasks ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const pages = await queryAll(TASKS_DB);
      return res.status(200).json({ tasks: pages.map(mapTask) });
    } catch (err) {
      console.error('Tasks GET error:', err);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  // ── POST: create a new task ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, status = 'Pendente', responsavel = [], dataEntrega, cliente } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    try {
      const properties = {
        Nome:   { title: [{ text: { content: nome.trim() } }] },
        Status: { status: { name: status } },
      };
      if (responsavel?.length)
        properties['Responsável'] = { multi_select: responsavel.map(r => ({ name: r })) };
      if (dataEntrega)
        properties['Data de entrega'] = { date: { start: dataEntrega } };
      if (cliente)
        properties['cliente'] = { select: { name: cliente } };

      const page = await notion.pages.create({ parent: { database_id: TASKS_DB }, properties });
      return res.status(201).json({ task: mapTask(page) });
    } catch (err) {
      console.error('Tasks POST error:', err);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  // ── PATCH: update a task ──────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, responsavel, dataEntrega, cliente, nome } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

    try {
      const properties = {};
      if (status)      properties['Status'] = { status: { name: status } };
      if (nome)        properties['Nome']   = { title: [{ text: { content: nome } }] };
      if (responsavel) properties['Responsável'] = { multi_select: responsavel.map(r => ({ name: r })) };
      if (dataEntrega) properties['Data de entrega'] = { date: { start: dataEntrega } };
      if (cliente)     properties['cliente'] = { select: { name: cliente } };

      const page = await notion.pages.update({ page_id: id, properties });
      return res.status(200).json({ task: mapTask(page) });
    } catch (err) {
      console.error('Tasks PATCH error:', err);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }

  return res.status(405).end();
}
