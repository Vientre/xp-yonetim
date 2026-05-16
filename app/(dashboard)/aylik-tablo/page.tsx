"use client"

import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Printer, Wallet, Banknote, TableProperties, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import { BUSINESSES } from "@/lib/constants"
import { downloadCsv } from "@/lib/csv"

// ─── Types ────────────────────────────────────────────────────────────────────

type Expense = {
  id: string
  categoryId: string
  category: { id: string; name: string; color: string }
  description: string
  amount: number
  paymentMethod?: "nakit" | "banka"
}

type DayEntry = {
  id: string
  date: string
  businessId: string
  cashIncome: number
  cardIncome: number
  ticketIncome: number
  ticketCardIncome: number
  kasadanBankaya: number
  bankadanKasaya: number
  totalIncome: number
  totalExpense: number
  netAmount: number
  notes: string
  enteredBy: { name: string }
  expenses: Expense[]
}

type DailyBalance = {
  date: string
  isBeforeStart: boolean
  startBalance: number
  inflow: number
  outflow: number
  endBalance: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function expenseTotalByMethod(entry: DayEntry | undefined, method: "nakit" | "banka"): number {
  if (!entry) return 0
  return entry.expenses
    .filter((x) => (x.paymentMethod ?? "nakit") === method)
    .reduce((sum, x) => sum + (x.amount || 0), 0)
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
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Settings'i bir kez çek
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setSettings(s ?? {}))
      .catch(() => setSettings({}))
  }, [])

  const daysCount = getDaysInMonth(year, month)
  const monthStart = isoDate(year, month, 1)
  const monthEnd = isoDate(year, month, daysCount)

  // Başlangıç bakiye bilgisi
  const kasaStart = parseFloat(settings[`kasaBaslangic_${businessId}`] ?? "0") || 0
  const bankaStart = parseFloat(settings[`bankaBaslangic_${businessId}`] ?? "0") || 0
  // Tarih boşsa ama bakiye girilmişse, bugünü varsayılan kabul et
  const rawTarih = settings[`bakiyeTarihi_${businessId}`] ?? ""
  const hasBalance = kasaStart !== 0 || bankaStart !== 0
  const baslangicTarihi = rawTarih || (hasBalance ? new Date().toISOString().slice(0, 10) : "")

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      // Kasa/Banka için: bakiyeTarihi varsa ay başından önce de fetch et
      const from = baslangicTarihi && baslangicTarihi < monthStart
        ? baslangicTarihi
        : monthStart
      const res = await fetch(
        `/api/daily-closings?businessId=${businessId}&from=${from}&to=${monthEnd}&limit=400`
      )
      if (!res.ok) throw new Error("Veri alınamadı")
      const data: DayEntry[] = await res.json()
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [businessId, baslangicTarihi, monthStart, monthEnd])

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

  // Sadece görüntülenen ayın kayıtları (Genel tab için)
  const monthEntries = useMemo(
    () => entries.filter((e) => e.date >= monthStart && e.date <= monthEnd),
    [entries, monthStart, monthEnd]
  )
  const entryByDate = useMemo(
    () => Object.fromEntries(monthEntries.map((e) => [e.date, e])),
    [monthEntries]
  )

  // Kasa & Banka günlük bakiyeler (görüntülenen ay için)
  const kasaDaily: DailyBalance[] = useMemo(() => {
    return computeDailyBalances({
      entries,
      startBalance: kasaStart,
      startDate: baslangicTarihi,
      year, month, daysCount,
      // Kasa girişi = nakit + biletNakit + bankadan kasaya transfer
      getInflow: (e) => (e.cashIncome || 0) + (e.ticketIncome || 0) + (e.bankadanKasaya || 0),
      // Kasa çıkışı = nakit giderler + kasadan bankaya transfer
      getOutflow: (e) => expenseTotalByMethod(e, "nakit") + (e.kasadanBankaya || 0),
    })
  }, [entries, kasaStart, baslangicTarihi, year, month, daysCount])

  const bankaDaily: DailyBalance[] = useMemo(() => {
    return computeDailyBalances({
      entries,
      startBalance: bankaStart,
      startDate: baslangicTarihi,
      year, month, daysCount,
      // Banka girişi = kart + biletKart + kasadan bankaya transfer
      getInflow: (e) => (e.cardIncome || 0) + (e.ticketCardIncome || 0) + (e.kasadanBankaya || 0),
      // Banka çıkışı = banka giderler + bankadan kasaya transfer
      getOutflow: (e) => expenseTotalByMethod(e, "banka") + (e.bankadanKasaya || 0),
    })
  }, [entries, bankaStart, baslangicTarihi, year, month, daysCount])

  const kasaTotals = sumBalances(kasaDaily)
  const bankaTotals = sumBalances(bankaDaily)

  const totals = monthEntries.reduce(
    (acc, e) => ({
      cash: acc.cash + e.cashIncome,
      card: acc.card + e.cardIncome,
      ticket: acc.ticket + e.ticketIncome + e.ticketCardIncome,
      income: acc.income + e.totalIncome,
      expense: acc.expense + e.totalExpense,
      net: acc.net + e.netAmount,
    }),
    { cash: 0, card: 0, ticket: 0, income: 0, expense: 0, net: 0 }
  )

  const daysWithEntry = monthEntries.length
  const avgIncome = daysWithEntry > 0 ? totals.income / daysWithEntry : 0

  const currentBiz = BUSINESSES.find(b => b.id === businessId)

  function exportToCsv() {
    if (monthEntries.length === 0) return
    const headers = [
      "Tarih", "Gün", "Nakit", "Kart", "Bilet Nakit", "Bilet Kart",
      "Kasadan→Banka", "Bankadan→Kasa",
      "Toplam Gelir", "Toplam Gider", "Net",
      "Notlar", "Giren",
    ]
    const sorted = [...monthEntries].sort((a, b) => a.date.localeCompare(b.date))
    const rows = [
      headers,
      ...sorted.map((e) => {
        const date = new Date(e.date + "T00:00:00")
        const dayName = DAY_NAMES[date.getDay()]
        return [
          e.date, dayName,
          e.cashIncome, e.cardIncome, e.ticketIncome, e.ticketCardIncome,
          e.kasadanBankaya, e.bankadanKasaya,
          e.totalIncome, e.totalExpense, e.netAmount,
          e.notes, e.enteredBy?.name ?? "",
        ]
      }),
      // Toplam satırı
      [
        "TOPLAM", "",
        totals.cash, totals.card, "", "",
        "", "",
        totals.income, totals.expense, totals.net,
        "", "",
      ],
    ]
    const bizName = currentBiz?.name?.replace(/\s+/g, "-").toLowerCase() ?? "isletme"
    const periodTag = `${year}-${String(month + 1).padStart(2, "0")}`
    downloadCsv(`aylik-tablo-${bizName}-${periodTag}.csv`, rows)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Aylık Tablo</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCsv} disabled={monthEntries.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Excel İndir
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            Yazdır / PDF
          </Button>
        </div>
      </div>

      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{currentBiz?.name}</h1>
        <p className="text-sm text-slate-600">{MONTH_NAMES[month]} {year} — Aylık Tablo</p>
      </div>

      {/* Ay/İşletme kontrolleri */}
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

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
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

      <Tabs defaultValue="genel">
        <TabsList className="print:hidden">
          <TabsTrigger value="genel" className="gap-1.5">
            <TableProperties className="h-3.5 w-3.5" />
            Genel
          </TabsTrigger>
          <TabsTrigger value="kasa" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Kasa
          </TabsTrigger>
          <TabsTrigger value="banka" className="gap-1.5">
            <Banknote className="h-3.5 w-3.5" />
            Banka
          </TabsTrigger>
        </TabsList>

        {/* ───── GENEL TAB ───── */}
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
        </TabsContent>

        {/* ───── KASA TAB ───── */}
        <TabsContent value="kasa" className="mt-4 space-y-4">
          <BalanceTab
            title="Kasa"
            color="emerald"
            startBalance={kasaStart}
            startDate={baslangicTarihi}
            daily={kasaDaily}
            totals={kasaTotals}
            year={year}
            month={month}
          />
        </TabsContent>

        {/* ───── BANKA TAB ───── */}
        <TabsContent value="banka" className="mt-4 space-y-4">
          <BalanceTab
            title="Banka"
            color="blue"
            startBalance={bankaStart}
            startDate={baslangicTarihi}
            daily={bankaDaily}
            totals={bankaTotals}
            year={year}
            month={month}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Kasa/Banka tab içeriği ───────────────────────────────────────────────────

function BalanceTab({
  title,
  color,
  startBalance,
  startDate,
  daily,
  totals,
  year,
  month,
}: {
  title: string
  color: "emerald" | "blue"
  startBalance: number
  startDate: string
  daily: DailyBalance[]
  totals: { inflow: number; outflow: number }
  year: number
  month: number
}) {
  const lastBalance = daily.length > 0 ? daily[daily.length - 1].endBalance : startBalance
  const accent = color === "emerald"
    ? { bgFaint: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", textDark: "text-emerald-900" }
    : { bgFaint: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", textDark: "text-blue-900" }

  if (!startDate) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <Wallet className="w-8 h-8 mx-auto text-amber-600 mb-2" />
        <p className="text-sm font-medium text-amber-900">Başlangıç bakiyesi tanımlanmamış</p>
        <p className="text-xs text-amber-700 mt-1">
          {title} hesabını görmek için <strong>Ayarlar → Kasa & Banka</strong> sekmesinden bu işletme için başlangıç bakiyesi ve tarih girin.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Özet kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={cn("rounded-xl p-3", accent.bgFaint)}>
          <p className={cn("text-xs font-medium", accent.text)}>Başlangıç Bakiyesi</p>
          <p className={cn("text-sm font-bold mt-0.5", accent.textDark)}>{formatCurrency(startBalance)}</p>
          <p className={cn("text-[10px] mt-0.5", accent.text)}>{formatDateShort(startDate)} itibarıyla</p>
        </div>
        <div className="rounded-xl p-3 bg-emerald-50">
          <p className="text-xs text-emerald-700 font-medium">Ay İçi Giriş</p>
          <p className="text-sm font-bold text-emerald-900 mt-0.5">+ {formatCurrency(totals.inflow)}</p>
        </div>
        <div className="rounded-xl p-3 bg-red-50">
          <p className="text-xs text-red-700 font-medium">Ay İçi Çıkış</p>
          <p className="text-sm font-bold text-red-900 mt-0.5">- {formatCurrency(totals.outflow)}</p>
        </div>
        <div className={cn("rounded-xl p-3", accent.bgFaint, "ring-2", accent.border)}>
          <p className={cn("text-xs font-medium", accent.text)}>Ay Sonu Bakiye</p>
          <p className={cn("text-base font-bold mt-0.5", accent.textDark)}>{formatCurrency(lastBalance)}</p>
        </div>
      </div>

      {/* Günlük tablo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Tarih</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-500 w-12 print:hidden">Gün</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Açılış</th>
                <th className="text-right px-4 py-3 font-semibold text-emerald-700">Giriş</th>
                <th className="text-right px-4 py-3 font-semibold text-red-700">Çıkış</th>
                <th className={cn("text-right px-4 py-3 font-bold border-l border-slate-200", accent.text)}>Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => {
                const date = new Date(d.date + "T00:00:00")
                const day = date.getDate()
                const dayName = DAY_NAMES[date.getDay()]
                const isWeekend = [0, 6].includes(date.getDay())
                const hasActivity = d.inflow > 0 || d.outflow > 0
                return (
                  <tr
                    key={d.date}
                    className={cn(
                      "border-b border-slate-100",
                      d.isBeforeStart ? "bg-slate-50/50 text-slate-400" : "",
                      hasActivity ? "hover:bg-slate-50" : ""
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {String(day).padStart(2, "0")}.{String(month + 1).padStart(2, "0")}.{year}
                    </td>
                    <td className={cn("px-3 py-2.5 text-xs font-medium print:hidden", isWeekend ? "text-red-400" : "text-slate-400")}>
                      {dayName}
                    </td>
                    {d.isBeforeStart ? (
                      <td colSpan={4} className="px-4 py-2.5 text-center text-xs text-slate-400">
                        — Başlangıç tarihinden önce —
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                          {formatCurrency(d.startBalance)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">
                          {d.inflow > 0 ? `+ ${formatCurrency(d.inflow)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-600">
                          {d.outflow > 0 ? `- ${formatCurrency(d.outflow)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-bold border-l border-slate-100", accent.textDark)}>
                          {formatCurrency(d.endBalance)}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function formatDateShort(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

// ─── Hesaplama yardımcıları ──────────────────────────────────────────────────

function computeDailyBalances(args: {
  entries: DayEntry[]
  startBalance: number
  startDate: string
  year: number
  month: number
  daysCount: number
  getInflow: (e: DayEntry) => number
  getOutflow: (e: DayEntry) => number
}): DailyBalance[] {
  const { entries, startBalance, startDate, year, month, daysCount, getInflow, getOutflow } = args
  const result: DailyBalance[] = []
  const monthStart = isoDate(year, month, 1)

  const entriesByDate = Object.fromEntries(entries.map((e) => [e.date, e]))

  // Start date'ten ay başına kadar olan hareketleri uygulayarak running balance'ı al
  let running = startBalance
  if (startDate && startDate < monthStart) {
    const sorted = [...entries]
      .filter((e) => e.date >= startDate && e.date < monthStart)
      .sort((a, b) => a.date.localeCompare(b.date))
    for (const e of sorted) {
      running += getInflow(e) - getOutflow(e)
    }
  }

  for (let day = 1; day <= daysCount; day++) {
    const date = isoDate(year, month, day)
    const isBeforeStart = !!startDate && date < startDate
    if (isBeforeStart) {
      result.push({ date, isBeforeStart: true, startBalance: 0, inflow: 0, outflow: 0, endBalance: 0 })
      continue
    }
    const entry = entriesByDate[date]
    const inflow = entry ? getInflow(entry) : 0
    const outflow = entry ? getOutflow(entry) : 0
    const start = running
    const end = start + inflow - outflow
    result.push({ date, isBeforeStart: false, startBalance: start, inflow, outflow, endBalance: end })
    running = end
  }

  return result
}

function sumBalances(daily: DailyBalance[]): { inflow: number; outflow: number } {
  return daily.reduce(
    (acc, d) => ({ inflow: acc.inflow + d.inflow, outflow: acc.outflow + d.outflow }),
    { inflow: 0, outflow: 0 }
  )
}
