"use client"

import { Fragment } from "react"
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import type { DayEntry } from "./types"
import { DAY_NAMES, isoDate, MONTH_NAMES } from "./utils"

interface MonthlyTotals { cash: number; card: number; ticket: number; income: number; expense: number; net: number }
interface ExpenseCategoryTotal { name: string; color: string; total: number }

export function GeneralTab({ totals, avgIncome, loading, daysCount, year, month, entryByDate, expandedRows, onToggleRow, expenseCategoryTotals, businessName, analysis, analysisLoading, monthEntriesCount, onAnalyze }: {
  totals: MonthlyTotals
  avgIncome: number
  loading: boolean
  daysCount: number
  year: number
  month: number
  entryByDate: Record<string, DayEntry>
  expandedRows: Set<string>
  onToggleRow: (date: string) => void
  expenseCategoryTotals: ExpenseCategoryTotal[]
  businessName?: string
  analysis: string
  analysisLoading: boolean
  monthEntriesCount: number
  onAnalyze: () => void
}) {
  const toggleRow = onToggleRow
  const currentBiz = { name: businessName }
  const fetchAnalysis = onAnalyze
  const monthEntries = { length: monthEntriesCount }
  return (
<TabsContent value="genel" className="mt-4 space-y-4">
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
        <p className={cn("text-sm font-bold mt-0.5", c.color)}>{formatCurrency(c.value)}</p>
      </div>
    ))}
  </div>

  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    {loading ? (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Yükleniyor…</div>
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
              const biletTotal = entry ? (entry.ticketIncome || 0) + (entry.ticketCardIncome || 0) : 0

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
                    <td className={cn("px-3 py-2.5 text-xs font-medium print:hidden", isWeekend ? "text-red-400" : "text-slate-400")}>
                      {dayName}
                    </td>

                    {entry ? (
                      <>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {entry.cashIncome > 0 ? `${formatCurrency(entry.cashIncome)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {entry.cardIncome > 0 ? `${formatCurrency(entry.cardIncome)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {biletTotal > 0 ? `${formatCurrency(biletTotal)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 border-l border-slate-100">
                          {formatCurrency(entry.totalIncome)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                          {entry.totalExpense > 0 ? `${formatCurrency(entry.totalExpense)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-bold border-r border-slate-100", entry.netAmount >= 0 ? "text-blue-700" : "text-red-700")}>
                          {formatCurrency(entry.netAmount)}
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
                      <>
                        <td colSpan={6} className="px-4 py-2.5 text-center text-slate-300 text-xs">— Kayıt yok —</td>
                        <td className="px-3 py-2.5 print:hidden" />
                      </>
                    )}
                  </tr>

                  {/* Expanded expense detail */}
                  {entry && isExpanded && entry.expenses.length > 0 && (
                    <tr className="bg-blue-50/40 border-b border-blue-100">
                      <td colSpan={9} className="px-6 py-3">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Gider Detayları</p>
                        <ul className="space-y-1">
                          {entry.expenses.map((e) => (
                            <li key={e.id} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.category.color }} />
                                <span className="text-slate-700">{e.category.name}</span>
                                {e.description && <span className="text-slate-400">— {e.description}</span>}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                                  (e.paymentMethod ?? "nakit") === "nakit"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-100 text-blue-700"
                                )}>
                                  {(e.paymentMethod ?? "nakit") === "nakit" ? "Nakit" : "Banka"}
                                </span>
                              </span>
                              <span className="font-mono text-slate-700">{formatCurrency(e.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
  {/* ───── GİDER KATEGORİ ÖZETİ ───── */}
  {expenseCategoryTotals.length > 0 && (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Gider Kalemleri Özeti — {currentBiz?.name}</h3>
        <span className="text-sm font-bold text-red-600">{formatCurrency(totals.expense)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {expenseCategoryTotals.map((cat) => {
          const pct = totals.expense > 0 ? Math.round((cat.total / totals.expense) * 100) : 0
          return (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-slate-400">{pct}%</span>
                  <span className="font-bold text-slate-800">{formatCurrency(cat.total)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )}

  {/* ───── AI ANALİZ ───── */}
  <div className="bg-gradient-to-br from-violet-50 to-slate-50 rounded-xl border border-violet-200 shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-violet-800">AI Analiz & Yorum</h3>
        <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
          {MONTH_NAMES[month]} {year}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-violet-300 text-violet-700 hover:bg-violet-100 gap-1.5"
        onClick={fetchAnalysis}
        disabled={analysisLoading || monthEntries.length === 0}
      >
        {analysisLoading
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analiz ediliyor…</>
          : <><Sparkles className="h-3.5 w-3.5" />{analysis ? "Yenile" : "Analiz Oluştur"}</>
        }
      </Button>
    </div>

    {analysis ? (
      <p className="text-sm text-slate-700 leading-relaxed">{analysis}</p>
    ) : (
      <p className="text-xs text-slate-400 italic">
        {monthEntries.length === 0
          ? "Bu ay için kayıt bulunamadı."
          : "Bu ayın verilerini analiz etmek için butona tıklayın."}
      </p>
    )}
  </div>

</TabsContent>
  )
}
