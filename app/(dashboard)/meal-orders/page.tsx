"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UtensilsCrossed, ChevronLeft, ChevronRight, Save } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { format, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import { BUSINESSES } from "@/lib/constants"

interface MealEntry {
  id: string
  date: string
  businessId: string
  count: number
  pricePerMeal: number
  totalCost: number
}

const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
const TR_MONTHS: Record<string, string> = {
  "01": "Ocak", "02": "Şubat", "03": "Mart", "04": "Nisan",
  "05": "Mayıs", "06": "Haziran", "07": "Temmuz", "08": "Ağustos",
  "09": "Eylül", "10": "Ekim", "11": "Kasım", "12": "Aralık",
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-")
  return `${TR_MONTHS[month] ?? month} ${year}`
}

export default function MealOrdersPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [allEntries, setAllEntries] = useState<MealEntry[]>([])
  const [mealPrice, setMealPrice] = useState(50)
  const [weekData, setWeekData] = useState<Record<string, Record<string, number>>>({})
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch month data
  const fetchMonth = useCallback((month: string) => {
    setFetching(true)
    fetch(`/api/meal-orders?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setAllEntries(data.entries ?? [])
        setMealPrice(data.mealPrice ?? 50)
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setFetching(false))
  }, [])

  useEffect(() => {
    fetchMonth(selectedMonth)
  }, [selectedMonth, fetchMonth])

  // Pre-populate grid from loaded entries
  useEffect(() => {
    const days = getWeekDays(weekStart)
    const newData: Record<string, Record<string, number>> = {}
    for (const biz of BUSINESSES) {
      newData[biz.id] = {}
      for (const day of days) {
        const dayStr = format(day, "yyyy-MM-dd")
        const entry = allEntries.find((e) => e.businessId === biz.id && e.date === dayStr)
        newData[biz.id][dayStr] = entry ? entry.count : 0
      }
    }
    setWeekData(newData)
  }, [weekStart, allEntries])

  function prevWeek() {
    const newStart = subWeeks(weekStart, 1)
    setWeekStart(newStart)
    const newMonth = format(newStart, "yyyy-MM")
    if (newMonth !== selectedMonth) setSelectedMonth(newMonth)
  }

  function nextWeek() {
    const newStart = addWeeks(weekStart, 1)
    setWeekStart(newStart)
    const newMonth = format(newStart, "yyyy-MM")
    if (newMonth !== selectedMonth) setSelectedMonth(newMonth)
  }

  function setCount(bizId: string, dayStr: string, value: number) {
    setWeekData((prev) => ({
      ...prev,
      [bizId]: { ...prev[bizId], [dayStr]: value },
    }))
  }

  async function saveWeek() {
    const days = getWeekDays(weekStart)
    const entries: Array<{ businessId: string; date: string; count: number }> = []

    for (const biz of BUSINESSES) {
      for (const day of days) {
        const dayStr = format(day, "yyyy-MM-dd")
        entries.push({ businessId: biz.id, date: dayStr, count: weekData[biz.id]?.[dayStr] ?? 0 })
      }
    }

    setSaving(true)
    try {
      const res = await fetch("/api/meal-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      if (res.ok) {
        toast.success("Haftalık siparişler kaydedildi")
        fetchMonth(selectedMonth)
      } else {
        toast.error("Kaydedilemedi")
      }
    } finally {
      setSaving(false)
    }
  }

  const weekDays = getWeekDays(weekStart)
  const weekEnd = weekDays[5]

  // Per-day and per-row totals for the grid
  const dayTotals = weekDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd")
    return BUSINESSES.reduce((s, biz) => s + (weekData[biz.id]?.[dayStr] ?? 0), 0)
  })

  // Monthly per-business summary
  const monthSummary = BUSINESSES.map((biz) => {
    const bizEntries = allEntries.filter((e) => e.businessId === biz.id)
    const totalCount = bizEntries.reduce((s, e) => s + e.count, 0)
    const totalCost = bizEntries.reduce((s, e) => s + e.totalCost, 0)
    return { ...biz, totalCount, totalCost }
  })
  const grandTotal = monthSummary.reduce((s, b) => s + b.totalCount, 0)
  const grandCost = monthSummary.reduce((s, b) => s + b.totalCost, 0)

  if (fetching && allEntries.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yemek Siparişi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Birim fiyat: <strong>{formatCurrency(mealPrice)}</strong> — Pazar hariç her gün
        </p>
      </div>

      {/* ── Haftalık Giriş Grid ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Haftalık Giriş
            </CardTitle>

            {/* Hafta navigasyonu */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[170px] text-center">
                {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={saveWeek} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Kaydediliyor..." : "Haftayı Kaydet"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">İşletme</th>
                  {weekDays.map((day, i) => (
                    <th key={i} className="text-center px-2 py-3 font-medium min-w-[88px]">
                      <div className="text-xs text-muted-foreground">{TR_DAYS[i]}</div>
                      <div className="text-xs font-semibold text-gray-700">{format(day, "d MMM")}</div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Hafta</th>
                </tr>
              </thead>
              <tbody>
                {BUSINESSES.map((biz) => {
                  const rowTotal = weekDays.reduce((s, day) => {
                    return s + (weekData[biz.id]?.[format(day, "yyyy-MM-dd")] ?? 0)
                  }, 0)
                  return (
                    <tr key={biz.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium text-sm">{biz.name}</td>
                      {weekDays.map((day, i) => {
                        const dayStr = format(day, "yyyy-MM-dd")
                        const val = weekData[biz.id]?.[dayStr] ?? 0
                        return (
                          <td key={i} className="px-2 py-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              value={val === 0 ? "" : val}
                              placeholder="0"
                              onChange={(e) => setCount(biz.id, dayStr, parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-9 mx-auto"
                            />
                          </td>
                        )
                      })}
                      <td className="px-4 py-2 text-right">
                        {rowTotal > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                            {rowTotal}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2.5 font-semibold text-sm text-muted-foreground">Günlük Toplam</td>
                  {dayTotals.map((total, i) => (
                    <td key={i} className="px-2 py-2.5 text-center">
                      {total > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {total}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-bold text-orange-600">
                    {dayTotals.reduce((s, t) => s + t, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Aylık Özet ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">
              Aylık Özet — {monthLabel(selectedMonth)}
            </CardTitle>

            {/* Ay navigasyonu */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(selectedMonth + "-01")
                  setSelectedMonth(format(subMonths(d, 1), "yyyy-MM"))
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel(selectedMonth)}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(selectedMonth + "-01")
                  setSelectedMonth(format(addMonths(d, 1), "yyyy-MM"))
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {fetching ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">İşletme</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Toplam Adet</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Birim Fiyat</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Aylık Tutar</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.map((biz) => (
                  <tr key={biz.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{biz.name}</td>
                    <td className="px-4 py-3 text-center">
                      {biz.totalCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[40px] h-9 px-3 rounded-full bg-orange-100 text-orange-700 text-base font-bold">
                          {biz.totalCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(mealPrice)}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {biz.totalCost > 0 ? formatCurrency(biz.totalCost) : <span className="text-muted-foreground font-normal">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-orange-50">
                  <td className="px-4 py-3 font-bold text-sm">Aylık Toplam</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[40px] h-9 px-3 rounded-full bg-orange-500 text-white text-base font-bold">
                      {grandTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(mealPrice)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600 text-lg">
                    {formatCurrency(grandCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
