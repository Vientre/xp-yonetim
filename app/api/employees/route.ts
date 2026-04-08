import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.role === "staff") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }
  return NextResponse.json([])
}
