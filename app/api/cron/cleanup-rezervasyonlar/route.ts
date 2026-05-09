/**
 * Vercel Cron — Rezervasyon Temizlik
 * Schedule: 0 1 1 * * (UTC) = 04:00 Turkey, ayın 1'i
 *
 * Bir önceki ay (ve daha eski) tarihli tüm rezervasyonları (silinmiş veya
 * aktif) fiziksel olarak siler.
 */

import { NextRequest, NextResponse } from "next/server"
import { getRows, deleteRowsByIndices } from "@/lib/sheets"
import { TABS } from "@/lib/constants"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Istanbul'a göre içinde bulunduğumuz ayı belirle
  const nowIstanbul = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const currentYearMonth = nowIstanbul.toISOString().slice(0, 7) // YYYY-MM

  const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])

  const indicesToDelete: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const tarih = rows[i][1] ?? ""
    const yearMonth = tarih.slice(0, 7)
    if (yearMonth && yearMonth < currentYearMonth) {
      indicesToDelete.push(i)
    }
  }

  if (indicesToDelete.length > 0) {
    await deleteRowsByIndices(TABS.RESERVATIONS, indicesToDelete)
  }

  return NextResponse.json({
    ok: true,
    currentMonth: currentYearMonth,
    deleted: indicesToDelete.length,
  })
}
