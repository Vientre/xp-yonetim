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

  const hasPhone = !!process.env.CALLMEBOT_PHONE
  const hasKey = !!process.env.CALLMEBOT_API_KEY

  const text = `🧪 Test mesajı — ${new Date().toLocaleString("tr-TR")}`
  const result = await sendWhatsAppMessage(text)

  return NextResponse.json({
    env: {
      hasPhone,
      hasKey,
      phoneLength: process.env.CALLMEBOT_PHONE?.length ?? 0,
      keyLength: process.env.CALLMEBOT_API_KEY?.length ?? 0,
    },
    result,
    text,
  })
}
