import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Client } from '@notionhq/client';
import bcrypt from 'bcryptjs';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const USERS_DB = process.env.NOTION_USERS_DB_ID;

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'email':     return prop.email                      || '';
    case 'select':    return prop.select?.name               || '';
    case 'checkbox':  return prop.checkbox ?? null; // null = not set, false = explicitly off
    default:          return null;
  }
}

// ── Fallback: legacy users from AUTH_USERS env var ───────────────────────────
function getLegacyUsers() {
  try { return JSON.parse(process.env.AUTH_USERS || '[]'); } catch { return []; }
}

function authorizeWithLegacy(credentials) {
  const users = getLegacyUsers();
  const user  = users.find(
    u => u.email.toLowerCase() === (credentials?.email || '').toLowerCase() &&
         u.password === credentials?.password
  );
  if (!user) return null;
  return {
    id:       user.id || user.email,
    notionId: null,
    name:     user.name,
    email:    user.email,
    role:     user.role || 'administrador',
  };
}

async function authorizeWithNotion(credentials) {
  const email = (credentials?.email || '').toLowerCase().trim();
  const password = credentials?.password || '';

  // Try filtering by Email field (rich_text or email type)
  let results = [];
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', rich_text: { equals: email } },
    });
    results = res.results;
  } catch {
    // Email field might be a different type — fall back to fetching all and filtering
    try {
      const res = await notion.databases.query({ database_id: USERS_DB, page_size: 100 });
      results = res.results.filter(p => {
        const e = getProp(p.properties['Email']) || '';
        return e.toLowerCase().trim() === email;
      });
    } catch (err) {
      console.error('Notion auth query error:', err?.message || err);
      return null;
    }
  }

  const page = results[0];
  if (!page) return null;

  // ── Ativo check ─────────────────────────────────────────────────────────────
  // Only block if explicitly set to false. If the field is missing or unchecked
  // (which is the Notion default for new rows), treat as active.
  const ativoRaw = page.properties['Ativo'];
  if (ativoRaw && ativoRaw.type === 'checkbox' && ativoRaw.checkbox === false) {
    return null; // explicitly deactivated
  }

  // ── Password check ──────────────────────────────────────────────────────────
  // Support both bcrypt hashes ($2b$…) and plain-text passwords.
  // Plain-text is accepted for bootstrap / manual Notion setup.
  // Once a user logs in via the admin panel's "Redefinir senha", it gets hashed.
  const stored = getProp(page.properties['Senha']) || '';
  if (!stored) return null;

  let valid = false;
  if (stored.startsWith('$2')) {
    // bcrypt hash
    valid = await bcrypt.compare(password, stored);
  } else {
    // plain text (bootstrap phase)
    valid = stored === password;
  }
  if (!valid) return null;

  return {
    id:       page.id,
    notionId: page.id,
    name:     getProp(page.properties['Nome'])  || '',
    email:    getProp(page.properties['Email']) || email,
    role:     getProp(page.properties['Cargo']) || 'administrador',
  };
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Email e Senha',
      credentials: {
        email:    { label: 'Email',  type: 'email'    },
        password: { label: 'Senha',  type: 'password' },
      },
      async authorize(credentials) {
        // 1. Try Notion if configured
        if (USERS_DB) {
          try {
            const user = await authorizeWithNotion(credentials);
            if (user) return user;
          } catch (err) {
            console.error('Notion auth error:', err?.message || err);
            // Fall through to legacy
          }
        }
        // 2. Fallback to AUTH_USERS env var
        return authorizeWithLegacy(credentials);
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.notionId = user.notionId;
        token.name     = user.name;
        token.role     = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id;
        session.user.notionId = token.notionId;
        session.user.name     = token.name;
        session.user.role     = token.role;
      }
      return session;
    },
  },
});
