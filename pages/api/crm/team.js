/**
 * /api/crm/team
 * Returns public team member data (no passwords) for any authenticated user.
 */
import { Client } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const USERS_DB = process.env.NOTION_USERS_DB_ID;

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'select':    return prop.select?.name               || '';
    case 'checkbox':  return prop.checkbox ?? false;
    case 'url':       return prop.url                        || null;
    default:          return null;
  }
}

function mapMember(page) {
  return {
    id:    page.id,
    nome:  getProp(page.properties['Nome'])  || '',
    email: getProp(page.properties['Email']) || '',
    cargo: getProp(page.properties['Cargo']) || 'participante',
    ativo: getProp(page.properties['Ativo']) ?? true,
    foto:  getProp(page.properties['Foto'])  || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  if (!USERS_DB) {
    return res.status(503).json({ error: 'NOTION_USERS_DB_ID não configurado.' });
  }

  try {
    const pages = [];
    let cursor;
    do {
      const r = await notion.databases.query({
        database_id: USERS_DB,
        filter: { property: 'Ativo', checkbox: { equals: true } },
        ...(cursor ? { start_cursor: cursor } : {}),
        page_size: 100,
      });
      pages.push(...r.results);
      cursor = r.has_more ? r.next_cursor : null;
    } while (cursor);

    return res.status(200).json({ members: pages.map(mapMember) });
  } catch (err) {
    console.error('Team GET error:', err);
    return res.status(500).json({ error: 'Erro ao buscar equipe.' });
  }
}
