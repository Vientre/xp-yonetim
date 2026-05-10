/**
 * CallMeBot WhatsApp utility — free WhatsApp messaging via api.callmebot.com
 *
 * Required env vars:
 *   CALLMEBOT_PHONE   — your WhatsApp phone (with country code, no +) — e.g. "905321234567"
 *   CALLMEBOT_API_KEY — API key returned by the bot (or group key for groups)
 *
 * Setup için: README'de talimat var; özetle bot'a (+34 644 51 95 23)
 *   - Kişisel: "I allow callmebot to send me messages" yazıp API key alınır
 *   - Grup: bot'u gruba ekle, davet linkini kişisel olarak gönder, grup API key'i alınır
 */

const PHONE = () => process.env.CALLMEBOT_PHONE
const API_KEY = () => process.env.CALLMEBOT_API_KEY

/**
 * Send a WhatsApp message via CallMeBot.
 * Silently no-ops if env vars are not configured.
 * Never throws — errors are logged, request is unaffected.
 *
 * WhatsApp formatting: *bold*, _italic_, ~strikethrough~, ```mono```
 */
export async function sendWhatsAppMessage(text: string): Promise<void> {
  const phone = PHONE()
  const apiKey = API_KEY()
  if (!phone || !apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[WhatsApp] skipped (env not set):", text)
    }
    return
  }

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apiKey)}`

  try {
    // CallMeBot can be slow (~2s); cap at 8s so we don't hang the request
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, { method: "GET", signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[WhatsApp] failed:", res.status, body.slice(0, 200))
    }
  } catch (e) {
    console.error("[WhatsApp] error:", e)
  }
}
