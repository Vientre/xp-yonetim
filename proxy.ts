/**
 * Middleware — runs in Edge runtime.
 * Uses only the edge-safe auth config (no googleapis/Node.js modules).
 */

import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export default NextAuth(authConfig).auth

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
