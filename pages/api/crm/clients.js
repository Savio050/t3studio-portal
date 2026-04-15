import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SECTORS_DB = process.env.NOTION_SECTORS_DB_ID  || '32df7ecb-bb9b-80f2-9f75-d82bda1944fc';
const CONTENT_DB = process.env.NOTION_CONTENT_DB_ID  || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'select':    return prop.select?.name               || '';
    case 'status':    return prop.status?.name               || '';
    case 'date':      return prop.date?.start                || null;
    default:          return null;
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
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [sectors, allContent] = await Promise.all([
      queryAll(SECTORS_DB),
      queryAll(CONTENT_DB),
    ]);

    // Build content stats per client
    const contentByClient = {};
    allContent.forEach(page => {
      const cliente = getProp(page.properties['Cliente']) || '';
      const idCliente = getProp(page.properties['ID do Cliente']) || '';
      const estado  = getProp(page.properties['Estado']) || '';
      if (!cliente) return;
      if (!contentByClient[cliente]) {
        contentByClient[cliente] = {
          id: idCliente,
          total: 0,
          approved: 0,
          awaitingApproval: 0,
          inProduction: 0,
          done: 0,
        };
      }
      contentByClient[cliente].total++;
      const s = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (s.includes('aguardando'))     contentByClient[cliente].awaitingApproval++;
      else if (s === 'aprovado')        contentByClient[cliente].approved++;
      else if (s.includes('producao') || s.includes('produção')) contentByClient[cliente].inProduction++;
      else if (s === 'concluido' || s === 'concluído') contentByClient[cliente].done++;
    });

    // Also collect clients that appear in content but not in sectors
    const allClientNames = new Set([
      ...sectors.map(p => getProp(p.properties['Nome']) || '').filter(Boolean),
      ...Object.keys(contentByClient),
    ]);

    const clients = Array.from(allClientNames).map(nome => {
      const sectorPage = sectors.find(p => (getProp(p.properties['Nome']) || '').toLowerCase() === nome.toLowerCase());
      const stats = contentByClient[nome] || contentByClient[nome.toLowerCase()] || { total: 0, approved: 0, awaitingApproval: 0, inProduction: 0, done: 0, id: '' };

      return {
        id:               sectorPage?.id || nome,
        nome,
        categoria:        sectorPage ? (getProp(sectorPage.properties['categoria']) || '') : '',
        idCliente:        stats.id || '',
        totalContent:     stats.total,
        approved:         stats.approved,
        awaitingApproval: stats.awaitingApproval,
        inProduction:     stats.inProduction,
        done:             stats.done,
        portalUrl:        stats.id ? `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?id=${stats.id}` : '',
      };
    });

    return res.status(200).json({ clients: clients.sort((a,b) => b.totalContent - a.totalContent) });
  } catch (err) {
    console.error('Clients error:', err);
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
}
