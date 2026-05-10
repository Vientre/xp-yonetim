/**
 * Rezervasyon API
 *
 * Rezervasyonlar tab —
 * id | tarih (YYYY-MM-DD) | gun | saat (HH:mm) | not | telefon |
 * ekleyenId | ekleyenAd | olusturmaTarihi (ISO) |
 * silindi ("true"/"false") | silenId | silenAd | silmeTarihi (ISO) |
 * durum ("" | "geldi" | "iptal") | kisiSayisi (int) | sure (30 | 45 | 60) |
 * musteriNotu (geçmiş için ek not)
 *
 * Not: column E ("not") önceden "isim" olarak adlandırılmıştı; sadece
 * etiket değişimi, veri pozisyonu aynı.
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
type Sure = 30 | 45 | 60

type Reservation = {
  id: string
  tarih: string
  gun: string
  saat: string
  not: string
  telefon: string
  kisiSayisi: number
  sure: number
  ekleyenId: string
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenId: string
  silenAd: string
  silmeTarihi: string
  durum: Durum
  musteriNotu: string
}

function parseDurum(v: string | undefined): Durum {
  const x = (v ?? "").trim().toLowerCase()
  if (x === "geldi" || x === "iptal") return x
  return ""
}

function parseInt0(v: string | undefined): number {
  const n = parseInt((v ?? "").trim(), 10)
  return isNaN(n) ? 0 : n
}

function rowToReservation(row: string[]): Reservation {
  return {
    id: row[0] ?? "",
    tarih: row[1] ?? "",
    gun: row[2] ?? "",
    saat: row[3] ?? "",
    not: row[4] ?? "",
    telefon: row[5] ?? "",
    ekleyenId: row[6] ?? "",
    ekleyenAd: row[7] ?? "",
    olusturmaTarihi: row[8] ?? "",
    silindi: isTruthyFlag(row[9]),
    silenId: row[10] ?? "",
    silenAd: row[11] ?? "",
    silmeTarihi: row[12] ?? "",
    durum: parseDurum(row[13]),
    kisiSayisi: parseInt0(row[14]),
    sure: parseInt0(row[15]),
    musteriNotu: row[16] ?? "",
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "1"

  const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])
  const items = rows.map(rowToReservation)
  const filtered = includeDeleted ? items : items.filter((r) => !r.silindi)

  filtered.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih)
    return a.saat.localeCompare(b.saat)
  })

  return NextResponse.json({ reservations: filtered })
}

const addSchema = z.object({
  action: z.literal("add"),
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD olmalı"),
  saat: z.string().regex(/^\d{2}:\d{2}$/, "Saat HH:mm olmalı"),
  telefon: z.string().trim().min(1, "Telefon zorunlu"),
  kisiSayisi: z.number().int().positive("Kişi sayısı zorunlu"),
  sure: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  not: z.string().optional().default(""),
})

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1),
})

const completeSchema = z.object({
  action: z.literal("complete"),
  id: z.string().min(1),
})

const uncompleteSchema = z.object({
  action: z.literal("uncomplete"),
  id: z.string().min(1),
})

const restoreSchema = z.object({
  action: z.literal("restore"),
  id: z.string().min(1),
})

const addNoteSchema = z.object({
  action: z.literal("addNote"),
  id: z.string().min(1),
  musteriNotu: z.string().max(500),
})

const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().min(1),
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD olmalı"),
  saat: z.string().regex(/^\d{2}:\d{2}$/, "Saat HH:mm olmalı"),
  telefon: z.string().trim().min(1, "Telefon zorunlu"),
  kisiSayisi: z.number().int().positive("Kişi sayısı zorunlu"),
  sure: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  not: z.string().optional().default(""),
})

async function applyStatus(
  id: string,
  opts: {
    durum: Durum
    deleted: boolean
    user?: { id: string; name: string }
  }
) {
  const rows = await getRows(TABS.RESERVATIONS)
  const idx = rows.findIndex((r) => r[0] === id)
  if (idx === -1) return { error: "Kayıt bulunamadı", status: 404 as const }

  const row = rows[idx]
  if (isTruthyFlag(row[9])) {
    return { error: "Silinmiş kayıt değiştirilemez", status: 400 as const }
  }

  const silmeTarihi = opts.deleted && opts.user ? new Date().toISOString() : ""

  await updateRowByIndex(TABS.RESERVATIONS, idx, [
    row[0], row[1], row[2], row[3], row[4], row[5],
    row[6], row[7], row[8],
    opts.deleted ? "true" : "false",
    opts.deleted && opts.user ? opts.user.id : "",
    opts.deleted && opts.user ? opts.user.name : "",
    silmeTarihi,
    opts.durum,
    row[14] ?? "", row[15] ?? "", row[16] ?? "",
  ])

  return {
    ok: true,
    id,
    silindi: opts.deleted,
    durum: opts.durum,
    silenId: opts.deleted && opts.user ? opts.user.id : "",
    silenAd: opts.deleted && opts.user ? opts.user.name : "",
    silmeTarihi,
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body = await req.json()

  if (body.action === "add") {
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const firstMsg =
        Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? "Geçersiz veri"
      return NextResponse.json({ error: firstMsg }, { status: 400 })
    }
    const { tarih, saat, telefon, kisiSayisi, sure, not } = parsed.data
    const id = generateId()
    const gun = getTrDayName(tarih)
    const olusturmaTarihi = new Date().toISOString()

    await appendRow(TABS.RESERVATIONS, [
      id, tarih, gun, saat, not.trim(), telefon.trim(),
      user.id, user.name, olusturmaTarihi,
      "false", "", "", "", "",
      String(kisiSayisi), String(sure), "",
    ])

    return NextResponse.json(
      {
        id, tarih, gun, saat,
        not: not.trim(),
        telefon: telefon.trim(),
        kisiSayisi,
        sure: sure as Sure,
        ekleyenId: user.id,
        ekleyenAd: user.name,
        olusturmaTarihi,
        silindi: false,
        silenId: "",
        silenAd: "",
        silmeTarihi: "",
        durum: "" as Durum,
        musteriNotu: "",
      },
      { status: 201 }
    )
  }

  if (body.action === "complete" || body.action === "uncomplete" || body.action === "delete") {
    const schema =
      body.action === "complete" ? completeSchema :
      body.action === "uncomplete" ? uncompleteSchema :
      deleteSchema
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      const result = await applyStatus(parsed.data.id, {
        durum:
          body.action === "complete" ? "geldi" :
          body.action === "uncomplete" ? "" :
          "iptal",
        deleted: body.action === "delete",
        user: body.action === "delete" ? user : undefined,
      })
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }
      return NextResponse.json(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata"
      return NextResponse.json({ error: `Hata: ${msg}` }, { status: 500 })
    }
  }

  if (body.action === "update") {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const firstMsg =
        Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? "Geçersiz veri"
      return NextResponse.json({ error: firstMsg }, { status: 400 })
    }
    const { id, tarih, saat, telefon, kisiSayisi, sure, not } = parsed.data

    try {
      const rows = await getRows(TABS.RESERVATIONS)
      const idx = rows.findIndex((r) => r[0] === id)
      if (idx === -1) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

      const row = rows[idx]
      if (isTruthyFlag(row[9])) {
        return NextResponse.json({ error: "Silinmiş kayıt düzenlenemez" }, { status: 400 })
      }

      const gun = getTrDayName(tarih)
      await updateRowByIndex(TABS.RESERVATIONS, idx, [
        row[0], tarih, gun, saat, not.trim(), telefon.trim(),
        row[6], row[7], row[8],
        row[9] ?? "false", row[10] ?? "", row[11] ?? "", row[12] ?? "", row[13] ?? "",
        String(kisiSayisi), String(sure), row[16] ?? "",
      ])

      return NextResponse.json({ ok: true, id })
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
      row[14] ?? "", row[15] ?? "", row[16] ?? "",
    ])

    return NextResponse.json({ ok: true, id })
  }

  if (body.action === "addNote") {
    const parsed = addNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { id, musteriNotu } = parsed.data

    try {
      const rows = await getRows(TABS.RESERVATIONS)
      const idx = rows.findIndex((r) => r[0] === id)
      if (idx === -1) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

      const row = rows[idx]
      await updateRowByIndex(TABS.RESERVATIONS, idx, [
        row[0], row[1], row[2], row[3], row[4], row[5],
        row[6], row[7], row[8],
        row[9] ?? "false", row[10] ?? "", row[11] ?? "", row[12] ?? "", row[13] ?? "",
        row[14] ?? "", row[15] ?? "", musteriNotu.trim(),
      ])

      return NextResponse.json({ ok: true, id, musteriNotu: musteriNotu.trim() })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata"
      return NextResponse.json({ error: `Hata: ${msg}` }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
