/**
 * Vercel Cron — Günlük Hatırlatmalar
 * Schedule: 0 16 * * * (UTC) = 19:00 İstanbul
 *
 * Hatirlatmalar tab —
 * id | aktif (true/false) | tip ("gunluk"/"aylik") | isletme | baslik
 *
 * Her gün 19:00'da çalışır:
 *  - Aktif "gunluk" hatırlatmaları her zaman gönderir
 *  - Eğer bugün ayın 1'iyse, "aylik" hatırlatmaları da ekler
 * Hiç hatırlatma yoksa mesaj gönderilmez.
 */

import { NextRequest, NextResponse } from "next/server"
import { getRows } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export const runtime = "nodejs"

function isTruthyFlag(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true"
}

function trDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

type Reminder = {
  isletme: string
  baslik: string
}

function groupByIsletme(items: Reminder[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const r of items) {
    const key = r.isletme || "Genel"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r.baslik)
  }
  return groups
}

function renderGroups(groups: Map<string, string[]>): string[] {
  const lines: string[] = []
  for (const [isletme, basliklar] of groups) {
    lines.push("")
    lines.push(`🏢 *${isletme}*`)
    for (const b of basliklar) {
      lines.push(`• ${b}`)
    }
  }
  return lines
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const nowIstanbul = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const today = nowIstanbul.toISOString().slice(0, 10)
  const dayOfMonth = nowIstanbul.getUTCDate()
  const isFirstOfMonth = dayOfMonth === 1
  const ayAd = TR_MONTHS[nowIstanbul.getUTCMonth()] ?? ""

  const rows = await getRows(TABS.REMINDERS).catch(() => [] as string[][])

  const daily: Reminder[] = []
  const monthly: Reminder[] = []
  for (const r of rows) {
    if (!isTruthyFlag(r[1])) continue
    const tip = (r[2] ?? "").trim().toLowerCase()
    const isletme = r[3] ?? ""
    const baslik = r[4] ?? ""
    if (!baslik.trim()) continue
    if (tip === "gunluk") daily.push({ isletme, baslik })
    else if (tip === "aylik") monthly.push({ isletme, baslik })
  }

  const hasDaily = daily.length > 0
  const hasMonthly = isFirstOfMonth && monthly.length > 0

  if (!hasDaily && !hasMonthly) {
    return NextResponse.json({
      ok: true,
      date: today,
      skipped: "no-active-reminders",
      dailyCount: daily.length,
      monthlyCount: monthly.length,
      isFirstOfMonth,
    })
  }

  const lines: string[] = []
  lines.push(`🔔 *AKŞAM KONTROL — ${trDate(today)}*`)
  lines.push("")
  lines.push("━━━━━━━━━━━━━━━━━━")

  if (hasDaily) {
    lines.push(...renderGroups(groupByIsletme(daily)))
  }

  if (hasMonthly) {
    if (hasDaily) lines.push("")
    lines.push("━━━━━━━━━━━━━━━━━━")
    lines.push(`📅 *AY BAŞI GÖREVLERİ — ${ayAd}*`)
    lines.push(...renderGroups(groupByIsletme(monthly)))
  }

  lines.push("")
  lines.push("━━━━━━━━━━━━━━━━━━")

  const message = lines.join("\n")
  const result = await sendWhatsAppMessage(message)

  return NextResponse.json({
    ok: true,
    date: today,
    isFirstOfMonth,
    dailyCount: daily.length,
    monthlyCount: hasMonthly ? monthly.length : 0,
    whatsapp: result,
  })
}
