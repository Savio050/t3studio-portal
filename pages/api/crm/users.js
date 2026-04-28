import { Client } from '@notionhq/client';
import bcrypt from 'bcryptjs';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const USERS_DB = process.env.NOTION_USERS_DB_ID;

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'select':    return prop.select?.name               || '';
    case 'checkbox':  return prop.checkbox ?? false;
    default:          return null;
  }
}

function mapUser(page) {
  return {
    id:    page.id,
    nome:  getProp(page.properties['Nome'])  || '',
    email: getProp(page.properties['Email']) || '',
    cargo: getProp(page.properties['Cargo']) || 'participante',
    ativo: getProp(page.properties['Ativo']) ?? true,
  };
}

// Guard: only admins can call this endpoint.
// We trust the caller to pass the session role (validated server-side via getToken).
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (!USERS_DB) {
    return res.status(503).json({ error: 'NOTION_USERS_DB_ID não configurado.' });
  }

  // Auth check — only admins
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  if (token.role !== 'administrador') return res.status(403).json({ error: 'Acesso restrito a administradores.' });

  // ── GET: list all users ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
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
      return res.status(200).json({ users: pages.map(mapUser) });
    } catch (err) {
      console.error('Users GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
  }

  // ── POST: create user ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, email, password, cargo } = req.body || {};
    if (!nome?.trim())     return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!email?.trim())    return res.status(400).json({ error: 'Email é obrigatório.' });
    if (!password?.trim()) return res.status(400).json({ error: 'Senha é obrigatória.' });

    try {
      // Check duplicate email
      const existing = await notion.databases.query({
        database_id: USERS_DB,
        filter: { property: 'Email', rich_text: { equals: email.trim().toLowerCase() } },
      });
      if (existing.results.length > 0) {
        return res.status(409).json({ error: 'Já existe um usuário com este email.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const page = await notion.pages.create({
        parent: { database_id: USERS_DB },
        properties: {
          'Nome':  { title:     [{ text: { content: nome.trim() } }] },
          'Email': { rich_text: [{ text: { content: email.trim().toLowerCase() } }] },
          'Senha': { rich_text: [{ text: { content: hash } }] },
          'Cargo': { select: { name: cargo === 'administrador' ? 'administrador' : 'participante' } },
          'Ativo': { checkbox: true },
        },
      });
      return res.status(201).json({ user: mapUser(page) });
    } catch (err) {
      console.error('Users POST error:', err);
      return res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
  }

  // ── PATCH: update role, active status, or password ────────────────────────
  if (req.method === 'PATCH') {
    const { id, cargo, ativo, password } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    try {
      const properties = {};
      if (cargo !== undefined)
        properties['Cargo'] = { select: { name: cargo === 'administrador' ? 'administrador' : 'participante' } };
      if (ativo !== undefined)
        properties['Ativo'] = { checkbox: Boolean(ativo) };
      if (password?.trim()) {
        const hash = await bcrypt.hash(password, 10);
        properties['Senha'] = { rich_text: [{ text: { content: hash } }] };
      }

      const page = await notion.pages.update({ page_id: id, properties });
      return res.status(200).json({ user: mapUser(page) });
    } catch (err) {
      console.error('Users PATCH error:', err);
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
  }

  // ── DELETE: archive (deactivate) user ─────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    // Prevent self-deletion
    if (id === token.notionId) {
      return res.status(400).json({ error: 'Não é possível remover sua própria conta.' });
    }

    try {
      await notion.pages.update({ page_id: id, archived: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Users DELETE error:', err);
      return res.status(500).json({ error: 'Erro ao remover usuário.' });
    }
  }

  return res.status(405).end();
}
