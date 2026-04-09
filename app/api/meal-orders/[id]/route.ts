/**
 * DELETE /api/meal-orders/[id] — tekil yemek kaydı sil
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { findRowById, deleteRowByIndex } from "@/lib/sheets"
import { TABS } from "@/lib/constants"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { id } = await params
  const result = await findRowById(TABS.MEALS, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  await deleteRowByIndex(TABS.MEALS, result.index)
  return NextResponse.json({ ok: true })
}
