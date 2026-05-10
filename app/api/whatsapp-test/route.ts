/**
 * Debug endpoint — admin only.
 * GET /api/whatsapp-test → tries to send a test WhatsApp message and returns the result.
 */

import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const hasRecipients = !!process.env.CALLMEBOT_RECIPIENTS
  const hasPhone = !!process.env.CALLMEBOT_PHONE
  const hasKey = !!process.env.CALLMEBOT_API_KEY
  const recipientsCount = (process.env.CALLMEBOT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length

  const text = `🧪 Test mesajı — ${new Date().toLocaleString("tr-TR")}`
  const result = await sendWhatsAppMessage(text)

  return NextResponse.json({
    env: {
      hasRecipients,
      recipientsCount,
      hasPhone,
      hasKey,
    },
    result,
    text,
  })
}
