import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const TASKS_DB    = process.env.NOTION_TASKS_DB_ID    || '343f7ecb-bb9b-802c-b08a-daf9cff75672';
const CONTENT_DB  = process.env.NOTION_CONTENT_DB_ID  || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';
const SECTORS_DB  = process.env.NOTION_SECTORS_DB_ID  || '32df7ecb-bb9b-80f2-9f75-d82bda1944fc';

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':       return prop.title?.[0]?.plain_text || '';
    case 'rich_text':   return prop.rich_text?.[0]?.plain_text || '';
    case 'select':      return prop.select?.name || '';
    case 'multi_select':return prop.multi_select?.map(s => s.name).join(', ') || '';
    case 'status':      return prop.status?.name || '';
    case 'date':        return prop.date?.start || null;
    default:            return null;
  }
}

async function queryAll(dbId, filter) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      ...(filter ? { filter } : {}),
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [tasks, content, sectors] = await Promise.all([
      queryAll(TASKS_DB),
      queryAll(CONTENT_DB),
      queryAll(SECTORS_DB).catch(() => []),
    ]);

    // Tasks stats
    const pendingTasks   = tasks.filter(p => getProp(p.properties['Status']) === 'Pendente').length;
    const doneTasks      = tasks.filter(p => getProp(p.properties['Status']) === 'Concluído').length;
    const totalTasks     = tasks.length;

    // Overdue tasks (deadline in past, still pending)
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdueTasks = tasks.filter(p => {
      const status = getProp(p.properties['Status']);
      const due    = getProp(p.properties['Data de entrega']);
      if (status === 'Concluído' || !due) return false;
      return new Date(due) < today;
    }).length;

    // Content stats
    const awaitingApproval = content.filter(p => {
      const estado = getProp(p.properties['Estado']) || '';
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return s.includes('aguardando');
    }).length;

    const awaitingScript = content.filter(p => {
      const estado = getProp(p.properties['EstadoRoteiro']) || '';
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return s.includes('aguardando');
    }).length;

    const approved = content.filter(p => {
      const estado = getProp(p.properties['Estado']) || '';
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return s === 'aprovado';
    }).length;

    const inProduction = content.filter(p => {
      const estado = getProp(p.properties['Estado']) || '';
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return s.includes('producao') || s.includes('produção');
    }).length;

    const totalContent = content.length;

    // Client stats
    const clientSet = new Set();
    content.forEach(p => {
      const c = getProp(p.properties['Cliente']);
      if (c) clientSet.add(c);
    });
    const totalClients = clientSet.size || sectors.length;

    // Content this month
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const thisMonthContent = content.filter(p => {
      const postagem = getProp(p.properties['Postagem']);
      if (!postagem) return false;
      return postagem.startsWith(thisMonth);
    }).length;

    return res.status(200).json({
      tasks:   { pending: pendingTasks, done: doneTasks, total: totalTasks, overdue: overdueTasks },
      content: { awaitingApproval, awaitingScript, approved, inProduction, total: totalContent, thisMonth: thisMonthContent },
      clients: { total: totalClients },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch stats' });
  }
}
