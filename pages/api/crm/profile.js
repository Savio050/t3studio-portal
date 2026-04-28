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
    cargo: getProp(page.properties['Cargo']) || 'participante',
    ativo: getProp(page.properties['Ativo']) ?? true,
    foto:  getProp(page.properties['Foto'])  || null,
  };
}

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  const notionId = token.notionId || token.id;

  // ── GET: return own profile ───────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!USERS_DB) {
      // Fall back to session data if no Notion DB configured
      return res.status(200).json({
        profile: { id: token.id, nome: token.name, email: token.email, cargo: token.role, foto: null },
      });
    }
    try {
      const page = await notion.pages.retrieve({ page_id: notionId });
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
      const properties = {};
      if (foto !== undefined) {
        properties['Foto'] = { url: foto || null };
      }
      const page = await notion.pages.update({ page_id: notionId, properties });
      return res.status(200).json({ profile: mapProfile(page) });
    } catch (err) {
      console.error('Profile PATCH error:', err);
      return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
  }

  return res.status(405).end();
}
