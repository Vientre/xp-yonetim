/**
 * PATCH /api/attendance/[id] — güncelle
 * DELETE /api/attendance/[id] — sil
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess } from "@/lib/auth-utils"
import { findRowById, updateRowByIndex, deleteRowByIndex } from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const patchSchema = z.object({
  date: z.string().min(1),
  employeeName: z.string().min(1),
  hoursWorked: z.number().min(0).max(24),
  mealAmount: z.number().min(0).default(0),
  tipAmount: z.number().min(0).default(0),
  deductionAmount: z.number().min(0).default(0),
  mesai: z.number().min(0).default(0),
  notes: z.string().optional().default(""),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { id } = await params
  const result = await findRowById(TABS.ATTENDANCE, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  const businessId = result.row[3]
  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { date, employeeName, hoursWorked, mealAmount, tipAmount, deductionAmount, mesai, notes } = parsed.data

  await updateRowByIndex(TABS.ATTENDANCE, result.index, [
    id, date, employeeName, businessId,
    hoursWorked, mealAmount, tipAmount, deductionAmount,
    notes, user.id, user.name, result.row[11] ?? new Date().toISOString(), mesai,
  ])

  return NextResponse.json({
    id, date, employeeName, businessId,
    business: { id: businessId, name: getBusinessName(businessId) },
    hoursWorked, mealAmount, tipAmount, deductionAmount, mesai,
    notes, enteredBy: { name: user.name },
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
  const result = await findRowById(TABS.ATTENDANCE, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  const businessId = result.row[3]
  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  await deleteRowByIndex(TABS.ATTENDANCE, result.index)
  return NextResponse.json({ ok: true })
}
