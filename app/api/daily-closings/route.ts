/**
 * Daily Finance Entries API
 *
 * Google Sheet: "GunlukGelir" tab
 * Columns: id | tarih | isletme | nakit | kart | bilet | toplamGelir | toplamGider | net | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi
 * Index:    0  |   1   |    2   |   3   |   4  |   5   |      6      |      7      |  8  |    9   |     10      |      11      |       12
 *
 * Google Sheet: "Giderler" tab
 * Columns: id | gelirKayitId | kategoriId | kategoriAdi | aciklama | tutar
 * Index:   0  |      1       |     2      |      3      |     4    |   5
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess, getAccessibleBusinessIds } from "@/lib/auth-utils"
import { getRows, appendRow, generateId } from "@/lib/sheets"
import { TABS, EXPENSE_CATEGORIES, BUSINESSES, getCategoryById, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const expenseRow = z.object({
  categoryId: z.string().min(1, "Kategori seçin"),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Geçerli tutar"),
  description: z.string().optional().default(""),
  paymentMethod: z.string().optional(),
})

const bodySchema = z.object({
  businessId: z.string().min(1, "İşletme seçin"),
  date: z.string().min(1, "Tarih seçin"),
  cashIncome: z.string().default("0"),
  cardIncome: z.string().default("0"),
  ticketIncome: z.string().default("0"),
  notes: z.string().optional().default(""),
  expenses: z.array(expenseRow).optional().default([]),
})

function parseGelirRow(row: string[]) {
  const businessId = row[2] ?? ""
  return {
    id: row[0] ?? "",
    date: row[1] ?? "",
    businessId,
    business: { id: businessId, name: getBusinessName(businessId) },
    cashIncome: parseFloat(row[3] || "0"),
    cardIncome: parseFloat(row[4] || "0"),
    ticketIncome: parseFloat(row[5] || "0"),
    totalIncome: parseFloat(row[6] || "0"),
    totalExpense: parseFloat(row[7] || "0"),
    netAmount: parseFloat(row[8] || "0"),
    notes: row[9] ?? "",
    enteredById: row[10] ?? "",
    enteredBy: { id: row[10] ?? "", name: row[11] ?? "" },
    status: "CLOSED",
    createdAt: row[12] ?? "",
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)

  // Access control
  if (businessId && !hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const accessibleIds = getAccessibleBusinessIds(user)

  const [gelirRows, giderRows] = await Promise.all([
    getRows(TABS.DAILY_INCOME),
    getRows(TABS.EXPENSES),
  ])

  let entries = gelirRows.map(parseGelirRow)

  // Filter by accessible businesses
  entries = entries.filter((e) => accessibleIds.includes(e.businessId))

  // Staff can only see their own entries
  if (user.role === "staff") {
    entries = entries.filter((e) => e.enteredById === user.id)
  }

  // Business filter
  if (businessId) {
    entries = entries.filter((e) => e.businessId === businessId)
  }

  // Date filters (ISO date strings compare correctly as strings)
  if (from) entries = entries.filter((e) => e.date >= from)
  if (to) entries = entries.filter((e) => e.date <= to)

  // Sort newest first, then limit
  entries = entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)

  // Attach expenses
  const result = entries.map((entry) => {
    const expenses = giderRows
      .filter((row) => row[1] === entry.id)
      .map((row) => {
        const cat = getCategoryById(row[2])
        return {
          id: row[0],
          dailyClosingId: row[1],
          categoryId: row[2],
          category: {
            id: row[2],
            name: cat?.name ?? row[3] ?? row[2],
            color: cat?.color ?? "#6366f1",
          },
          description: row[4] ?? "",
          amount: parseFloat(row[5] || "0"),
        }
      })
    return { ...entry, expenses }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { businessId, date, cashIncome, cardIncome, ticketIncome, notes, expenses } = parsed.data

  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  // Check for duplicate (same business + same date)
  const existingRows = await getRows(TABS.DAILY_INCOME)
  const duplicate = existingRows.find((r) => r[2] === businessId && r[1] === date)
  if (duplicate) {
    return NextResponse.json(
      { error: "Bu işletme için bu tarihe ait kayıt zaten mevcut", existingId: duplicate[0] },
      { status: 409 }
    )
  }

  const cash = parseFloat(cashIncome) || 0
  const card = parseFloat(cardIncome) || 0
  const ticket = parseFloat(ticketIncome) || 0
  const totalIncome = cash + card + ticket
  const totalExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const net = totalIncome - totalExpense

  const id = generateId()
  const createdAt = new Date().toISOString()

  // Write to GunlukGelir tab
  await appendRow(TABS.DAILY_INCOME, [
    id, date, businessId, cash, card, ticket,
    totalIncome, totalExpense, net,
    notes ?? "", user.id, user.name, createdAt,
  ])

  // Write each expense to Giderler tab
  for (const expense of expenses) {
    const cat = getCategoryById(expense.categoryId)
    await appendRow(TABS.EXPENSES, [
      generateId(),
      id,
      expense.categoryId,
      cat?.name ?? expense.categoryId,
      expense.description ?? "",
      parseFloat(expense.amount) || 0,
    ])
  }

  return NextResponse.json(
    {
      id,
      date,
      businessId,
      business: { id: businessId, name: getBusinessName(businessId) },
      cashIncome: cash,
      cardIncome: card,
      ticketIncome: ticket,
      totalIncome,
      totalExpense,
      netAmount: net,
      notes: notes ?? "",
      status: "CLOSED",
      enteredBy: { id: user.id, name: user.name },
      expenses: expenses.map((e) => {
        const cat = getCategoryById(e.categoryId)
        return {
          categoryId: e.categoryId,
          category: { id: e.categoryId, name: cat?.name ?? e.categoryId, color: cat?.color ?? "#6366f1" },
          amount: parseFloat(e.amount) || 0,
          description: e.description ?? "",
        }
      }),
      createdAt,
    },
    { status: 201 }
  )
}
