import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // Requis derrière un reverse-proxy (Caddy) : Auth.js fait confiance à l'hôte transmis.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const publicPaths = ["/login", "/register", "/verify-email"];
      const isPublic =
        publicPaths.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/register") ||
        // Endpoint cron : protégé par CRON_SECRET, pas par une session.
        pathname.startsWith("/internal/cron");

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  providers: [],
  session: { strategy: "jwt" },
};
