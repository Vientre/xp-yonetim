/**
 * Vercel Cron — Daily Summary
 * Schedule: 30 23 * * * (UTC) = 02:30 Turkey (UTC+3)
 *
 * Fetches today's GunlukGelir rows, groups by business, and sends a
 * summary Telegram message.
 *
 * Vercel automatically adds: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { getRows } from "@/lib/sheets"
import { TABS, BUSINESSES, getBusinessName } from "@/lib/constants"
import { sendTelegramMessage, tl, trDate } from "@/lib/telegram"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // "Today" in Turkey time — at 23:30 UTC this is the current UTC date,
  // which matches the business day that just ended in Turkey.
  const now = new Date()
  const todayUTC = now.toISOString().split("T")[0]

  // Fetch income rows
  const gelirRows = await getRows(TABS.DAILY_INCOME)

  // Filter to today only
  const todayRows = gelirRows.filter((r) => r[1] === todayUTC)

  // Group by business
  const byBusiness: Record<string, { income: number; expense: number; net: number }> = {}
  for (const row of todayRows) {
    const bizId = row[2]
    if (!byBusiness[bizId]) byBusiness[bizId] = { income: 0, expense: 0, net: 0 }
    byBusiness[bizId].income += parseFloat(row[6]) || 0
    byBusiness[bizId].expense += parseFloat(row[7]) || 0
    byBusiness[bizId].net += parseFloat(row[8]) || 0
  }

  // Calculate totals
  let totalIncome = 0, totalExpense = 0, totalNet = 0
  for (const v of Object.values(byBusiness)) {
    totalIncome += v.income
    totalExpense += v.expense
    totalNet += v.net
  }

  // Build lines per business
  const businessLines = BUSINESSES.map((biz) => {
    const data = byBusiness[biz.id]
    if (!data) {
      return `⚠️ <b>${biz.name}</b>\n  Kayıt yok`
    }
    const netIcon = data.net >= 0 ? "📈" : "📉"
    return [
      `🏢 <b>${biz.name}</b>`,
      `  💚 Gelir: ${tl(data.income)}`,
      `  💸 Gider: ${tl(data.expense)}`,
      `  ${netIcon} Net: <b>${tl(data.net)}</b>`,
    ].join("\n")
  })

  const recordedCount = Object.keys(byBusiness).length
  const missingCount = BUSINESSES.length - recordedCount

  const message = [
    `🌙 <b>Günlük Özet — ${trDate(todayUTC)}</b>`,
    ``,
    ...businessLines.map((l, i) => (i < businessLines.length - 1 ? l + "\n" : l)),
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📊 <b>TOPLAM (${recordedCount}/${BUSINESSES.length} işletme)</b>`,
    `💚 Gelir: <b>${tl(totalIncome)}</b>`,
    `💸 Gider: <b>${tl(totalExpense)}</b>`,
    `${totalNet >= 0 ? "📈" : "📉"} Net: <b>${tl(totalNet)}</b>`,
    missingCount > 0
      ? `\n⚠️ <i>${missingCount} işletmede kayıt girilmedi.</i>`
      : `\n✅ <i>Tüm işletmelerin kaydı girildi.</i>`,
  ].join("\n")

  await sendTelegramMessage(message)

  return NextResponse.json({
    ok: true,
    date: todayUTC,
    businesses: recordedCount,
    totalIncome,
    totalExpense,
    totalNet,
  })
}
