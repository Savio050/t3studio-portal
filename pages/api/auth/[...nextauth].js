import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Users are stored in the AUTH_USERS env var as a JSON array:
// [{"id":"1","name":"Sávio","email":"savio@email.com","password":"senha"},...]
function getUsers() {
  try {
    return JSON.parse(process.env.AUTH_USERS || '[]');
  } catch {
    return [];
  }
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
        const users = getUsers();
        const user = users.find(
          u =>
            u.email.toLowerCase() === (credentials?.email || '').toLowerCase() &&
            u.password === credentials?.password
        );
        if (user) return { id: user.id, name: user.name, email: user.email };
        return null;
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id;
        session.user.name = token.name;
      }
      return session;
    },
  },
});
