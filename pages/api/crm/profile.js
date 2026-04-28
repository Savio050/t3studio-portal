/**
 * /api/crm/profile
 * Any authenticated user can GET their own profile and PATCH their foto.
 * Does not expose password hashes.
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

function mapProfile(page) {
  return {
    id:    page.id,
    nome:  getProp(page.properties['Nome'])  || '',
    email: getProp(page.properties['Email']) || '',
    cargo: (getProp(page.properties['Cargo']) || 'participante').toLowerCase(),
    ativo: page.properties['ativo']?.checkbox !== false,
    foto:  getProp(page.properties['foto'])  || null,
  };
}

// Notion page IDs are 32 hex chars (UUID). Anything else (email, "legacy-X") is invalid.
function isValidNotionId(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id);
}

// Find a user's Notion page by email (fallback when we don't have a valid page ID)
async function findNotionPageByEmail(email) {
  if (!USERS_DB || !email) return null;
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', rich_text: { equals: email.toLowerCase().trim() } },
    });
    return res.results[0]?.id || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  // Resolve a valid Notion page ID: prefer token.notionId (UUID), else look up by email
  async function resolvePageId() {
    if (isValidNotionId(token.notionId)) return token.notionId;
    return await findNotionPageByEmail(token.email);
  }

  // ── GET: return own profile ───────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!USERS_DB) {
      // Fall back to session data if no Notion DB configured
      return res.status(200).json({
        profile: { id: token.id, nome: token.name, email: token.email, cargo: token.role, foto: null },
      });
    }
    try {
      const pageId = await resolvePageId();
      if (!pageId) {
        // No Notion page found — return session data without foto
        return res.status(200).json({
          profile: { id: token.id, nome: token.name, email: token.email, cargo: token.role, foto: null },
        });
      }
      const page = await notion.pages.retrieve({ page_id: pageId });
      return res.status(200).json({ profile: mapProfile(page) });
    } catch (err) {
      console.error('Profile GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
  }

  // ── PATCH: update own foto ────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { foto } = req.body || {};
    if (!USERS_DB) return res.status(503).json({ error: 'NOTION_USERS_DB_ID não configurado.' });

    try {
      const pageId = await resolvePageId();
      if (!pageId) return res.status(404).json({ error: 'Perfil não encontrado no Notion.' });

      const properties = {};
      if (foto !== undefined) {
        properties['foto'] = { url: foto || null };
      }
      const page = await notion.pages.update({ page_id: pageId, properties });
      return res.status(200).json({ profile: mapProfile(page) });
    } catch (err) {
      console.error('Profile PATCH error:', err);
      return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
  }

  return res.status(405).end();
}
