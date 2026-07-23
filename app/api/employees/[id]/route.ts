/**
 * DELETE /api/employees/[id]
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess } from "@/lib/auth-utils"
import { findRowById, deleteRowByIndex, updateRowByIndex } from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1),
  businessId: z.string().min(1),
  hourlyRate: z.number().min(0).optional().default(0),
  overtimeMultiplier: z.number().min(1).max(5).optional().default(2),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await params
  const result = await findRowById(TABS.EMPLOYEES, id)
  if (!result) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })
  if (!hasBusinessAccess(user, result.row[2] ?? "")) {
    return NextResponse.json({ error: "Bu personele erişim yok" }, { status: 403 })
  }

  const { name, businessId, hourlyRate, overtimeMultiplier } = parsed.data
  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const createdAt = result.row[3] ?? new Date().toISOString()
  await updateRowByIndex(TABS.EMPLOYEES, result.index, [
    id, name, businessId, createdAt, hourlyRate, overtimeMultiplier,
  ])

  return NextResponse.json({
    id,
    name,
    businessId,
    business: { id: businessId, name: getBusinessName(businessId) },
    createdAt,
    hourlyRate,
    overtimeMultiplier,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { id } = await params
  const result = await findRowById(TABS.EMPLOYEES, id)
  if (!result) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })
  if (!hasBusinessAccess(user, result.row[2] ?? "")) {
    return NextResponse.json({ error: "Bu personele erişim yok" }, { status: 403 })
  }

  await deleteRowByIndex(TABS.EMPLOYEES, result.index)
  return NextResponse.json({ ok: true })
}
