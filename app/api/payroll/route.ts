/**
 * Payroll API
 * GET ?month=YYYY-MM&businessId=...
 * Returns per-employee summary for the given month from Puantaj tab.
 *
 * Puantaj columns:
 * id | tarih | personelAdi | isletme | saat | yemek | tip | kesinti | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi | mesai
 * 0  |   1   |      2     |    3    |   4  |   5   |  6  |    7    |    8   |      9      |      10      |       11        |  12
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, getSettings } from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month = searchParams.get("month") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const businessId = searchParams.get("businessId")

  const [rows, settings] = await Promise.all([
    getRows(TABS.ATTENDANCE),
    getSettings(),
  ])

  const saatlikUcret = parseFloat(settings.saatlikUcret ?? "100")

  let filtered = rows.filter((r) => {
    if (!r[0] || !r[1]) return false
    if (!r[1].startsWith(month)) return false
    if (businessId && r[3] !== businessId) return false
    return true
  })

  // Group by employee name
  const map: Record<string, {
    name: string
    businesses: Set<string>
    days: number
    totalHours: number
    totalMeal: number
    totalTip: number
    totalDeduction: number
    totalMesai: number
    records: Array<{ date: string; business: string; hours: number; meal: number; tip: number; deduction: number; mesai: number; notes: string }>
  }> = {}

  for (const row of filtered) {
    const name = row[2] ?? "?"
    if (!map[name]) {
      map[name] = { name, businesses: new Set(), days: 0, totalHours: 0, totalMeal: 0, totalTip: 0, totalDeduction: 0, totalMesai: 0, records: [] }
    }
    map[name].days += 1
    map[name].businesses.add(row[3] ?? "")
    map[name].totalHours += parseFloat(row[4] || "0")
    map[name].totalMeal += parseFloat(row[5] || "0")
    map[name].totalTip += parseFloat(row[6] || "0")
    map[name].totalDeduction += parseFloat(row[7] || "0")
    map[name].totalMesai += parseFloat(row[12] || "0")
    map[name].records.push({
      date: row[1],
      business: getBusinessName(row[3] ?? ""),
      hours: parseFloat(row[4] || "0"),
      meal: parseFloat(row[5] || "0"),
      tip: parseFloat(row[6] || "0"),
      deduction: parseFloat(row[7] || "0"),
      mesai: parseFloat(row[12] || "0"),
      notes: row[8] ?? "",
    })
  }

  const employees = Object.values(map).map((e) => {
    const basePay = Math.round(e.totalHours * saatlikUcret * 100) / 100
    const mesaiOdeme = Math.round(e.totalMesai * saatlikUcret * 2 * 100) / 100
    const netPay = Math.round((basePay + mesaiOdeme + e.totalTip - e.totalDeduction) * 100) / 100
    return {
      name: e.name,
      businesses: Array.from(e.businesses).filter(Boolean).map(getBusinessName),
      days: e.days,
      totalHours: Math.round(e.totalHours * 10) / 10,
      basePay,
      totalMesai: Math.round(e.totalMesai * 10) / 10,
      mesaiOdeme,
      totalMeal: Math.round(e.totalMeal * 100) / 100,
      totalTip: Math.round(e.totalTip * 100) / 100,
      totalDeduction: Math.round(e.totalDeduction * 100) / 100,
      netPay,
      records: e.records.sort((a, b) => a.date.localeCompare(b.date)),
    }
  }).sort((a, b) => b.totalHours - a.totalHours)

  const totals = {
    days: employees.reduce((s, e) => s + e.days, 0),
    totalHours: Math.round(employees.reduce((s, e) => s + e.totalHours, 0) * 10) / 10,
    basePay: Math.round(employees.reduce((s, e) => s + e.basePay, 0) * 100) / 100,
    totalMesai: Math.round(employees.reduce((s, e) => s + e.totalMesai, 0) * 10) / 10,
    mesaiOdeme: Math.round(employees.reduce((s, e) => s + e.mesaiOdeme, 0) * 100) / 100,
    totalMeal: Math.round(employees.reduce((s, e) => s + e.totalMeal, 0) * 100) / 100,
    totalTip: Math.round(employees.reduce((s, e) => s + e.totalTip, 0) * 100) / 100,
    totalDeduction: Math.round(employees.reduce((s, e) => s + e.totalDeduction, 0) * 100) / 100,
    netPay: Math.round(employees.reduce((s, e) => s + e.netPay, 0) * 100) / 100,
  }

  return NextResponse.json({ employees, totals, saatlikUcret, month })
}
