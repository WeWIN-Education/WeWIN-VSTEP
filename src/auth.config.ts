import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Pages and APIs validate fresh account state; catalogues remain public.
      const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/profile/") || pathname.startsWith("/manage") || pathname.startsWith("/leaderboard");
      if (isProtected) return !!auth;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "LEARNER";
        session.user.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : -1;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" as const },
  trustHost: true,
} satisfies NextAuthConfig;
