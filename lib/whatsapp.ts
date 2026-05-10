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
export type WhatsAppResult =
  | { ok: true; status: number }
  | { ok: false; reason: "no-config" | "http-error" | "exception"; status?: number; body?: string; error?: string }

export async function sendWhatsAppMessage(text: string): Promise<WhatsAppResult> {
  const phone = PHONE()
  const apiKey = API_KEY()
  if (!phone || !apiKey) {
    console.warn("[WhatsApp] skipped: CALLMEBOT_PHONE or CALLMEBOT_API_KEY not set")
    return { ok: false, reason: "no-config" }
  }

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apiKey)}`

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, { method: "GET", signal: ctrl.signal })
    clearTimeout(timer)
    const body = await res.text().catch(() => "")
    if (!res.ok) {
      console.error("[WhatsApp] HTTP failed:", res.status, body.slice(0, 300))
      return { ok: false, reason: "http-error", status: res.status, body: body.slice(0, 300) }
    }
    console.log("[WhatsApp] sent, status=", res.status)
    return { ok: true, status: res.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[WhatsApp] exception:", msg)
    return { ok: false, reason: "exception", error: msg }
  }
}
