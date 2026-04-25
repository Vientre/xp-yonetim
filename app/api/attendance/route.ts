/**
 * Attendance (Puantaj) API
 *
 * Google Sheet: "Puantaj" tab
 * Columns: id | tarih | personelAdi | isletme | saat | yemek | tip | kesinti | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi | mesai
 * Index:   0  |   1   |      2     |    3    |   4  |   5   |  6  |    7    |    8   |      9      |      10      |       11        |  12
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, hasBusinessAccess, getAccessibleBusinessIds } from "@/lib/auth-utils"
import { getRows, appendRow, generateId, deleteRowsByIndices } from "@/lib/sheets"
import { TABS, getBusinessName } from "@/lib/constants"
import { z } from "zod"

const attendanceSchema = z.object({
  businessId: z.string().min(1),
  date: z.string().min(1),
  employeeName: z.string().min(1),
  hoursWorked: z.number().min(0).max(24),
  mealAmount: z.number().min(0).default(0),
  tipAmount: z.number().min(0).default(0),
  deductionAmount: z.number().min(0).default(0),
  mesai: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const month = searchParams.get("month")

  const accessibleIds = getAccessibleBusinessIds(user)
  const rows = await getRows(TABS.ATTENDANCE)

  let entries = rows.map((row) => ({
    id: row[0] ?? "",
    date: row[1] ?? "",
    employeeName: row[2] ?? "",
    businessId: row[3] ?? "",
    business: { id: row[3] ?? "", name: getBusinessName(row[3] ?? "") },
    hoursWorked: parseFloat(row[4] || "0"),
    mealAmount: parseFloat(row[5] || "0"),
    tipAmount: parseFloat(row[6] || "0"),
    deductionAmount: parseFloat(row[7] || "0"),
    notes: row[8] ?? "",
    enteredById: row[9] ?? "",
    enteredBy: { name: row[10] ?? "" },
    createdAt: row[11] ?? "",
    mesai: parseFloat(row[12] || "0"),
  }))

  entries = entries.filter((e) => accessibleIds.includes(e.businessId))
  if (businessId) entries = entries.filter((e) => e.businessId === businessId)
  if (month) entries = entries.filter((e) => e.date.startsWith(month))

  return NextResponse.json(entries.sort((a, b) => b.date.localeCompare(a.date)))
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = attendanceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { businessId, date, employeeName, hoursWorked, mealAmount, tipAmount, deductionAmount, mesai, notes } = parsed.data

  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const id = generateId()
  const createdAt = new Date().toISOString()

  await appendRow(TABS.ATTENDANCE, [
    id, date, employeeName, businessId,
    hoursWorked, mealAmount, tipAmount, deductionAmount,
    notes ?? "", user.id, user.name, createdAt, mesai,
  ])

  return NextResponse.json(
    {
      id, date, employeeName, businessId,
      business: { id: businessId, name: getBusinessName(businessId) },
      hoursWorked, mealAmount, tipAmount, deductionAmount, mesai,
      notes: notes ?? "",
      enteredBy: { name: user.name }, createdAt,
    },
    { status: 201 }
  )
}

// DELETE /api/attendance?businessId=X&month=YYYY-MM  → toplu sil
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const month = searchParams.get("month")

  if (!businessId || !month) {
    return NextResponse.json({ error: "businessId ve month gerekli" }, { status: 400 })
  }

  if (!hasBusinessAccess(user, businessId)) {
    return NextResponse.json({ error: "Bu işletmeye erişim yok" }, { status: 403 })
  }

  const rows = await getRows(TABS.ATTENDANCE)
  const indices: number[] = []
  rows.forEach((row, i) => {
    if (row[3] === businessId && (row[1] ?? "").startsWith(month)) {
      indices.push(i)
    }
  })

  if (indices.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  await deleteRowsByIndices(TABS.ATTENDANCE, indices)
  return NextResponse.json({ deleted: indices.length })
}
