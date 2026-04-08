/**
 * Auth utilities for API routes and server components.
 * Uses session data (stored in JWT) - no database calls needed.
 */

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BUSINESSES } from "@/lib/constants"
import type { Role } from "@/lib/constants"

export type { Role }

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  businesses: string[] // business IDs or ["TUM"] meaning all
}

/** Get session user or redirect to login (for server components/pages). */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return session.user as unknown as SessionUser
}

/** Require specific roles or redirect to dashboard. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect("/dashboard")
  return user
}

/** Check if user can access a specific business. */
export function hasBusinessAccess(user: SessionUser, businessId: string): boolean {
  if (user.role === "admin") return true
  if (user.businesses.includes("TUM")) return true
  return user.businesses.includes(businessId)
}

/** Return list of business IDs this user can access. */
export function getAccessibleBusinessIds(user: SessionUser): string[] {
  if (user.role === "admin" || user.businesses.includes("TUM")) {
    return BUSINESSES.map((b) => b.id)
  }
  return user.businesses.filter((b) => BUSINESSES.some((biz) => biz.id === b))
}

/** Get session user or return null (for API routes). */
export async function getAuthUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as unknown as SessionUser
}
