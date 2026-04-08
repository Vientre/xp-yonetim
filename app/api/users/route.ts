/**
 * Users API - reads/writes from Kullanicilar tab in Google Sheets.
 *
 * Kullanicilar tab columns:
 * id | email | passwordHash | name | role | businesses
 *
 * Only admin can access this endpoint.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, appendRow, generateId } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "staff"]),
  businesses: z.array(z.string()).default([]),
})

function parseUserRow(row: string[]) {
  return {
    id: row[0],
    email: row[1],
    name: row[3],
    role: row[4],
    businesses: (row[5] ?? "").split(",").map((b) => b.trim()).filter(Boolean),
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const rows = await getRows(TABS.USERS)
  // Skip header row if first row looks like a header (non-numeric id or literal "id")
  const dataRows = rows.filter((r) => r[0] && r[0] !== "id" && !/^(name|email|role)$/i.test(r[0]))
  return NextResponse.json(dataRows.map(parseUserRow))
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password, role, businesses } = parsed.data

  // Check duplicate email
  const rows = await getRows(TABS.USERS)
  const duplicate = rows.find((r) => r[1]?.toLowerCase() === email.toLowerCase())
  if (duplicate) {
    return NextResponse.json({ error: "Bu e-posta zaten kullanılıyor" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const id = generateId()
  const businessesStr = role === "admin" ? "TUM" : businesses.join(",")

  await appendRow(TABS.USERS, [id, email, passwordHash, name, role, businessesStr])

  return NextResponse.json({ id, email, name, role, businesses }, { status: 201 })
}
