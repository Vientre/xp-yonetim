/**
 * Reports API
 * ?type=income  → gelir-gider raporu
 * ?type=payroll → personel saat/ödeme özeti
 * ?type=meals   → yemek siparişi özeti
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, getSettings } from "@/lib/sheets"
import { TABS, getCategoryById, getBusinessName } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "income"
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const businessId = searchParams.get("businessId")

  // ── GELİR GİDER ─────────────────────────────────────────────────────────────
  if (type === "income") {
    const [gelirRows, giderRows] = await Promise.all([
      getRows(TABS.DAILY_INCOME),
      getRows(TABS.EXPENSES),
    ])

    let filtered = gelirRows.filter((r) => {
      if (!r[0]) return false
      if (from && r[1] < from) return false
      if (to && r[1] > to) return false
      if (businessId && r[2] !== businessId) return false
      return true
    })

    const data = filtered.map((row) => {
      const expenses = giderRows
        .filter((g) => g[1] === row[0])
        .map((g) => ({
          category: getCategoryById(g[2])?.name ?? g[3] ?? g[2],
          description: g[4],
          amount: parseFloat(g[5] || "0"),
        }))

      return {
        id: row[0],
        date: row[1],
        businessId: row[2],
        business: { id: row[2], name: getBusinessName(row[2]) },
        cashIncome: parseFloat(row[3] || "0"),
        cardIncome: parseFloat(row[4] || "0"),
        ticketIncome: parseFloat(row[5] || "0"),
        totalIncome: parseFloat(row[6] || "0"),
        totalExpense: parseFloat(row[7] || "0"),
        netAmount: parseFloat(row[8] || "0"),
        notes: row[9] ?? "",
        enteredBy: row[11] ?? "",
        expenses,
      }
    })

    const totalIncome = data.reduce((s, r) => s + r.totalIncome, 0)
    const totalExpense = data.reduce((s, r) => s + r.totalExpense, 0)

    return NextResponse.json({
      data,
      summary: { totalIncome, totalExpense, netAmount: totalIncome - totalExpense },
    })
  }

  // ── PERSONEL ─────────────────────────────────────────────────────────────────
  if (type === "payroll") {
    const [rows, settings] = await Promise.all([
      getRows(TABS.ATTENDANCE),
      getSettings(),
    ])

    const saatlikUcret = parseFloat(settings.saatlikUcret ?? "100")

    let filtered = rows.filter((r) => {
      if (!r[0]) return false
      if (from && r[1] < from) return false
      if (to && r[1] > to) return false
      if (businessId && r[3] !== businessId) return false
      return true
    })

    // Personel bazında grupla
    const map: Record<string, {
      name: string; days: number; totalHours: number
      totalMeal: number; totalTip: number; totalDeduction: number; totalPay: number
    }> = {}

    for (const row of filtered) {
      const name = row[2] ?? "?"
      if (!map[name]) map[name] = { name, days: 0, totalHours: 0, totalMeal: 0, totalTip: 0, totalDeduction: 0, totalPay: 0 }
      map[name].days += 1
      map[name].totalHours += parseFloat(row[4] || "0")
      map[name].totalMeal += parseFloat(row[5] || "0")
      map[name].totalTip += parseFloat(row[6] || "0")
      map[name].totalDeduction += parseFloat(row[7] || "0")
    }

    // Saatlik ücret üzerinden toplam maaş hesapla
    for (const emp of Object.values(map)) {
      emp.totalPay = emp.totalHours * saatlikUcret
    }

    const summary = Object.values(map).sort((a, b) => b.totalHours - a.totalHours)

    return NextResponse.json({ summary, count: filtered.length, saatlikUcret })
  }

  // ── YEMEK ────────────────────────────────────────────────────────────────────
  if (type === "meals") {
    const rows = await getRows(TABS.MEALS)

    let filtered = rows.filter((r) => {
      if (!r[0]) return false
      if (from && r[1] < from) return false
      if (to && r[1] > to) return false
      if (businessId && r[2] !== businessId) return false
      return true
    })

    const data = filtered.map((row) => ({
      id: row[0],
      date: row[1],
      businessId: row[2],
      business: { id: row[2], name: getBusinessName(row[2]) },
      count: parseInt(row[3] || "0"),
      pricePerMeal: parseFloat(row[4] || "0"),
      totalCost: parseFloat(row[5] || "0"),
      enteredBy: row[7] ?? "",
    }))

    const totalQty = data.reduce((s, r) => s + r.count, 0)
    const totalPrice = data.reduce((s, r) => s + r.totalCost, 0)

    return NextResponse.json({
      data,
      summary: { totalQty, totalPrice, orderCount: data.length },
    })
  }

  return NextResponse.json({ error: "Geçersiz tip" }, { status: 400 })
}
