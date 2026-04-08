/**
 * Individual daily closing record operations
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, findRowById, deleteRowByIndex } from "@/lib/sheets"
import { TABS, getCategoryById, getBusinessName } from "@/lib/constants"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const result = await findRowById(TABS.DAILY_INCOME, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  const { row } = result
  const giderRows = await getRows(TABS.EXPENSES)
  const expenses = giderRows
    .filter((r) => r[1] === id)
    .map((r) => {
      const cat = getCategoryById(r[2])
      return {
        id: r[0],
        categoryId: r[2],
        category: { id: r[2], name: cat?.name ?? r[3] ?? r[2], color: cat?.color ?? "#6366f1" },
        description: r[4] ?? "",
        amount: parseFloat(r[5] || "0"),
      }
    })

  const businessId = row[2] ?? ""
  return NextResponse.json({
    id: row[0],
    date: row[1],
    businessId,
    business: { id: businessId, name: getBusinessName(businessId) },
    cashIncome: parseFloat(row[3] || "0"),
    cardIncome: parseFloat(row[4] || "0"),
    ticketIncome: parseFloat(row[5] || "0"),
    totalIncome: parseFloat(row[6] || "0"),
    totalExpense: parseFloat(row[7] || "0"),
    netAmount: parseFloat(row[8] || "0"),
    notes: row[9] ?? "",
    expenses,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler silebilir" }, { status: 403 })
  }

  const { id } = await params
  const result = await findRowById(TABS.DAILY_INCOME, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  await deleteRowByIndex(TABS.DAILY_INCOME, result.index)

  const giderRows = await getRows(TABS.EXPENSES)
  const expenseIndices = giderRows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => row[1] === id)
    .map(({ i }) => i)
    .reverse()

  for (const idx of expenseIndices) {
    await deleteRowByIndex(TABS.EXPENSES, idx)
  }

  return NextResponse.json({ success: true })
}
