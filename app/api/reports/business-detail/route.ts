/**
 * İşletme Bazlı Detay API
 * Her işletme için:
 *   - Gelir kırılımı (nakit / kart / bilet / toplam)
 *   - Gider kalemleri (kategori bazlı)
 *   - Günlük kapanış listesi
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-utils"
import { getRows } from "@/lib/sheets"
import { TABS, BUSINESSES, getCategoryById, getBusinessName } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get("from") ?? ""
  const to   = searchParams.get("to")   ?? ""

  if (!from || !to) {
    return NextResponse.json({ error: "from ve to parametreleri zorunludur" }, { status: 400 })
  }

  // Veriyi paralel çek
  const [gelirRows, giderRows] = await Promise.all([
    getRows(TABS.DAILY_INCOME),
    getRows(TABS.EXPENSES),
  ])

  // Tarih filtresi + rol filtresi
  const userBizIds = user.role === "admin"
    ? BUSINESSES.map((b) => b.id)
    : (user as any).businesses ?? []

  const filtered = gelirRows.filter((r) => {
    if (!r[1]) return false
    if (r[1] < from || r[1] > to) return false
    if (user.role !== "admin" && !userBizIds.includes(r[2])) return false
    return true
  })

  // gelirId → businessId map
  const gelirIdToBiz: Record<string, string> = {}
  for (const r of filtered) gelirIdToBiz[r[0]] = r[2]

  // Gider satırlarını filtrele (sadece seçili dönemin gelir kayıtlarına ait)
  const filteredGider = giderRows.filter((r) => gelirIdToBiz[r[1]])

  // ─── Her işletme için hesapla ─────────────────────────────────────────────
  type CatEntry = { name: string; color: string; total: number }
  type DailyRow = { date: string; nakit: number; kart: number; bilet: number; gelir: number; gider: number }

  interface BizResult {
    id: string
    name: string
    income: { nakit: number; kart: number; bilet: number; total: number }
    expense: { total: number; byCategory: CatEntry[] }
    net: number
    dailyRows: DailyRow[]
  }

  const results: BizResult[] = []

  for (const biz of BUSINESSES) {
    if (user.role !== "admin" && !userBizIds.includes(biz.id)) continue

    const bizRows = filtered.filter((r) => r[2] === biz.id)

    // Gelir toplamları
    const nakit  = bizRows.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0)
    const kart   = bizRows.reduce((s, r) => s + (parseFloat(r[4]) || 0), 0)
    const bilet  = bizRows.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0)
    const gelir  = bizRows.reduce((s, r) => s + (parseFloat(r[6]) || 0), 0)
    const giderToplam = bizRows.reduce((s, r) => s + (parseFloat(r[7]) || 0), 0)

    // Bu işletmenin gelir kayıt ID'leri
    const bizGelirIds = new Set(bizRows.map((r) => r[0]))

    // Gider kalemleri
    const catMap: Record<string, CatEntry> = {}
    for (const gr of filteredGider) {
      if (!bizGelirIds.has(gr[1])) continue
      const catId = gr[2]
      const cat   = getCategoryById(catId)
      if (!catMap[catId]) {
        catMap[catId] = {
          name:  cat?.name ?? gr[3] ?? catId,
          color: cat?.color ?? "#94a3b8",
          total: 0,
        }
      }
      catMap[catId].total += parseFloat(gr[5]) || 0
    }

    // Günlük satırlar (tarih sıralı)
    const dailyRows: DailyRow[] = bizRows
      .map((r) => ({
        date:  r[1],
        nakit: parseFloat(r[3]) || 0,
        kart:  parseFloat(r[4]) || 0,
        bilet: parseFloat(r[5]) || 0,
        gelir: parseFloat(r[6]) || 0,
        gider: parseFloat(r[7]) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    results.push({
      id:   biz.id,
      name: biz.name,
      income: { nakit, kart, bilet, total: gelir },
      expense: {
        total: giderToplam,
        byCategory: Object.values(catMap).sort((a, b) => b.total - a.total),
      },
      net: gelir - giderToplam,
      dailyRows,
    })
  }

  // Genel toplam
  const grand = {
    gelir:  results.reduce((s, b) => s + b.income.total, 0),
    gider:  results.reduce((s, b) => s + b.expense.total, 0),
    net:    results.reduce((s, b) => s + b.net, 0),
    nakit:  results.reduce((s, b) => s + b.income.nakit, 0),
    kart:   results.reduce((s, b) => s + b.income.kart, 0),
    bilet:  results.reduce((s, b) => s + b.income.bilet, 0),
  }

  return NextResponse.json({ businesses: results, grand, from, to })
}
