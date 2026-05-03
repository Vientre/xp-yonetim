/**
 * Next.js 16 Proxy (replaces deprecated middleware.ts)
 * Runs in Node.js runtime — no edge constraints.
 *
 * Auth strategy: check for the NextAuth session cookie existence.
 * JWT signature verification happens inside route handlers / server
 * components via lib/auth.ts — not here.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// NextAuth v5 sets one of these cookie names depending on HTTPS/HTTP
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  // legacy next-auth v4 names (fallback)
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
]

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow: static assets, images, API routes, login page
  const isPublic =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login"

  const isLoggedIn = hasSessionCookie(request)

  // Not authenticated → redirect to /login (preserve callbackUrl)
  if (!isPublic && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already authenticated → /login → send to /dashboard
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // No root page — redirect / → /dashboard
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
