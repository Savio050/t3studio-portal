import { withAuth } from 'next-auth/middleware';

// Protects all /dashboard/* routes — redirects to /login if not authenticated.
// The client portal (/) is not protected and stays publicly accessible.
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
