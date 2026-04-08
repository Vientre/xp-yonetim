/**
 * Full NextAuth configuration (Node.js runtime only).
 * Imports googleapis via lib/sheets.ts — never import this in middleware.
 *
 * Users are stored in the "Kullanicilar" Google Sheet tab:
 * Columns: id | email | passwordHash | name | role | businesses
 *
 * businesses: "TUM" for all access, or "xp-racing,xp-vr" (comma-separated IDs)
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authConfig } from "@/lib/auth.config"
import { getRows } from "@/lib/sheets"
import { TABS } from "@/lib/constants"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

function parseUserRow(row: string[]) {
  return {
    id: row[0] ?? "",
    email: row[1] ?? "",
    passwordHash: row[2] ?? "",
    name: row[3] ?? "",
    role: row[4] ?? "staff",
    businesses: (row[5] ?? "").split(",").map((b) => b.trim()).filter(Boolean),
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        try {
          const rows = await getRows(TABS.USERS)
          const userRow = rows.find(
            (row) => row[1]?.toLowerCase() === parsed.data.email.toLowerCase()
          )
          if (!userRow) return null

          const user = parseUserRow(userRow)
          if (!user.id || !user.passwordHash) return null

          const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash)
          if (!passwordMatch) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as any,
            businesses: user.role === "admin" ? ["TUM"] : user.businesses,
          } as any
        } catch (err) {
          console.error("Auth error:", err)
          return null
        }
      },
    }),
  ],
})
