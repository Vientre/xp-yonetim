/**
 * Settings API
 *
 * Google Sheet: "Ayarlar" tab
 * Columns: anahtar | deger
 *
 * Known keys:
 *   yemekFiyati  - meal price per person (default: 50)
 *   uyariLimiti  - high amount warning threshold (default: 10000)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getSettings, setSetting } from "@/lib/sheets"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (user.role !== "admin") return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })

  const settings = await getSettings()

  // Return with defaults for missing keys
  return NextResponse.json({
    yemekFiyati: settings.yemekFiyati ?? "50",
    uyariLimiti: settings.uyariLimiti ?? "10000",
    ...settings,
  })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (user.role !== "admin") return NextResponse.json({ error: "Sadece yöneticiler" }, { status: 403 })

  const body = await req.json()

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" || typeof value === "number") {
      await setSetting(key, String(value))
    }
  }

  return NextResponse.json({ success: true })
}

// Also handle PATCH
export { PUT as PATCH }
