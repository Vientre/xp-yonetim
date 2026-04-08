import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, findRowById, updateRowByIndex, deleteRowByIndex } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "manager", "staff"]).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  businesses: z.array(z.string()).optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id } = await params
  const result = await findRowById(TABS.USERS, id)
  if (!result) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { row, index } = result
  const data = parsed.data

  const name = data.name ?? row[3]
  const role = data.role ?? row[4]
  const businesses = data.businesses !== undefined
    ? (role === "admin" ? "TUM" : data.businesses.join(","))
    : row[5]
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : row[2]

  await updateRowByIndex(TABS.USERS, index, [row[0], row[1], passwordHash, name, role, businesses])

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id } = await params
  const result = await findRowById(TABS.USERS, id)
  if (!result) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })

  await deleteRowByIndex(TABS.USERS, result.index)
  return NextResponse.json({ success: true })
}
