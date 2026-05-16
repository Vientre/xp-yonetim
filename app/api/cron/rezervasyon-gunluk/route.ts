/**
 * Vercel Cron — Sabah Brifing (Gelir Özeti + Rezervasyon Listesi)
 * Schedule: 0 6 * * * (UTC) = 09:00 İstanbul
 *
 * 2 WhatsApp mesajı gönderir:
 *   1) Dünkü gelir/gider özeti (her işletme bazında)
 *   2) Bugün için aktif rezervasyon listesi (wa.me linkleriyle)
 *
 * Rezervasyon yoksa 2. mesaj atlanır, sadece özet gider.
 * Dün hiç kayıt girilmediyse de uyarıyla beraber özet yine gider.
 *
 * Vercel cron secret kontrolü: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { getRows } from "@/lib/sheets"
import { TABS, BUSINESSES, getBusinessName } from "@/lib/constants"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export const runtime = "nodejs"

const TR_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]

function isTruthyFlag(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true"
}

function parseInt0(v: string | undefined): number {
  const n = parseInt((v ?? "").trim(), 10)
  return isNaN(n) ? 0 : n
}

function addMinutesToHHmm(hhmm: string, minutes: number): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return ""
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + minutes
  const eh = Math.floor(total / 60) % 24
  const em = ((total % 60) + 60) % 60
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
}

function formatSureLabel(min: number): string {
  if (min === 30) return "yarım saat"
  if (min === 60) return "1 saat"
  return `${min} dk`
}

function trDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function tl(n: number): string {
  return "₺" + new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function normalizePhoneForWa(s: string): string {
  const digits = (s ?? "").replace(/\D/g, "")
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits
  if (digits.length === 11 && digits.startsWith("05")) return "90" + digits.slice(1)
  if (digits.length === 12 && digits.startsWith("90")) return digits
  return digits
}

// ─── Dünkü gelir/gider özet mesajını üret ────────────────────────────────────
function buildSummaryMessage(yesterdayIso: string, gelirRows: string[][]): string {
  const yesterdayRows = gelirRows.filter((r) => r[1] === yesterdayIso)

  const byBusiness: Record<string, { income: number; expense: number; net: number }> = {}
  for (const row of yesterdayRows) {
    const bizId = row[2]
    if (!byBusiness[bizId]) byBusiness[bizId] = { income: 0, expense: 0, net: 0 }
    byBusiness[bizId].income += parseFloat(row[6]) || 0
    byBusiness[bizId].expense += parseFloat(row[7]) || 0
    byBusiness[bizId].net += parseFloat(row[8]) || 0
  }

  let totalIncome = 0, totalExpense = 0, totalNet = 0
  for (const v of Object.values(byBusiness)) {
    totalIncome += v.income
    totalExpense += v.expense
    totalNet += v.net
  }

  const businessLines = BUSINESSES.map((biz) => {
    const data = byBusiness[biz.id]
    if (!data) return `⚠️ *${biz.name}*\n  Kayıt yok`
    const netIcon = data.net >= 0 ? "📈" : "📉"
    return [
      `🏢 *${biz.name}*`,
      `  💚 Gelir: ${tl(data.income)}`,
      `  💸 Gider: ${tl(data.expense)}`,
      `  ${netIcon} Net: *${tl(data.net)}*`,
    ].join("\n")
  })

  const recordedCount = Object.keys(byBusiness).length
  const missingCount = BUSINESSES.length - recordedCount

  return [
    `🌅 *DÜNKÜ ÖZET — ${trDate(yesterdayIso)}*`,
    ``,
    ...businessLines.map((l, i) => (i < businessLines.length - 1 ? l + "\n" : l)),
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📊 *TOPLAM (${recordedCount}/${BUSINESSES.length} işletme)*`,
    `💚 Gelir: *${tl(totalIncome)}*`,
    `💸 Gider: *${tl(totalExpense)}*`,
    `${totalNet >= 0 ? "📈" : "📉"} Net: *${tl(totalNet)}*`,
    missingCount > 0
      ? `\n⚠️ _${missingCount} işletmede kayıt girilmedi._`
      : `\n✅ _Tüm işletmelerin kaydı girildi._`,
  ].join("\n")
}

// ─── Bugünkü rezervasyon listesi mesajını üret ───────────────────────────────
function buildReservationsMessage(today: string, gunAd: string, rows: string[][]): string | null {
  const todaysActive = rows
    .filter((r) => r[1] === today && !isTruthyFlag(r[9]))
    .sort((a, b) => (a[3] ?? "").localeCompare(b[3] ?? ""))

  if (todaysActive.length === 0) return null

  const totalKisi = todaysActive.reduce((s, r) => s + parseInt0(r[14]), 0)
  const lines: string[] = []
  lines.push(`🔔 *BUGÜN ${trDate(today)} (${gunAd}) İÇİN REZERVASYONLAR*`)
  lines.push("")
  lines.push(`📊 ${todaysActive.length} rezervasyon · ${totalKisi} kişi`)
  lines.push("")
  lines.push("━━━━━━━━━━━━━━━━━━")

  for (const r of todaysActive) {
    const saat = r[3] ?? ""
    const telefon = r[5] ?? ""
    const not = r[4] ?? ""
    const kisi = parseInt0(r[14])
    const sure = parseInt0(r[15])
    const endSaat = sure > 0 ? addMinutesToHHmm(saat, sure + 15) : ""
    const saatRange = endSaat ? `${saat}-${endSaat}` : saat
    const sureLabel = sure > 0 ? formatSureLabel(sure) : ""
    const waPhone = normalizePhoneForWa(telefon)

    lines.push("")
    lines.push(`⏰ *${saatRange}* — ${kisi > 0 ? `${kisi} kişi` : "?"}${sureLabel ? ` · ${sureLabel}` : ""}`)
    if (telefon) {
      lines.push(`📞 ${telefon}`)
      if (waPhone) lines.push(`💬 https://wa.me/${waPhone}`)
    }
    if (not) lines.push(`📝 ${not}`)
  }

  lines.push("")
  lines.push("━━━━━━━━━━━━━━━━━━")
  lines.push("Müşterileri arayıp teyit edin 🙏")

  return lines.join("\n")
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // İstanbul'a göre bugün ve dün
  const nowIstanbul = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const today = nowIstanbul.toISOString().slice(0, 10)
  const dow = nowIstanbul.getUTCDay()
  const gunAd = TR_DAYS[dow] ?? ""
  const yesterdayIst = new Date(nowIstanbul.getTime() - 24 * 60 * 60 * 1000)
  const yesterday = yesterdayIst.toISOString().slice(0, 10)

  // Verileri paralel çek
  const [gelirRows, rezervasyonRows] = await Promise.all([
    getRows(TABS.DAILY_INCOME).catch(() => [] as string[][]),
    getRows(TABS.RESERVATIONS).catch(() => [] as string[][]),
  ])

  // 1) Dünkü gelir özeti
  const summaryMsg = buildSummaryMessage(yesterday, gelirRows)
  const summaryResult = await sendWhatsAppMessage(summaryMsg)

  // 2) Bugünkü rezervasyon listesi (varsa)
  const reservationsMsg = buildReservationsMessage(today, gunAd, rezervasyonRows)
  const reservationsResult = reservationsMsg
    ? await sendWhatsAppMessage(reservationsMsg)
    : { recipients: 0, results: [], skipped: "no-reservations" as const }

  return NextResponse.json({
    ok: true,
    today,
    yesterday,
    summary: { sent: true, result: summaryResult },
    reservations: {
      sent: reservationsMsg !== null,
      result: reservationsResult,
    },
  })
}
