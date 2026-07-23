"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Wallet, Banknote, TableProperties } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BUSINESSES } from "@/lib/constants"
import { downloadCsv } from "@/lib/csv"
import { BalanceTab } from "@/components/monthly-table/balance-tab"
import { GeneralTab } from "@/components/monthly-table/general-tab"
import { MonthlyTableHeader } from "@/components/monthly-table/monthly-table-header"
import type { DailyBalance, DayEntry } from "@/components/monthly-table/types"
import {
  computeDailyBalances,
  DAY_NAMES,
  expenseTotalByMethod,
  getDaysInMonth,
  isoDate,
  MONTH_NAMES,
  sumBalances,
} from "@/components/monthly-table/utils"


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
  const [analysis, setAnalysis] = useState<string>("")
  const [analysisLoading, setAnalysisLoading] = useState(false)

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

  // Gider kategorileri özeti (tüm günlerin giderleri kategori bazında toplanır)
  const expenseCategoryTotals = useMemo(() => {
    const map: Record<string, { name: string; color: string; total: number }> = {}
    for (const entry of monthEntries) {
      for (const exp of entry.expenses) {
        const key = exp.categoryId
        if (!map[key]) map[key] = { name: exp.category.name, color: exp.category.color, total: 0 }
        map[key].total += exp.amount
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [monthEntries])

  async function fetchAnalysis() {
    setAnalysisLoading(true)
    setAnalysis("")
    try {
      const res = await fetch("/api/aylik-analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: currentBiz?.name,
          monthLabel: `${MONTH_NAMES[month]} ${year}`,
          totals: { ...totals, avgIncome },
          expenseCategories: expenseCategoryTotals,
          daysWithEntry,
          daysInMonth: daysCount,
        }),
      })
      const data = await res.json()
      setAnalysis(data.analysis ?? data.error ?? "Analiz alınamadı.")
    } catch {
      setAnalysis("Bağlantı hatası oluştu.")
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Ay veya işletme değişince analizi sıfırla
  useEffect(() => { setAnalysis("") }, [businessId, month, year])

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
      <MonthlyTableHeader
        year={year}
        month={month}
        businessId={businessId}
        businessName={currentBiz?.name}
        exportDisabled={monthEntries.length === 0}
        onPreviousMonth={prevMonth}
        onNextMonth={nextMonth}
        onBusinessChange={setBusinessId}
        onExport={exportToCsv}
      />


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
        <GeneralTab
          totals={totals}
          avgIncome={avgIncome}
          loading={loading}
          daysCount={daysCount}
          year={year}
          month={month}
          entryByDate={entryByDate}
          expandedRows={expandedRows}
          onToggleRow={toggleRow}
          expenseCategoryTotals={expenseCategoryTotals}
          businessName={currentBiz?.name}
          analysis={analysis}
          analysisLoading={analysisLoading}
          monthEntriesCount={monthEntries.length}
          onAnalyze={() => void fetchAnalysis()}
        />


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
