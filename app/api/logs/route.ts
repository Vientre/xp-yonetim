import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  // Activity logs are not persisted to Google Sheets in this version.
  return NextResponse.json([])
}
