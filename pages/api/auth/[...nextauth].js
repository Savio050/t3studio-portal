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
    case 'select':    return prop.select?.name               || '';
    case 'checkbox':  return prop.checkbox ?? false;
    default:          return null;
  }
}

// ── Fallback: legacy users from AUTH_USERS env var ────────────────────────────
// Used only when NOTION_USERS_DB_ID is not set (during migration / initial setup).
function getLegacyUsers() {
  try { return JSON.parse(process.env.AUTH_USERS || '[]'); } catch { return []; }
}

async function authorizeWithNotion(credentials) {
  const res = await notion.databases.query({
    database_id: USERS_DB,
    filter: {
      property: 'Email',
      rich_text: { equals: (credentials?.email || '').toLowerCase().trim() },
    },
  });

  const page = res.results[0];
  if (!page) return null;

  const ativo = getProp(page.properties['Ativo']);
  if (!ativo) return null; // deactivated account

  const hash = getProp(page.properties['Senha']) || '';
  const valid = await bcrypt.compare(credentials?.password || '', hash);
  if (!valid) return null;

  return {
    id:       page.id,
    notionId: page.id,
    name:     getProp(page.properties['Nome'])  || '',
    email:    getProp(page.properties['Email']) || '',
    role:     getProp(page.properties['Cargo']) || 'participante',
  };
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
    role:     user.role || 'administrador', // legacy users are admins by default
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
        // Try Notion first; fall back to legacy env-var users
        if (USERS_DB) {
          return await authorizeWithNotion(credentials);
        }
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
