/**
 * /api/crm/profile
 * Any authenticated user can GET their own profile and PATCH their foto.
 * Does not expose password hashes.
 */
import { Client } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId, isValidNotionId, findNotionPageByEmail } from '../../../lib/notionId';

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

async function resolvePageId(token) {
  if (isValidNotionId(token.notionId)) return token.notionId;
  return await findNotionPageByEmail(notion, USERS_DB, token.email);
}

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  // ── GET: return own profile ───────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!USERS_DB) {
      return res.status(200).json({
        profile: { id: token.id, nome: token.name, email: token.email, cargo: token.role, foto: null },
      });
    }
    try {
      const pageId = await resolvePageId(token);
      if (!pageId) {
        return res.status(200).json({
          profile: { id: token.id, nome: token.name, email: token.email, cargo: token.role, foto: null },
        });
      }
      const page = await notion.pages.retrieve({ page_id: pageId });
      return res.status(200).json({ profile: mapProfile(page) });
    } catch (err) {
      console.error('Profile GET error:', err?.message || err);
      return res.status(500).json({ error: 'Erro ao buscar perfil: ' + (err?.message || 'desconhecido') });
    }
  }

  // ── PATCH: update own foto ────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { foto } = req.body || {};
    if (!USERS_DB) return res.status(503).json({ error: 'NOTION_USERS_DB_ID não configurado.' });

    try {
      const pageId = await resolvePageId(token);
      if (!pageId) return res.status(404).json({ error: 'Perfil não encontrado no Notion.' });

      const page = await notion.pages.update({
        page_id: pageId,
        properties: { 'foto': { url: foto || null } },
      });
      return res.status(200).json({ profile: mapProfile(page) });
    } catch (err) {
      console.error('Profile PATCH error:', err?.message || err);
      return res.status(500).json({ error: 'Erro ao atualizar perfil: ' + (err?.message || 'desconhecido') });
    }
  }

  return res.status(405).end();
}
