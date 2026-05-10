/**
 * CallMeBot WhatsApp utility — free WhatsApp messaging via api.callmebot.com
 *
 * Env vars (her biri opsiyonel):
 *   CALLMEBOT_RECIPIENTS — virgülle ayrılmış "phone:key" çiftleri.
 *     Örnek: "905321234567:1234567,905329876543:7654321"
 *   CALLMEBOT_PHONE + CALLMEBOT_API_KEY — tek alıcı için (backward compat).
 *     RECIPIENTS verilmediğinde devreye girer.
 *
 * Setup: ekibinizdeki herkes kendi telefonundan +34 644 51 95 23'e
 *   "I allow callmebot to send me messages" yazıp 7 haneli key alır.
 *   Tüm phone:key çiftlerini virgülle birleştirip CALLMEBOT_RECIPIENTS olarak kaydedin.
 */

type Recipient = { phone: string; apiKey: string }

function getRecipients(): Recipient[] {
  const list: Recipient[] = []

  const recipientsRaw = process.env.CALLMEBOT_RECIPIENTS ?? ""
  if (recipientsRaw.trim()) {
    for (const pair of recipientsRaw.split(",")) {
      const [phone, apiKey] = pair.split(":").map((s) => s.trim())
      if (phone && apiKey) list.push({ phone, apiKey })
    }
  }

  if (list.length === 0) {
    const phone = process.env.CALLMEBOT_PHONE?.trim()
    const apiKey = process.env.CALLMEBOT_API_KEY?.trim()
    if (phone && apiKey) list.push({ phone, apiKey })
  }

  return list
}

/**
 * Send a WhatsApp message via CallMeBot.
 * Silently no-ops if env vars are not configured.
 * Never throws — errors are logged, request is unaffected.
 *
 * WhatsApp formatting: *bold*, _italic_, ~strikethrough~, ```mono```
 */
export type WhatsAppSendResult =
  | { ok: true; status: number; phone: string }
  | { ok: false; reason: "http-error" | "exception"; phone: string; status?: number; body?: string; error?: string }

export type WhatsAppResult = {
  recipients: number
  results: WhatsAppSendResult[]
  skipped?: "no-config"
}

async function sendOne(text: string, r: Recipient): Promise<WhatsAppSendResult> {
  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(r.phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(r.apiKey)}`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, { method: "GET", signal: ctrl.signal })
    clearTimeout(timer)
    const body = await res.text().catch(() => "")
    if (!res.ok) {
      console.error("[WhatsApp]", r.phone, "HTTP failed:", res.status, body.slice(0, 200))
      return { ok: false, reason: "http-error", phone: r.phone, status: res.status, body: body.slice(0, 200) }
    }
    console.log("[WhatsApp] sent to", r.phone, "status=", res.status)
    return { ok: true, status: res.status, phone: r.phone }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[WhatsApp]", r.phone, "exception:", msg)
    return { ok: false, reason: "exception", phone: r.phone, error: msg }
  }
}

export async function sendWhatsAppMessage(text: string): Promise<WhatsAppResult> {
  const recipients = getRecipients()
  if (recipients.length === 0) {
    console.warn("[WhatsApp] skipped: no recipients configured")
    return { recipients: 0, results: [], skipped: "no-config" }
  }

  // Sıralı gönderim — CallMeBot rate limit'ine takılmamak için
  const results: WhatsAppSendResult[] = []
  for (const r of recipients) {
    results.push(await sendOne(text, r))
  }
  return { recipients: recipients.length, results }
}
