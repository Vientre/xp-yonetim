/**
 * Meal Orders API
 *
 * Google Sheet: "Yemek" tab
 * Columns: id | tarih | isletme | adet | fiyat | toplamTutar | girenKisiId | girenKisiAdi | olusturmaTarihi
 * Index:   0  |   1   |    2   |   3  |   4   |      5      |      6      |       7      |       8
 *
 * No meals on Sundays (dayOfWeek === 0).
 * Meal price is stored in Ayarlar tab with key "yemekFiyati".
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess, getAccessibleBusinessIds } from "@/lib/auth-utils"
import { getRows, appendRow, updateRowByIndex, getSettings, generateId } from "@/lib/sheets"
import { TABS, BUSINESSES, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const mealSchema = z.object({
  businessId: z.string().min(1),
  date: z.string().min(1),
  count: z.number().int().min(0),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const month = searchParams.get("month") // YYYY-MM
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const accessibleIds = getAccessibleBusinessIds(user)

  const [rows, settings] = await Promise.all([
    getRows(TABS.MEALS),
    getSettings(),
  ])

  const defaultPrice = parseFloat(settings.yemekFiyati ?? "50")

  let entries = rows.map((row) => ({
    id: row[0] ?? "",
    date: row[1] ?? "",
    businessId: row[2] ?? "",
    business: { id: row[2] ?? "", name: getBusinessName(row[2] ?? "") },
    count: parseInt(row[3] || "0"),
    pricePerMeal: parseFloat(row[4] || String(defaultPrice)),
    totalCost: parseFloat(row[5] || "0"),
    enteredById: row[6] ?? "",
    enteredBy: { name: row[7] ?? "" },
    createdAt: row[8] ?? "",
  }))

  // Access control
  entries = entries.filter((e) => accessibleIds.includes(e.businessId))
  if (businessId) entries = entries.filter((e) => e.businessId === businessId)
  if (month) entries = entries.filter((e) => e.date.startsWith(month))
  if (from) entries = entries.filter((e) => e.date >= from)
  if (to) entries = entries.filter((e) => e.date <= to)

  // Sort newest first
  entries.sort((a, b) => b.date.localeCompare(a.date))

  // Weekly totals
  const weeklyMap: Record<string, { weekStart: string; count: number; total: number }> = {}
  for (const e of entries) {
    const d = new Date(e.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
    const key = weekStart.toISOString().split("T")[0]
    if (!weeklyMap[key]) weeklyMap[key] = { weekStart: key, count: 0, total: 0 }
    weeklyMap[key].count += e.count
    weeklyMap[key].total += e.totalCost
  }

  // Current and previous month totals
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`

  const currentMonthTotal = entries
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((s, e) => s + e.totalCost, 0)
  const prevMonthTotal = entries
    .filter((e) => e.date.startsWith(prevMonth))
    .reduce((s, e) => s + e.totalCost, 0)

  return NextResponse.json({
    entries,
    weeklyTotals: Object.values(weeklyMap).sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    currentMonthTotal,
    prevMonthTotal,
    mealPrice: defaultPrice,
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()

  // ── Batch (haftalık toplu kayıt) ──────────────────────────────────────────
  if (Array.isArray(body.entries)) {
    const settings = await getSettings()
    const mealPrice = parseFloat(settings.yemekFiyati ?? "50")
    const allRows = await getRows(TABS.MEALS)
    const createdAt = new Date().toISOString()

    const tasks: Promise<void>[] = []

    for (const entry of body.entries as Array<{ businessId: string; date: string; count: number }>) {
      const { businessId, date, count } = entry
      if (!hasBusinessAccess(user, businessId)) continue
      if (new Date(date).getDay() === 0) continue // Pazar yok

      const totalCost = count * mealPrice
      const existingIndex = allRows.findIndex((r) => r[1] === date && r[2] === businessId)

      if (existingIndex !== -1) {
        const existingId = allRows[existingIndex][0]
        tasks.push(
          updateRowByIndex(TABS.MEALS, existingIndex, [
            existingId, date, businessId, count, mealPrice, totalCost,
            user.id, user.name, createdAt,
          ])
        )
      } else if (count > 0) {
        const id = generateId()
        tasks.push(
          appendRow(TABS.MEALS, [id, date, businessId, count, mealPrice, totalCost, user.id, user.name, createdAt])
        )
      }
    }

    await Promise.all(tasks)
    return NextResponse.json({ saved: tasks.length })
  }

  // ── Tekil kayıt ───────────────────────────────────────────────────────────
  const parsed = mealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { businessId, date, count } = parsed.data

  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  if (new Date(date).getDay() === 0) {
    return NextResponse.json({ error: "Pazar günü yemek kaydı yapılamaz" }, { status: 400 })
  }

  const settings = await getSettings()
  const mealPrice = parseFloat(settings.yemekFiyati ?? "50")
  const totalCost = count * mealPrice

  const id = generateId()
  const createdAt = new Date().toISOString()

  await appendRow(TABS.MEALS, [id, date, businessId, count, mealPrice, totalCost, user.id, user.name, createdAt])

  return NextResponse.json(
    {
      id, date, businessId,
      business: { id: businessId, name: getBusinessName(businessId) },
      count, pricePerMeal: mealPrice, totalCost,
      enteredBy: { name: user.name },
      createdAt,
    },
    { status: 201 }
  )
}
