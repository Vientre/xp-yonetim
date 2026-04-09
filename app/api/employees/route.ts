/**
 * Employees API
 *
 * Google Sheet: "Personeller" tab
 * Columns: id | ad | isletmeId | olusturmaTarihi
 * Index:   0  |  1 |     2     |       3
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess } from "@/lib/auth-utils"
import { getRows, appendRow, generateId } from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const addSchema = z.object({
  name: z.string().min(1),
  businessId: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")

  const rows = await getRows(TABS.EMPLOYEES)

  let employees = rows.map((row) => ({
    id: row[0] ?? "",
    name: row[1] ?? "",
    businessId: row[2] ?? "",
    business: { id: row[2] ?? "", name: getBusinessName(row[2] ?? "") },
    createdAt: row[3] ?? "",
  }))

  if (businessId) {
    employees = employees.filter((e) => e.businessId === businessId)
  }

  return NextResponse.json(employees.sort((a, b) => a.name.localeCompare(b.name, "tr")))
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, businessId } = parsed.data

  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const id = generateId()
  const createdAt = new Date().toISOString()
  await appendRow(TABS.EMPLOYEES, [id, name, businessId, createdAt])

  return NextResponse.json(
    { id, name, businessId, business: { id: businessId, name: getBusinessName(businessId) }, createdAt },
    { status: 201 }
  )
}
