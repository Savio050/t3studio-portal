import { Client } from '@notionhq/client';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId } from '../../../lib/notionId';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const USERS_DB = sanitizeNotionId(process.env.NOTION_USERS_DB_ID);

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'select':    return prop.select?.name               || '';
    case 'checkbox':  return prop.checkbox ?? null;
    case 'url':       return prop.url || null;
    default:          return null;
  }
}

function mapUser(page) {
  return {
    id:    page.id,
    nome:  getProp(page.properties['Nome'])  || '',
    email: getProp(page.properties['Email']) || '',
    cargo: (getProp(page.properties['Cargo']) || 'participante').toLowerCase(),
    ativo: page.properties['ativo']?.checkbox !== false, // default true if unchecked/missing
    foto:  getProp(page.properties['foto'])  || null,
    source: 'notion',
  };
}

// Legacy users from AUTH_USERS env var (no passwords exposed)
function getLegacyUsers() {
  try {
    const raw = JSON.parse(process.env.AUTH_USERS || '[]');
    return raw.map((u, i) => ({
      id:     `legacy-${i}`,
      nome:   u.name  || u.nome  || '',
      email:  u.email || '',
      cargo:  (u.role || u.cargo || 'administrador').toLowerCase(),
      ativo:  true,
      foto:   null,
      source: 'legacy', // from AUTH_USERS env var
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  // Auth check — only admins
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  if (token.role !== 'administrador') return res.status(403).json({ error: 'Acesso restrito a administradores.' });

  // ── GET: list all users ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    // If no Notion DB, fall back to AUTH_USERS
    if (!USERS_DB) {
      const legacy = getLegacyUsers();
      return res.status(200).json({ users: legacy, notionConfigured: false });
    }

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

      let users = pages.map(mapUser);

      // If Notion DB is empty, merge in AUTH_USERS so the page isn't blank
      if (users.length === 0) {
        const legacy = getLegacyUsers();
        // Deduplicate by email — Notion takes priority
        const notionEmails = new Set(users.map(u => u.email.toLowerCase()));
        const extras = legacy.filter(u => !notionEmails.has(u.email.toLowerCase()));
        users = [...users, ...extras];
      }

      return res.status(200).json({ users, notionConfigured: true });
    } catch (err) {
      console.error('Users GET error:', err);
      // On Notion error, fall back to legacy
      const legacy = getLegacyUsers();
      return res.status(200).json({ users: legacy, notionConfigured: false, error: err?.message });
    }
  }

  // Mutations require Notion DB
  if (!USERS_DB) {
    return res.status(503).json({ error: 'NOTION_USERS_DB_ID não configurado. Adicione a variável no Vercel para gerenciar usuários.' });
  }

  // ── POST: create user ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, email, password, cargo } = req.body || {};
    if (!nome?.trim())     return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!email?.trim())    return res.status(400).json({ error: 'Email é obrigatório.' });
    if (!password?.trim()) return res.status(400).json({ error: 'Senha é obrigatória.' });

    const emailClean = email.trim().toLowerCase();
    const cargoClean = cargo === 'administrador' ? 'Administrador' : 'Participante';

    try {
      // Check for duplicates — try rich_text filter first, fall back to email type
      let duplicate = false;
      try {
        const res1 = await notion.databases.query({
          database_id: USERS_DB,
          filter: { property: 'Email', rich_text: { equals: emailClean } },
        });
        duplicate = res1.results.length > 0;
      } catch {
        try {
          const res2 = await notion.databases.query({
            database_id: USERS_DB,
            filter: { property: 'Email', email: { equals: emailClean } },
          });
          duplicate = res2.results.length > 0;
        } catch {
          // Can't check — proceed and let Notion enforce uniqueness
        }
      }
      if (duplicate) return res.status(409).json({ error: 'Já existe um usuário com este email.' });

      const hash = await bcrypt.hash(password, 10);

      // Detect Email property type from DB schema and build the correct payload
      let emailProp;
      try {
        const db = await notion.databases.retrieve({ database_id: USERS_DB });
        const emailType = db.properties['Email']?.type;
        emailProp = emailType === 'email'
          ? { email: emailClean }
          : { rich_text: [{ text: { content: emailClean } }] };
      } catch {
        emailProp = { rich_text: [{ text: { content: emailClean } }] };
      }

      const page = await notion.pages.create({
        parent: { database_id: USERS_DB },
        properties: {
          'Nome':  { title:     [{ text: { content: nome.trim() } }] },
          'Email': emailProp,
          'Senha': { rich_text: [{ text: { content: hash } }] },
          'Cargo': { select: { name: cargoClean } },
          'ativo': { checkbox: true },
        },
      });
      return res.status(201).json({ user: mapUser(page) });
    } catch (err) {
      console.error('Users POST error:', err?.message || err);
      return res.status(500).json({ error: 'Erro ao criar usuário: ' + (err?.message || 'desconhecido') });
    }
  }

  // ── PATCH: update role, active status, or password ────────────────────────
  if (req.method === 'PATCH') {
    const { id, cargo, ativo, password } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
    if (id.startsWith('legacy-')) return res.status(400).json({ error: 'Usuários legados não podem ser editados aqui. Atualize AUTH_USERS no Vercel.' });

    try {
      const properties = {};
      if (cargo !== undefined)
        properties['Cargo'] = { select: { name: cargo === 'administrador' ? 'administrador' : 'participante' } };
      if (ativo !== undefined)
        properties['ativo'] = { checkbox: Boolean(ativo) };
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

  // ── DELETE: archive user ──────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
    if (id.startsWith('legacy-')) return res.status(400).json({ error: 'Usuários legados não podem ser removidos aqui. Atualize AUTH_USERS no Vercel.' });
    if (id === token.notionId || id === token.id) {
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
