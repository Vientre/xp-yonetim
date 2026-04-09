"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BUSINESSES } from "@/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type Expense = {
  id: string
  categoryId: string
  category: { id: string; name: string; color: string }
  description: string
  amount: number
}

type DayEntry = {
  id: string
  date: string
  businessId: string
  cashIncome: number
  cardIncome: number
  ticketIncome: number
  totalIncome: number
  totalExpense: number
  netAmount: number
  notes: string
  enteredBy: { name: string }
  expenses: Expense[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTL(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AylikTabloPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [businessId, setBusinessId] = useState<string>(BUSINESSES[0].id)
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const from = isoDate(year, month, 1)
      const daysCount = getDaysInMonth(year, month)
      const to = isoDate(year, month, daysCount)
      const res = await fetch(
        `/api/daily-closings?businessId=${businessId}&from=${from}&to=${to}&limit=200`
      )
      if (!res.ok) throw new Error("Veri alınamadı")
      const data: DayEntry[] = await res.json()
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [year, month, businessId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function toggleRow(date: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const daysCount = getDaysInMonth(year, month)
  const entryByDate = Object.fromEntries(entries.map(e => [e.date, e]))

  const totals = entries.reduce(
    (acc, e) => ({
      cash: acc.cash + e.cashIncome,
      card: acc.card + e.cardIncome,
      ticket: acc.ticket + e.ticketIncome,
      income: acc.income + e.totalIncome,
      expense: acc.expense + e.totalExpense,
      net: acc.net + e.netAmount,
    }),
    { cash: 0, card: 0, ticket: 0, income: 0, expense: 0, net: 0 }
  )

  const daysWithEntry = entries.length
  const avgIncome = daysWithEntry > 0 ? totals.income / daysWithEntry : 0

  const currentBiz = BUSINESSES.find(b => b.id === businessId)

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Aylık Tablo</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Yazdır / PDF
        </Button>
      </div>

      {/* Print title */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{currentBiz?.name}</h1>
        <p className="text-sm text-slate-600">{MONTH_NAMES[month]} {year} — Aylık Gelir/Gider Tablosu</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800 min-w-[130px] text-center text-sm">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {BUSINESSES.map(biz => (
            <button
              key={biz.id}
              onClick={() => setBusinessId(biz.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                businessId === biz.id
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {biz.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Toplam Gelir", value: totals.income, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Toplam Gider", value: totals.expense, color: "text-red-600", bg: "bg-red-50" },
          { label: "Net Kâr", value: totals.net, color: totals.net >= 0 ? "text-blue-600" : "text-red-600", bg: totals.net >= 0 ? "bg-blue-50" : "bg-red-50" },
          { label: "Nakit", value: totals.cash, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Kart", value: totals.card, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Günlük Ort.", value: avgIncome, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(c => (
          <div key={c.label} className={cn("rounded-xl p-3", c.bg)}>
            <p className="text-xs text-slate-500 font-medium">{c.label}</p>
            <p className={cn("text-sm font-bold mt-0.5", c.color)}>₺{formatTL(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Yükleniyor…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Tarih</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 w-12 print:hidden">Gün</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Nakit</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Kart</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Bilet</th>
                  <th className="text-right px-4 py-3 font-semibold text-emerald-700 border-l border-slate-200">Gelir</th>
                  <th className="text-right px-4 py-3 font-semibold text-red-700">Gider</th>
                  <th className="text-right px-4 py-3 font-semibold text-blue-700 border-r border-slate-200">Net</th>
                  <th className="px-3 py-3 print:hidden w-8" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysCount }, (_, i) => {
                  const day = i + 1
                  const dateStr = isoDate(year, month, day)
                  const entry = entryByDate[dateStr]
                  const dayName = DAY_NAMES[new Date(dateStr).getDay()]
                  const isWeekend = [0, 6].includes(new Date(dateStr).getDay())
                  const isExpanded = expandedRows.has(dateStr)

                  return (
                    <Fragment key={dateStr}>
                      <tr
                        onClick={() => entry && toggleRow(dateStr)}
                        className={cn(
                          "border-b border-slate-100 transition-colors",
                          entry ? "cursor-pointer hover:bg-slate-50" : "",
                          isWeekend && !entry ? "bg-slate-50/50" : "",
                          isExpanded ? "bg-blue-50/40" : "",
                        )}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {String(day).padStart(2, "0")}.{String(month + 1).padStart(2, "0")}.{year}
                        </td>
                        <td className={cn(
                          "px-3 py-2.5 text-xs font-medium print:hidden",
                          isWeekend ? "text-red-400" : "text-slate-400"
                        )}>
                          {dayName}
                        </td>

                        {entry ? (
                          <>
                            <td className="px-4 py-2.5 text-right text-slate-700">
                              {entry.cashIncome > 0
                                ? `₺${formatTL(entry.cashIncome)}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-700">
                              {entry.cardIncome > 0
                                ? `₺${formatTL(entry.cardIncome)}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-700">
                              {entry.ticketIncome > 0
                                ? `₺${formatTL(entry.ticketIncome)}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 border-l border-slate-100">
                              ₺{formatTL(entry.totalIncome)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                              {entry.totalExpense > 0
                                ? `₺${formatTL(entry.totalExpense)}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className={cn(
                              "px-4 py-2.5 text-right font-bold border-r border-slate-100",
                              entry.netAmount >= 0 ? "text-blue-700" : "text-red-700"
                            )}>
                              ₺{formatTL(entry.netAmount)}
                            </td>
                            <td className="px-3 py-2.5 text-center print:hidden">
                              {entry.expenses.length > 0 && (
                                isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-slate-400 inline" />
                                  : <ChevronDown className="w-4 h-4 text-slate-400 inline" />
                              )}
                            </td>
                          </>
                        ) : (
                          <td colSpan={7} className="px-4 py-2.5 text-slate-300 text-xs italic">
                            Kayıt girilmedi
                          </td>
                        )}
                      </tr>

                      {/* Expanded expense detail */}
                      {entry && isExpanded && (
                        <tr className="bg-blue-50/60 border-b border-blue-100">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="flex flex-wrap gap-2">
                              {entry.expenses.length > 0 ? (
                                entry.expenses.map(exp => (
                                  <div
                                    key={exp.id}
                                    className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: exp.category.color }}
                                    />
                                    <span className="text-xs font-medium text-slate-700">{exp.category.name}</span>
                                    {exp.description && (
                                      <span className="text-xs text-slate-400">({exp.description})</span>
                                    )}
                                    <span className="text-xs font-semibold text-red-600">₺{formatTL(exp.amount)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Gider kalemi yok</span>
                              )}
                              {entry.notes && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
                                  <span className="font-medium">Not:</span> {entry.notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-slate-800 text-white">
                  <td className="px-4 py-3 font-bold" colSpan={2}>
                    TOPLAM ({daysWithEntry} gün)
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">₺{formatTL(totals.cash)}</td>
                  <td className="px-4 py-3 text-right font-semibold">₺{formatTL(totals.card)}</td>
                  <td className="px-4 py-3 text-right font-semibold">₺{formatTL(totals.ticket)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400 border-l border-slate-600">
                    ₺{formatTL(totals.income)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-400">
                    ₺{formatTL(totals.expense)}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right font-bold border-r border-slate-600",
                    totals.net >= 0 ? "text-blue-300" : "text-red-300"
                  )}>
                    ₺{formatTL(totals.net)}
                  </td>
                  <td className="px-3 py-3 print:hidden">
                    {totals.net > 0
                      ? <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
                      : totals.net < 0
                        ? <TrendingDown className="w-4 h-4 text-red-400 inline" />
                        : <Minus className="w-4 h-4 text-slate-400 inline" />
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
