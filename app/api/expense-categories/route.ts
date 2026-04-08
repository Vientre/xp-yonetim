import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { EXPENSE_CATEGORIES } from "@/lib/constants"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  return NextResponse.json(EXPENSE_CATEGORIES)
}
