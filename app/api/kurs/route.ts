/**
 * Kurs Ödeme Takip API
 *
 * KursOgrenci tab — id | ad | aylikUcret | olusturmaTarihi | sinif
 * KursOdeme tab   — id | ogrenciId | ay (YYYY-MM) | odendi | tarih
 * KursGider tab   — id | tarih (YYYY-MM-DD) | detay | tutar | olusturmaTarihi
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, appendRow, updateRowByIndex, deleteRowByIndex, generateId } from "@/lib/sheets"
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

  const [studentRows, paymentRows, expenseRows] = await Promise.all([
    getRows(TABS.KURS_OGRENCI),
    getRows(TABS.KURS_ODEME),
    // KursGider sekmesi henüz yoksa boş dizi dön (ilk gider eklenince oluşur)
    getRows(TABS.KURS_GIDER).catch(() => [] as string[][]),
  ])

  const students = studentRows.map((row) => {
    const id = row[0] ?? ""
    const payments: Record<string, { paid: boolean; date: string }> = {}
    for (const pr of paymentRows) {
      if (pr[1] === id) {
        payments[pr[2]] = { paid: pr[3] === "true", date: pr[4] ?? "" }
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

  const expenses = expenseRows
    .map((row) => ({
      id: row[0] ?? "",
      tarih: row[1] ?? "",
      detay: row[2] ?? "",
      tutar: parseFloat(row[3] || "0"),
      olusturmaTarihi: row[4] ?? "",
    }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih))

  return NextResponse.json({ students, expenses })
}

const addStudentSchema = z.object({
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
  date: z.string().optional().default(""),
})

const addExpenseSchema = z.object({
  action: z.literal("addExpense"),
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  detay: z.string().min(1),
  tutar: z.number().positive(),
})

const deleteExpenseSchema = z.object({
  action: z.literal("deleteExpense"),
  id: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()

  // ── Öğrenci ekle ──────────────────────────────────────────────────────────
  if (body.action === "add") {
    const parsed = addStudentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { name, monthlyFee, sinif } = parsed.data
    const id = generateId()
    const createdAt = new Date().toISOString()
    await appendRow(TABS.KURS_OGRENCI, [id, name, monthlyFee, createdAt, sinif])
    return NextResponse.json({ id, name, monthlyFee, createdAt, sinif, payments: {} }, { status: 201 })
  }

  // ── Ödeme toggle ─────────────────────────────────────────────────────────
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

  // ── Gider ekle ────────────────────────────────────────────────────────────
  if (body.action === "addExpense") {
    const parsed = addExpenseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { tarih, detay, tutar } = parsed.data
    const id = generateId()
    const olusturmaTarihi = new Date().toISOString()
    await appendRow(TABS.KURS_GIDER, [id, tarih, detay, tutar, olusturmaTarihi])
    return NextResponse.json({ id, tarih, detay, tutar, olusturmaTarihi }, { status: 201 })
  }

  // ── Gider sil ─────────────────────────────────────────────────────────────
  if (body.action === "deleteExpense") {
    const parsed = deleteExpenseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { id } = parsed.data

    const expenseRows = await getRows(TABS.KURS_GIDER)
    const idx = expenseRows.findIndex((r) => r[0] === id)
    if (idx === -1) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })
    await deleteRowByIndex(TABS.KURS_GIDER, idx)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
