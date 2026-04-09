/**
 * Individual daily closing record operations
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess } from "@/lib/auth-utils"
import { getRows, findRowById, deleteRowByIndex, updateRowByIndex, appendRow, generateId } from "@/lib/sheets"
import { TABS, getCategoryById, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const expenseRow = z.object({
  categoryId: z.string().min(1),
  amount: z.string(),
  description: z.string().optional().default(""),
})

const patchSchema = z.object({
  cashIncome: z.string().default("0"),
  cardIncome: z.string().default("0"),
  ticketIncome: z.string().default("0"),
  notes: z.string().optional().default(""),
  expenses: z.array(expenseRow).optional().default([]),
})

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const result = await findRowById(TABS.DAILY_INCOME, id)
  if (!result) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

  const businessId = result.row[2]
  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { cashIncome, cardIncome, ticketIncome, notes, expenses } = parsed.data
  const cash = parseFloat(cashIncome) || 0
  const card = parseFloat(cardIncome) || 0
  const ticket = parseFloat(ticketIncome) || 0
  const totalIncome = cash + card + ticket
  const totalExpense = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const net = totalIncome - totalExpense
  const date = result.row[1]

  // Update GunlukGelir row
  await updateRowByIndex(TABS.DAILY_INCOME, result.index, [
    id, date, businessId, cash, card, ticket,
    totalIncome, totalExpense, net,
    notes ?? "", user.id, user.name, result.row[12] ?? new Date().toISOString(),
  ])

  // Replace expenses: delete old, insert new
  const giderRows = await getRows(TABS.EXPENSES)
  const oldIndices = giderRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r[1] === id)
    .map(({ i }) => i)
    .sort((a, b) => b - a)
  for (const idx of oldIndices) {
    await deleteRowByIndex(TABS.EXPENSES, idx)
  }
  for (const expense of expenses) {
    const cat = getCategoryById(expense.categoryId)
    await appendRow(TABS.EXPENSES, [
      generateId(), id, expense.categoryId,
      cat?.name ?? expense.categoryId,
      expense.description ?? "",
      parseFloat(expense.amount) || 0,
    ])
  }

  return NextResponse.json({
    id, date, businessId,
    business: { id: businessId, name: getBusinessName(businessId) },
    cashIncome: cash, cardIncome: card, ticketIncome: ticket,
    totalIncome, totalExpense, netAmount: net,
    notes: notes ?? "",
    expenses: expenses.map((e) => {
      const cat = getCategoryById(e.categoryId)
      return {
        categoryId: e.categoryId,
        category: { id: e.categoryId, name: cat?.name ?? e.categoryId, color: cat?.color ?? "#6366f1" },
        amount: parseFloat(e.amount) || 0,
        description: e.description ?? "",
      }
    }),
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
