/**
 * Telegram Bot utility
 * Sends messages via the Telegram Bot API.
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN — token from @BotFather
 *   TELEGRAM_CHAT_ID   — your personal or group chat ID
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID

/**
 * Send a plain or HTML-formatted Telegram message.
 * Silently no-ops if env vars are not configured.
 * Never throws — Telegram errors are swallowed so the main request is unaffected.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = BOT_TOKEN()
  const chatId = CHAT_ID()
  if (!token || !chatId) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error("[Telegram] sendMessage failed:", err)
    }
  } catch (e) {
    console.error("[Telegram] fetch error:", e)
  }
}

/** Format a number as Turkish Lira string (e.g. ₺1.500,00) */
export function tl(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format ISO date string as "08 Nisan 2025" in Turkish */
export function trDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    }).format(new Date(isoDate))
  } catch {
    return isoDate
  }
}
