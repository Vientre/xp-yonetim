/**
 * DELETE /api/employees/[id]
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
  const result = await findRowById(TABS.EMPLOYEES, id)
  if (!result) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

  await deleteRowByIndex(TABS.EMPLOYEES, result.index)
  return NextResponse.json({ ok: true })
}
