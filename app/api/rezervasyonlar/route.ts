/**
 * Rezervasyon API
 *
 * Rezervasyonlar tab —
 * id | tarih (YYYY-MM-DD) | gun | saat (HH:mm) | isim | telefon |
 * ekleyenId | ekleyenAd | olusturmaTarihi (ISO) |
 * silindi ("true"/"false") | silenId | silenAd | silmeTarihi (ISO) |
 * durum ("" | "geldi" | "iptal")
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows, appendRow, updateRowByIndex, generateId } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import { z } from "zod"

const TR_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]

function getTrDayName(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00")
  return TR_DAYS[d.getDay()] ?? ""
}

function isTruthyFlag(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true"
}

type Durum = "" | "geldi" | "iptal"

type Reservation = {
  id: string
  tarih: string
  gun: string
  saat: string
  isim: string
  telefon: string
  ekleyenId: string
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenId: string
  silenAd: string
  silmeTarihi: string
  durum: Durum
}

function parseDurum(v: string | undefined): Durum {
  const x = (v ?? "").trim().toLowerCase()
  if (x === "geldi" || x === "iptal") return x
  return ""
}

function rowToReservation(row: string[]): Reservation {
  return {
    id: row[0] ?? "",
    tarih: row[1] ?? "",
    gun: row[2] ?? "",
    saat: row[3] ?? "",
    isim: row[4] ?? "",
    telefon: row[5] ?? "",
    ekleyenId: row[6] ?? "",
    ekleyenAd: row[7] ?? "",
    olusturmaTarihi: row[8] ?? "",
    silindi: isTruthyFlag(row[9]),
    silenId: row[10] ?? "",
    silenAd: row[11] ?? "",
    silmeTarihi: row[12] ?? "",
    durum: parseDurum(row[13]),
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const includeDeleted =
    user.role === "admin" && req.nextUrl.searchParams.get("includeDeleted") === "1"

  const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])
  const items = rows.map(rowToReservation)
  const filtered = includeDeleted ? items : items.filter((r) => !r.silindi)

  filtered.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih)
    return a.saat.localeCompare(b.saat)
  })

  return NextResponse.json({ reservations: filtered })
}

const addSchema = z
  .object({
    action: z.literal("add"),
    tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD olmalı"),
    saat: z.string().regex(/^\d{2}:\d{2}$/, "Saat HH:mm olmalı"),
    isim: z.string().optional().default(""),
    telefon: z.string().optional().default(""),
  })
  .refine((d) => d.isim.trim().length > 0 || d.telefon.trim().length > 0, {
    message: "Not veya telefon zorunlu",
    path: ["isim"],
  })

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1),
})

const completeSchema = z.object({
  action: z.literal("complete"),
  id: z.string().min(1),
})

const restoreSchema = z.object({
  action: z.literal("restore"),
  id: z.string().min(1),
})

async function markAsHandled(
  id: string,
  durum: "geldi" | "iptal",
  user: { id: string; name: string }
) {
  const rows = await getRows(TABS.RESERVATIONS)
  const idx = rows.findIndex((r) => r[0] === id)
  if (idx === -1) return { error: "Kayıt bulunamadı", status: 404 as const }

  const row = rows[idx]
  if (isTruthyFlag(row[9])) {
    return { error: "Zaten işlenmiş", status: 400 as const }
  }

  const silmeTarihi = new Date().toISOString()
  await updateRowByIndex(TABS.RESERVATIONS, idx, [
    row[0], row[1], row[2], row[3], row[4], row[5],
    row[6], row[7], row[8],
    "true", user.id, user.name, silmeTarihi, durum,
  ])

  return {
    ok: true,
    id,
    silenId: user.id,
    silenAd: user.name,
    silmeTarihi,
    durum,
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body = await req.json()

  if (body.action === "add") {
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { tarih, saat, isim, telefon } = parsed.data
    const id = generateId()
    const gun = getTrDayName(tarih)
    const olusturmaTarihi = new Date().toISOString()

    await appendRow(TABS.RESERVATIONS, [
      id, tarih, gun, saat, isim.trim(), telefon.trim(),
      user.id, user.name, olusturmaTarihi,
      "false", "", "", "", "",
    ])

    return NextResponse.json(
      {
        id, tarih, gun, saat,
        isim: isim.trim(),
        telefon: telefon.trim(),
        ekleyenId: user.id,
        ekleyenAd: user.name,
        olusturmaTarihi,
        silindi: false,
        silenId: "",
        silenAd: "",
        silmeTarihi: "",
        durum: "" as Durum,
      },
      { status: 201 }
    )
  }

  if (body.action === "delete" || body.action === "complete") {
    const schema = body.action === "delete" ? deleteSchema : completeSchema
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      const result = await markAsHandled(
        parsed.data.id,
        body.action === "complete" ? "geldi" : "iptal",
        user
      )
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }
      return NextResponse.json(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata"
      return NextResponse.json({ error: `Hata: ${msg}` }, { status: 500 })
    }
  }

  if (body.action === "restore") {
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Sadece yönetici" }, { status: 403 })
    }
    const parsed = restoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { id } = parsed.data

    const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])
    const idx = rows.findIndex((r) => r[0] === id)
    if (idx === -1) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

    const row = rows[idx]
    await updateRowByIndex(TABS.RESERVATIONS, idx, [
      row[0], row[1], row[2], row[3], row[4], row[5],
      row[6], row[7], row[8],
      "false", "", "", "", "",
    ])

    return NextResponse.json({ ok: true, id })
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
