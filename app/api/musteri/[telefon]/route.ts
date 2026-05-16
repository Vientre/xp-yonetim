/**
 * Müşteri Profil API
 *
 * GET /api/musteri/[telefon]
 *
 * Telefon (son 10 hane karşılaştırması) ile tüm rezervasyon geçmişini ve
 * istatistikleri döner. Şu an LaserTag Rezervasyon tablosundan veri çekiyor.
 */

import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows } from "@/lib/sheets"
import { TABS } from "@/lib/constants"

export const runtime = "nodejs"

function normalizePhone(s: string): string {
  return (s ?? "").replace(/\D/g, "").slice(-10)
}

function isTruthyFlag(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true"
}

function parseInt0(v: string | undefined): number {
  const n = parseInt((v ?? "").trim(), 10)
  return isNaN(n) ? 0 : n
}

type Durum = "" | "geldi" | "gelmedi" | "iptal"

function parseDurum(v: string | undefined): Durum {
  const x = (v ?? "").trim().toLowerCase()
  if (x === "geldi" || x === "gelmedi" || x === "iptal") return x
  return ""
}

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ telefon: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { telefon: rawTelefon } = await params
  const normalized = normalizePhone(decodeURIComponent(rawTelefon))
  if (normalized.length < 7) {
    return NextResponse.json({ error: "Geçersiz telefon" }, { status: 400 })
  }

  const rows = await getRows(TABS.RESERVATIONS).catch(() => [] as string[][])
  const all = rows.map(rowToReservation)
  const matching = all.filter((r) => normalizePhone(r.telefon) === normalized)

  if (matching.length === 0) {
    return NextResponse.json({ error: "Bu numarayla eşleşen rezervasyon bulunamadı" }, { status: 404 })
  }

  // Tarihe göre yeni → eski
  matching.sort((a, b) => {
    if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih)
    return b.saat.localeCompare(a.saat)
  })

  // İstatistikler
  const total = matching.length
  const geldi = matching.filter((r) => r.durum === "geldi").length
  const gelmedi = matching.filter((r) => r.durum === "gelmedi").length
  const iptal = matching.filter((r) => r.durum === "iptal").length
  const bekleyen = matching.filter((r) => r.durum === "" && !r.silindi).length

  const isleneeCount = geldi + gelmedi
  const geldiOrani = isleneeCount > 0 ? Math.round((geldi / isleneeCount) * 100) : null
  const gelmeOrani = isleneeCount > 0 ? Math.round((gelmedi / isleneeCount) * 100) : null

  const firstDate = matching[matching.length - 1]?.tarih ?? ""
  const lastDate = matching[0]?.tarih ?? ""

  // Toplam kişi sayısı (tüm rezervasyonlarda)
  const totalKisi = matching.reduce((s, r) => s + (r.kisiSayisi || 0), 0)

  // Müşteri notları — boş olmayanları al, en yeni ilk
  const notes = matching
    .filter((r) => r.musteriNotu && r.musteriNotu.trim())
    .map((r) => ({
      tarih: r.tarih,
      olusturmaTarihi: r.olusturmaTarihi,
      not: r.musteriNotu,
    }))

  // Telefon numarasının nasıl yazıldığını topla (farklı formatlar olabilir)
  const phoneVariations = Array.from(new Set(matching.map((r) => r.telefon).filter(Boolean)))

  // En yaygın "not" değeri (örn: "doğum günü", "kurumsal") — referans için
  const usedNotes = matching
    .filter((r) => r.not && r.not.trim())
    .map((r) => r.not)

  return NextResponse.json({
    telefon: normalized,
    phoneVariations,
    stats: {
      total,
      geldi,
      gelmedi,
      iptal,
      bekleyen,
      geldiOrani,
      gelmeOrani,
      totalKisi,
      firstDate,
      lastDate,
    },
    notes,
    usedNotes: Array.from(new Set(usedNotes)).slice(0, 10),
    reservations: matching,
  })
}
