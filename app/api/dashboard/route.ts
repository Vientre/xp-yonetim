/**
 * Admin Dashboard API
 * Aggregates data from Google Sheets for charts and summary cards.
 * Only accessible by admin role.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, getSettings } from "@/lib/sheets"
import { TABS, BUSINESSES, EXPENSE_CATEGORIES, getCategoryById, getBusinessName } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler görebilir" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const period = searchParams.get("period") ?? "month"
  const businessId = searchParams.get("businessId")
  const monthParam = searchParams.get("month") // YYYY-MM for specific month filter

  // Calculate date range
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  let fromDate: string
  let toDate: string

  switch (period) {
    case "today":
      fromDate = todayStr
      toDate = todayStr
      break
    case "week": {
      const d = new Date(now)
      d.setDate(now.getDate() - 6)
      fromDate = d.toISOString().split("T")[0]
      toDate = todayStr
      break
    }
    case "year":
      fromDate = `${now.getFullYear()}-01-01`
      toDate = todayStr
      break
    default: {
      // "month" + optional monthParam = specific month
      const target = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const [y, m] = target.split("-").map(Number)
      fromDate = `${target}-01`
      // Last day of the selected month
      const lastDay = new Date(y, m, 0) // day 0 of next month = last day of this month
      const lastDayStr = lastDay.toISOString().split("T")[0]
      // Cap toDate at today so we don't show "future" data for current month
      toDate = lastDayStr < todayStr ? lastDayStr : todayStr
      break
    }
  }

  // Calculate previous period date range for comparison
  let prevFromDate: string
  let prevToDate: string
  if (period === "month" || !period) {
    const d = new Date(fromDate)
    const prevEnd = new Date(d)
    prevEnd.setDate(0) // last day of previous month
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
    prevFromDate = prevStart.toISOString().split("T")[0]
    prevToDate = prevEnd.toISOString().split("T")[0]
  } else if (period === "week") {
    const d = new Date(fromDate)
    d.setDate(d.getDate() - 7)
    prevFromDate = d.toISOString().split("T")[0]
    const d2 = new Date(fromDate)
    d2.setDate(d2.getDate() - 1)
    prevToDate = d2.toISOString().split("T")[0]
  } else if (period === "year") {
    prevFromDate = `${now.getFullYear() - 1}-01-01`
    prevToDate = `${now.getFullYear() - 1}-12-31`
  } else {
    prevFromDate = fromDate
    prevToDate = toDate
  }

  // Fetch all data in parallel
  const [gelirRows, giderRows, yemekRows, settings] = await Promise.all([
    getRows(TABS.DAILY_INCOME),
    getRows(TABS.EXPENSES),
    getRows(TABS.MEALS),
    getSettings(),
  ])

  // Filter income rows by date and business
  let filtered = gelirRows.filter((r) => r[1] >= fromDate && r[1] <= toDate)
  if (businessId) filtered = filtered.filter((r) => r[2] === businessId)

  // ─── Summary totals ─────────────────────────────────────────────────────────
  const totalIncome = filtered.reduce((s, r) => s + (parseFloat(r[6]) || 0), 0)
  const totalExpense = filtered.reduce((s, r) => s + (parseFloat(r[7]) || 0), 0)
  const cashIncome = filtered.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0)
  const cardIncome = filtered.reduce((s, r) => s + (parseFloat(r[4]) || 0), 0)
  const ticketIncome = filtered.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0)

  // ─── Business summary ────────────────────────────────────────────────────────
  const businessSummary: Record<string, { id: string; name: string; income: number; expense: number; net: number }> = {}
  for (const row of filtered) {
    const bizId = row[2]
    if (!businessSummary[bizId]) {
      businessSummary[bizId] = { id: bizId, name: getBusinessName(bizId), income: 0, expense: 0, net: 0 }
    }
    businessSummary[bizId].income += parseFloat(row[6]) || 0
    businessSummary[bizId].expense += parseFloat(row[7]) || 0
    businessSummary[bizId].net = businessSummary[bizId].income - businessSummary[bizId].expense
  }

  // ─── Expense by category ──────────────────────────────────────────────────────
  const entryIds = new Set(filtered.map((r) => r[0]))
  const filteredGider = giderRows.filter((r) => entryIds.has(r[1]))
  const expenseByCategory: Record<string, { name: string; color: string; total: number }> = {}
  for (const row of filteredGider) {
    const catId = row[2]
    const cat = getCategoryById(catId)
    if (!expenseByCategory[catId]) {
      expenseByCategory[catId] = {
        name: cat?.name ?? row[3] ?? catId,
        color: cat?.color ?? "#6366f1",
        total: 0,
      }
    }
    expenseByCategory[catId].total += parseFloat(row[5]) || 0
  }

  // ─── Expense by category per business ───────────────────────────────────────
  // Giderler tablosundaki kayıtları işletmeye göre grupla
  // Giderler columns: id | gelirKayitId | categoryId | categoryName | description | amount | ...
  // GunlukGelir columns: id(0) | tarih(1) | isletme(2) | ...
  const gelirIdToBiz: Record<string, string> = {}
  for (const row of filtered) {
    gelirIdToBiz[row[0]] = row[2]
  }

  const expenseByCategoryPerBusiness: Record<string, Record<string, { name: string; color: string; total: number }>> = {}
  for (const bizId of BUSINESSES.map((b) => b.id)) {
    expenseByCategoryPerBusiness[bizId] = {}
  }

  for (const row of filteredGider) {
    const bizId = gelirIdToBiz[row[1]]
    if (!bizId) continue
    const catId = row[2]
    const cat = getCategoryById(catId)
    if (!expenseByCategoryPerBusiness[bizId]) expenseByCategoryPerBusiness[bizId] = {}
    if (!expenseByCategoryPerBusiness[bizId][catId]) {
      expenseByCategoryPerBusiness[bizId][catId] = {
        name: cat?.name ?? row[3] ?? catId,
        color: cat?.color ?? "#6366f1",
        total: 0,
      }
    }
    expenseByCategoryPerBusiness[bizId][catId].total += parseFloat(row[5]) || 0
  }

  const expenseByCategoryPerBusinessArray = Object.fromEntries(
    Object.entries(expenseByCategoryPerBusiness).map(([bizId, cats]) => [
      bizId,
      Object.values(cats).sort((a, b) => b.total - a.total),
    ])
  )

  // ─── Daily trend ──────────────────────────────────────────────────────────────
  const dailyTrend: Record<string, { date: string; income: number; expense: number }> = {}
  for (const row of filtered) {
    const dateKey = row[1]
    if (!dailyTrend[dateKey]) {
      dailyTrend[dateKey] = { date: dateKey, income: 0, expense: 0 }
    }
    dailyTrend[dateKey].income += parseFloat(row[6]) || 0
    dailyTrend[dateKey].expense += parseFloat(row[7]) || 0
  }

  // ─── Monthly trend (last 12 months) ──────────────────────────────────────────
  const monthlyTrend: Record<string, { month: string; income: number; expense: number }> = {}
  for (const row of gelirRows) {
    if (!row[1]) continue
    const month = row[1].slice(0, 7) // YYYY-MM
    if (!monthlyTrend[month]) {
      monthlyTrend[month] = { month, income: 0, expense: 0 }
    }
    monthlyTrend[month].income += parseFloat(row[6]) || 0
    monthlyTrend[month].expense += parseFloat(row[7]) || 0
  }

  // ─── Meal summary ─────────────────────────────────────────────────────────────
  const filteredYemek = yemekRows.filter((r) => {
    if (!r[1] || r[1] < fromDate || r[1] > toDate) return false
    if (businessId && r[2] !== businessId) return false
    return true
  })
  const mealQuantity = filteredYemek.reduce((s, r) => s + (parseInt(r[3]) || 0), 0)
  const mealTotal = filteredYemek.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0)

  // ─── Previous period comparison ──────────────────────────────────────────────
  const prevFiltered = gelirRows.filter((r) => r[1] >= prevFromDate && r[1] <= prevToDate)
  const prevIncome = prevFiltered.reduce((s, r) => s + (parseFloat(r[6]) || 0), 0)
  const prevExpense = prevFiltered.reduce((s, r) => s + (parseFloat(r[7]) || 0), 0)

  function pctChange(current: number, prev: number): number | null {
    if (prev === 0) return null
    return Math.round(((current - prev) / prev) * 1000) / 10
  }

  const comparison = {
    prevIncome,
    prevExpense,
    prevNet: prevIncome - prevExpense,
    prevFromDate,
    prevToDate,
    incomeChange: pctChange(totalIncome, prevIncome),
    expenseChange: pctChange(totalExpense, prevExpense),
    netChange: pctChange(totalIncome - totalExpense, prevIncome - prevExpense),
  }

  // ─── Missing days (last 7 days) ───────────────────────────────────────────────
  const bizIds = businessId ? [businessId] : BUSINESSES.map((b) => b.id)
  const gelirKeys = new Set(gelirRows.map((r) => `${r[2]}_${r[1]}`))
  const missingDays: { businessName: string; date: string }[] = []

  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]

    for (const bizId of bizIds) {
      if (!gelirKeys.has(`${bizId}_${dateStr}`)) {
        missingDays.push({ businessName: getBusinessName(bizId), date: dateStr })
      }
    }
  }

  return NextResponse.json({
    summary: { totalIncome, totalExpense, netAmount: totalIncome - totalExpense, cashIncome, cardIncome, ticketIncome },
    comparison,
    businessSummary: Object.values(businessSummary),
    expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
    expenseByCategoryPerBusiness: expenseByCategoryPerBusinessArray,
    dailyTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date)),
    monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    mealSummary: { totalQuantity: mealQuantity, totalPrice: mealTotal, orderCount: filteredYemek.length },
    missingDays: missingDays.slice(0, 10),
    period,
    fromDate,
    toDate,
  })
}
