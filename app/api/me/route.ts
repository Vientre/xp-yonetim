import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  return NextResponse.json({ id: user.id, name: user.name, role: user.role })
}
