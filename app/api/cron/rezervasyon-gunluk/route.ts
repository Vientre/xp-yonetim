/**
 * Vercel Cron — Günlük Rezervasyon Hatırlatması
 * Schedule: 0 6 * * * (UTC) = 09:00 İstanbul
 *
 * Bugün için tüm aktif rezervasyonları WhatsApp'ta ekibe gönderir.
 * Her satırda wa.me/<phone> linki var → tıklayınca direkt müşteri WhatsApp'ı açılır.
 * Rezervasyon yoksa mesaj gönderilmez.
 *
 * Vercel cron secret kontrolü: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { getRows } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
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

function normalizePhoneForWa(s: string): string {
  // wa.me linki için: sadece rakamlar, başında ülke kodu (TR=90)
  const digits = (s ?? "").replace(/\D/g, "")
  if (digits.length === 10 && digits.startsWith("5")) {
    // 5XX XXX XXXX → 905XXXXXXXXXX
    return "90" + digits
  }
  if (digits.length === 11 && digits.startsWith("05")) {
    // 05XX XXX XXXX → 905XXXXXXXXXX
    return "90" + digits.slice(1)
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return digits
  }
  return digits
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // İstanbul'a göre bugün
  const nowIstanbul = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const today = nowIstanbul.toISOString().slice(0, 10)
  const dow = nowIstanbul.getUTCDay()
  const gunAd = TR_DAYS[dow] ?? ""

  const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])

  // Bugüne ait aktif rezervasyonlar (silinmemiş)
  const todaysActive = rows
    .filter((r) => r[1] === today && !isTruthyFlag(r[9]))
    .sort((a, b) => (a[3] ?? "").localeCompare(b[3] ?? ""))

  if (todaysActive.length === 0) {
    return NextResponse.json({
      ok: true,
      date: today,
      count: 0,
      skipped: "no-reservations",
    })
  }

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
      if (waPhone) {
        lines.push(`💬 https://wa.me/${waPhone}`)
      }
    }
    if (not) {
      lines.push(`📝 ${not}`)
    }
  }

  lines.push("")
  lines.push("━━━━━━━━━━━━━━━━━━")
  lines.push("Müşterileri arayıp teyit edin 🙏")

  const message = lines.join("\n")

  const result = await sendWhatsAppMessage(message)

  return NextResponse.json({
    ok: true,
    date: today,
    count: todaysActive.length,
    totalKisi,
    whatsapp: result,
  })
}
