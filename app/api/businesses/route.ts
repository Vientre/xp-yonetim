import { NextResponse } from "next/server"
import { getAuthUser, getAccessibleBusinessIds } from "@/lib/auth-utils"
import { BUSINESSES } from "@/lib/constants"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const accessibleIds = getAccessibleBusinessIds(user)
  const businesses = BUSINESSES.filter((b) => accessibleIds.includes(b.id))

  return NextResponse.json(businesses)
}
