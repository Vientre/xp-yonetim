/**
 * Edge-safe auth configuration.
 * This file must NOT import any Node.js-only modules (like googleapis).
 * It is imported by middleware.ts which runs in the Edge runtime.
 */

import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/login")
      const isApiRoute = nextUrl.pathname.startsWith("/api")

      if (isApiRoute) return true
      if (!isLoggedIn && !isAuthPage) {
        const loginUrl = new URL("/login", nextUrl)
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
        return Response.redirect(loginUrl)
      }
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.businesses = (user as any).businesses
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).businesses = token.businesses
      }
      return session
    },
  },
  providers: [], // Credentials provider added in lib/auth.ts
}
