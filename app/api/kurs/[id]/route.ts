/**
 * DELETE /api/kurs/[id] — öğrenci sil
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, updateRowByIndex, deleteRowByIndex } from "@/lib/sheets"
import { TABS } from "@/lib/constants"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }) }
  if (user.role !== "admin") return { user: null, error: NextResponse.json({ error: "Sadece yönetici" }, { status: 403 }) }
  return { user, error: null }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const [studentRows, paymentRows] = await Promise.all([
    getRows(TABS.KURS_OGRENCI),
    getRows(TABS.KURS_ODEME),
  ])

  const studentIndex = studentRows.findIndex((r) => r[0] === id)
  if (studentIndex === -1) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })

  // Delete student row
  await deleteRowByIndex(TABS.KURS_OGRENCI, studentIndex)

  // Delete all payment rows for this student (in reverse order to keep indices stable)
  const paymentIndices = paymentRows
    .map((r, i) => ({ row: r, i }))
    .filter(({ row }) => row[1] === id)
    .map(({ i }) => i)
    .sort((a, b) => b - a)

  for (const idx of paymentIndices) {
    await deleteRowByIndex(TABS.KURS_ODEME, idx)
  }

  return NextResponse.json({ ok: true })
}
