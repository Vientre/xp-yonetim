/**
 * Weekly payroll API
 *
 * GET  ?weekStart=YYYY-MM-DD&businessId=...
 * POST { weekStart, employeeName, amount, paymentMethod, note, businessId? }
 *
 * Pay period is Monday-Sunday. Payments are kept as an append-only ledger in
 * the MaasOdemeleri sheet so partial payments and an audit trail are preserved.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth-utils"
import {
  appendRow,
  ensureTab,
  generateId,
  getRows,
  getRowsBatch,
  settingsFromRows,
} from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"
import {
  addIsoDays,
  calculatePay,
  isCompletedPayrollWeek,
  isMondayIso,
  roundMoney,
} from "@/lib/payroll"

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const paymentSchema = z.object({
  weekStart: z.string().regex(isoDate),
  employeeName: z.string().trim().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["nakit", "banka"]),
  note: z.string().trim().max(300).optional().default(""),
  businessId: z.string().optional(),
})

type PayrollRecord = {
  date: string
  business: string
  hours: number
  meal: number
  tip: number
  deduction: number
  overtime: number
  repair: number
  notes: string
}

type EmployeePayroll = {
  name: string
  businesses: Set<string>
  days: number
  totalHours: number
  totalMeal: number
  totalTip: number
  totalDeduction: number
  totalOvertime: number
  totalRepair: number
  hourlyRate: number
  overtimeMultiplier: number
  records: PayrollRecord[]
}

async function calculatePayroll(weekStart: string, businessId?: string | null) {
  const weekEnd = addIsoDays(weekStart, 6)
  const [requiredRows, paymentRows] = await Promise.all([
    getRowsBatch([TABS.ATTENDANCE, TABS.SETTINGS, TABS.EMPLOYEES] as const),
    getRows(TABS.PAYROLL_PAYMENTS).catch(() => [] as string[][]),
  ])
  const attendanceRows = requiredRows[TABS.ATTENDANCE]
  const settings = settingsFromRows(requiredRows[TABS.SETTINGS])
  const employeeRows = requiredRows[TABS.EMPLOYEES]

  const defaultHourlyRate = parseFloat(settings.saatlikUcret || "100")
  const employeeRates = new Map<string, { hourlyRate: number; overtimeMultiplier: number }>()
  for (const row of employeeRows) {
    const name = (row[1] ?? "").trim().toLocaleLowerCase("tr-TR")
    if (!name) continue
    employeeRates.set(name, {
      hourlyRate: parseFloat(row[4] || "0") || defaultHourlyRate,
      overtimeMultiplier: parseFloat(row[5] || "2") || 2,
    })
  }

  const map = new Map<string, EmployeePayroll>()
  for (const row of attendanceRows) {
    const date = row[1] ?? ""
    if (!row[0] || date < weekStart || date > weekEnd) continue
    if (businessId && row[3] !== businessId) continue

    const name = (row[2] ?? "?").trim()
    const key = name.toLocaleLowerCase("tr-TR")
    const rate = employeeRates.get(key) ?? {
      hourlyRate: defaultHourlyRate,
      overtimeMultiplier: 2,
    }
    const current = map.get(key) ?? {
      name,
      businesses: new Set<string>(),
      days: 0,
      totalHours: 0,
      totalMeal: 0,
      totalTip: 0,
      totalDeduction: 0,
      totalOvertime: 0,
      totalRepair: 0,
      hourlyRate: rate.hourlyRate,
      overtimeMultiplier: rate.overtimeMultiplier,
      records: [],
    }

    const hours = parseFloat(row[4] || "0")
    const meal = parseFloat(row[5] || "0")
    const tip = parseFloat(row[6] || "0")
    const deduction = parseFloat(row[7] || "0")
    const overtime = parseFloat(row[12] || "0")
    const repair = parseFloat(row[13] || "0")
    current.days += 1
    current.businesses.add(row[3] ?? "")
    current.totalHours += hours
    current.totalMeal += meal
    current.totalTip += tip
    current.totalDeduction += deduction
    current.totalOvertime += overtime
    current.totalRepair += repair
    current.records.push({
      date,
      business: getBusinessName(row[3] ?? ""),
      hours,
      meal,
      tip,
      deduction,
      overtime,
      repair,
      notes: row[8] ?? "",
    })
    map.set(key, current)
  }

  const paidByEmployee = new Map<string, number>()
  for (const row of paymentRows) {
    if (row[1] !== weekStart) continue
    if (businessId && row[4] && row[4] !== businessId) continue
    const key = (row[3] ?? "").trim().toLocaleLowerCase("tr-TR")
    paidByEmployee.set(key, (paidByEmployee.get(key) ?? 0) + parseFloat(row[5] || "0"))
  }

  const employees = Array.from(map.entries()).map(([key, employee]) => {
    const pay = calculatePay({
      hours: employee.totalHours,
      overtimeHours: employee.totalOvertime,
      hourlyRate: employee.hourlyRate,
      overtimeMultiplier: employee.overtimeMultiplier,
      meal: employee.totalMeal,
      repair: employee.totalRepair,
      tip: employee.totalTip,
      deduction: employee.totalDeduction,
      paidAmount: paidByEmployee.get(key) ?? 0,
    })

    return {
      name: employee.name,
      businesses: Array.from(employee.businesses).filter(Boolean).map(getBusinessName),
      days: employee.days,
      totalHours: Math.round(employee.totalHours * 10) / 10,
      hourlyRate: employee.hourlyRate,
      basePay: pay.basePay,
      totalOvertime: Math.round(employee.totalOvertime * 10) / 10,
      overtimeMultiplier: employee.overtimeMultiplier,
      overtimePay: pay.overtimePay,
      totalMeal: roundMoney(employee.totalMeal),
      totalRepair: roundMoney(employee.totalRepair),
      totalTip: roundMoney(employee.totalTip),
      totalDeduction: roundMoney(employee.totalDeduction),
      netPay: pay.netPay,
      paidAmount: pay.paidAmount,
      remainingAmount: pay.remainingAmount,
      status: pay.status,
      records: employee.records.sort((a, b) => a.date.localeCompare(b.date)),
    }
  }).sort((a, b) => b.remainingAmount - a.remainingAmount)

  const totals = {
    employees: employees.length,
    totalHours: Math.round(employees.reduce((sum, item) => sum + item.totalHours, 0) * 10) / 10,
    netPay: roundMoney(employees.reduce((sum, item) => sum + item.netPay, 0)),
    paidAmount: roundMoney(employees.reduce((sum, item) => sum + item.paidAmount, 0)),
    remainingAmount: roundMoney(employees.reduce((sum, item) => sum + item.remainingAmount, 0)),
  }

  return {
    weekStart,
    weekEnd,
    paymentDate: addIsoDays(weekEnd, 1),
    defaultHourlyRate,
    employees,
    totals,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })
  }

  const weekStart = req.nextUrl.searchParams.get("weekStart") ?? ""
  if (!isMondayIso(weekStart)) {
    return NextResponse.json({ error: "Hafta başlangıcı Pazartesi olmalıdır" }, { status: 400 })
  }

  const businessId = req.nextUrl.searchParams.get("businessId")
  return NextResponse.json(await calculatePayroll(weekStart, businessId))
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })
  }

  const parsed = paymentSchema.safeParse(await req.json())
  if (!parsed.success || !isMondayIso(parsed.data?.weekStart ?? "")) {
    return NextResponse.json({ error: "Geçersiz ödeme bilgisi" }, { status: 400 })
  }

  const { weekStart, employeeName, amount, paymentMethod, note, businessId } = parsed.data
  if (businessId) {
    return NextResponse.json(
      { error: "Ödemeyi Tüm İşletmeler görünümünden kaydedin" },
      { status: 400 }
    )
  }
  const todayInIstanbul = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  if (!isCompletedPayrollWeek(weekStart, todayInIstanbul)) {
    return NextResponse.json(
      { error: "Yalnızca tamamlanmış haftalar için ödeme kaydedilebilir" },
      { status: 400 }
    )
  }
  const payroll = await calculatePayroll(weekStart, businessId)
  const employee = payroll.employees.find(
    (item) => item.name.toLocaleLowerCase("tr-TR") === employeeName.toLocaleLowerCase("tr-TR")
  )
  if (!employee) {
    return NextResponse.json({ error: "Personel veya puantaj kaydı bulunamadı" }, { status: 404 })
  }
  if (amount > employee.remainingAmount + 0.001) {
    return NextResponse.json(
      { error: `Ödeme kalan ${employee.remainingAmount.toFixed(2)} ₺ tutarını aşamaz` },
      { status: 400 }
    )
  }

  const id = generateId()
  const paidAt = new Date().toISOString()
  try {
    await ensureTab(TABS.PAYROLL_PAYMENTS, [
      "id",
      "haftaBaslangic",
      "haftaBitis",
      "personelAdi",
      "isletme",
      "tutar",
      "odemeYontemi",
      "not",
      "odemeTarihi",
      "kaydedenId",
      "kaydedenAd",
      "haftalikNet",
      "saatlikUcret",
      "normalSaat",
      "mesaiSaat",
    ])
    await appendRow(TABS.PAYROLL_PAYMENTS, [
      id,
      weekStart,
      payroll.weekEnd,
      employee.name,
      businessId ?? "",
      amount,
      paymentMethod,
      note,
      paidAt,
      user.id,
      user.name,
      employee.netPay,
      employee.hourlyRate,
      employee.totalHours,
      employee.totalOvertime,
    ])
  } catch {
    return NextResponse.json(
      { error: "MaasOdemeleri Sheet sekmesi oluşturulamadı veya yazılamadı" },
      { status: 503 }
    )
  }

  return NextResponse.json({ id, paidAt, amount }, { status: 201 })
}
