/**
 * Kurs Ödeme Takip API
 *
 * Google Sheet: "KursOgrenci" tab
 * Columns: id | ad | aylikUcret | olusturmaTarihi | sinif
 * Index:   0  |  1 |     2      |       3         |   4
 *
 * Google Sheet: "KursOdeme" tab
 * Columns: id | ogrenciId | ay (YYYY-MM) | odendi | tarih
 * Index:   0  |     1     |      2       |    3   |   4
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, appendRow, updateRowByIndex, generateId } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import { z } from "zod"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }) }
  if (user.role !== "admin") return { user: null, error: NextResponse.json({ error: "Sadece yönetici erişebilir" }, { status: 403 }) }
  return { user, error: null }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const [studentRows, paymentRows] = await Promise.all([
    getRows(TABS.KURS_OGRENCI),
    getRows(TABS.KURS_ODEME),
  ])

  const students = studentRows.map((row) => {
    const id = row[0] ?? ""
    const payments: Record<string, { paid: boolean; date: string }> = {}
    for (const pr of paymentRows) {
      if (pr[1] === id) {
        payments[pr[2]] = {
          paid: pr[3] === "true",
          date: pr[4] ?? "",
        }
      }
    }
    return {
      id,
      name: row[1] ?? "",
      monthlyFee: parseFloat(row[2] || "0"),
      createdAt: row[3] ?? "",
      sinif: row[4] ?? "",
      payments,
    }
  })

  return NextResponse.json(students)
}

const addSchema = z.object({
  action: z.literal("add"),
  name: z.string().min(1),
  monthlyFee: z.number().positive(),
  sinif: z.string().optional().default(""),
})

const toggleSchema = z.object({
  action: z.literal("toggle"),
  studentId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  paid: z.boolean(),
  date: z.string().optional().default(""), // ISO date string when paid, "" when unpaid
})

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()

  // Add student
  if (body.action === "add") {
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { name, monthlyFee, sinif } = parsed.data
    const id = generateId()
    const createdAt = new Date().toISOString()
    await appendRow(TABS.KURS_OGRENCI, [id, name, monthlyFee, createdAt, sinif])
    return NextResponse.json({ id, name, monthlyFee, createdAt, sinif, payments: {} }, { status: 201 })
  }

  // Toggle payment
  if (body.action === "toggle") {
    const parsed = toggleSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { studentId, month, paid, date } = parsed.data

    const paymentRows = await getRows(TABS.KURS_ODEME)
    const existingIndex = paymentRows.findIndex((r) => r[1] === studentId && r[2] === month)

    const paymentDate = paid ? (date || new Date().toISOString().split("T")[0]) : ""

    if (existingIndex !== -1) {
      const existingId = paymentRows[existingIndex][0]
      await updateRowByIndex(TABS.KURS_ODEME, existingIndex, [
        existingId, studentId, month, String(paid), paymentDate,
      ])
    } else {
      await appendRow(TABS.KURS_ODEME, [generateId(), studentId, month, String(paid), paymentDate])
    }

    return NextResponse.json({ ok: true, studentId, month, paid, date: paymentDate })
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
