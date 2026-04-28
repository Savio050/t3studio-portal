/**
 * /api/crm/team
 * Returns public team member data (no passwords) for any authenticated user.
 * Falls back to AUTH_USERS env var when Notion DB is not configured or empty.
 */
import { Client } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId } from '../../../lib/notionId';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const USERS_DB = sanitizeNotionId(process.env.NOTION_USERS_DB_ID);

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'email':     return prop.email                       || '';
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
    cargo: (getProp(page.properties['Cargo']) || 'participante').toLowerCase(),
    // treat unchecked/missing ativo as active (default true)
    ativo: page.properties['ativo']?.checkbox !== false,
    foto:  getProp(page.properties['foto'])  || null,
  };
}

// Legacy users from AUTH_USERS env var
function getLegacyMembers() {
  try {
    const raw = JSON.parse(process.env.AUTH_USERS || '[]');
    return raw.map((u, i) => ({
      id:    `legacy-${i}`,
      nome:  u.name  || u.nome  || '',
      email: u.email || '',
      cargo: (u.role || u.cargo || 'administrador').toLowerCase(),
      ativo: u.ativo !== false,
      foto:  u.foto  || null,
    })).filter(u => u.ativo);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  // No Notion DB → fall back to AUTH_USERS
  if (!USERS_DB) {
    const members = getLegacyMembers();
    return res.status(200).json({ members });
  }

  try {
    // Query all pages (no server-side filter — filter Ativo in JS to avoid
    // errors if the property is missing or unchecked by default)
    const pages = [];
    let cursor;
    do {
      const r = await notion.databases.query({
        database_id: USERS_DB,
        ...(cursor ? { start_cursor: cursor } : {}),
        page_size: 100,
      });
      pages.push(...r.results);
      cursor = r.has_more ? r.next_cursor : null;
    } while (cursor);

    let members = pages.map(mapMember).filter(m => m.ativo);

    // If Notion DB is empty, merge in AUTH_USERS as fallback
    if (members.length === 0) {
      members = getLegacyMembers();
    }

    return res.status(200).json({ members });
  } catch (err) {
    console.error('Team GET error:', err);
    // On any Notion failure, fall back to legacy users instead of hard error
    const members = getLegacyMembers();
    if (members.length > 0) {
      return res.status(200).json({ members });
    }
    return res.status(500).json({ error: 'Erro ao buscar equipe.' });
  }
}
