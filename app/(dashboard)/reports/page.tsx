"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import { BusinessReportTab } from "@/components/reports/business-report-tab"
import { IncomeReportTab } from "@/components/reports/income-report-tab"
import { MealReportTab } from "@/components/reports/meal-report-tab"
import { PayrollReportTab } from "@/components/reports/payroll-report-tab"
import { ReportFilters } from "@/components/reports/report-filters"
import type {
  BizDetailResponse,
  Business,
  BusinessPoint,
  IncomeResponse,
  MealResponse,
  PayrollResponse,
  TrendPoint,
} from "@/components/reports/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/utils"

export default function ReportsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([{ id: "all", name: "Tüm İşletmeler" }])
  const [businessId, setBusinessId] = useState("all")
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [incomeData, setIncomeData] = useState<IncomeResponse | null>(null)
  const [payrollData, setPayrollData] = useState<PayrollResponse | null>(null)
  const [mealData, setMealData] = useState<MealResponse | null>(null)
  const [businessDetail, setBusinessDetail] = useState<BizDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("business")

  const loadAll = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (businessId !== "all") params.set("businessId", businessId)

    try {
      const [income, payroll, meals, detail] = await Promise.all([
        fetch(`/api/reports?type=income&${params}`).then((response) => response.json() as Promise<IncomeResponse>),
        fetch(`/api/reports?type=payroll&${params}`).then((response) => response.json() as Promise<PayrollResponse>),
        fetch(`/api/reports?type=meals&${params}`).then((response) => response.json() as Promise<MealResponse>),
        fetch(`/api/reports/business-detail?from=${from}&to=${to}`).then((response) => response.json() as Promise<BizDetailResponse>),
      ])
      setIncomeData(income)
      setPayrollData(payroll)
      setMealData(meals)
      setBusinessDetail(detail)
    } finally {
      setLoading(false)
    }
  }, [businessId, from, to])

  useEffect(() => {
    fetch("/api/businesses")
      .then((response) => response.json() as Promise<Business[]>)
      .then((items) => setBusinesses([{ id: "all", name: "Tüm İşletmeler" }, ...items]))
    void loadAll()
  }, [loadAll])

  const trendData = useMemo(() => (incomeData?.data ?? []).reduce<TrendPoint[]>((result, entry) => {
    const date = new Date(entry.date).toISOString().split("T")[0]
    const current = result.find((point) => point.date === date)
    if (current) {
      current.income += Number(entry.totalIncome)
      current.expense += Number(entry.totalExpense)
    } else {
      result.push({ date, income: Number(entry.totalIncome), expense: Number(entry.totalExpense) })
    }
    return result
  }, []), [incomeData])

  const businessData = useMemo(() => (incomeData?.data ?? []).reduce<BusinessPoint[]>((result, entry) => {
    const current = result.find((point) => point.name === entry.business.name)
    if (current) {
      current.income += Number(entry.totalIncome)
      current.expense += Number(entry.totalExpense)
      current.net = current.income - current.expense
    } else {
      result.push({
        name: entry.business.name,
        income: Number(entry.totalIncome),
        expense: Number(entry.totalExpense),
        net: Number(entry.totalIncome) - Number(entry.totalExpense),
      })
    }
    return result
  }, []), [incomeData])

  function setPreset(months: number) {
    const start = subMonths(new Date(), months - 1)
    setFrom(format(startOfMonth(start), "yyyy-MM-dd"))
    setTo(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  }

  async function exportCSV(type: "income" | "payroll") {
    const params = new URLSearchParams({ type, from, to })
    if (businessId !== "all") params.set("businessId", businessId)
    const response = await fetch(`/api/reports?${params}`)
    const json = await response.json() as IncomeResponse | PayrollResponse
    let csv = ""

    if (type === "income") {
      csv = "Tarih,İşletme,Nakit Gelir,Kart Gelir,Bilet Gelir,Toplam Gelir,Toplam Gider,Net\n"
      csv += (json as IncomeResponse).data.map((entry) =>
        `${formatDate(entry.date)},${entry.business.name},${entry.cashIncome},${entry.cardIncome},${entry.ticketIncome},${entry.totalIncome},${entry.totalExpense},${entry.netAmount}`
      ).join("\n")
    } else {
      csv = "Personel,Toplam Gün,Toplam Saat,Taban Ücret,Yemek,Tip,Kesinti,Net Ödeme\n"
      csv += (json as PayrollResponse).summary.map((entry) => {
        const net = entry.totalPay + entry.totalTip - entry.totalDeduction
        return `${entry.name},${entry.days},${entry.totalHours.toFixed(1)},${entry.totalPay.toFixed(2)},${entry.totalMeal.toFixed(2)},${entry.totalTip.toFixed(2)},${entry.totalDeduction.toFixed(2)},${net.toFixed(2)}`
      }).join("\n")
    }

    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `rapor_${type}_${from}_${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gelir, gider, personel ve yemek raporları</p>
      </div>

      <ReportFilters
        businesses={businesses}
        businessId={businessId}
        from={from}
        to={to}
        loading={loading}
        onBusinessChange={setBusinessId}
        onFromChange={setFrom}
        onToChange={setTo}
        onPreset={setPreset}
        onRefresh={() => void loadAll()}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="business">İşletme Bazlı</TabsTrigger>
          <TabsTrigger value="income">Gelir-Gider</TabsTrigger>
          <TabsTrigger value="payroll">Personel Ödemeleri</TabsTrigger>
          <TabsTrigger value="meals">Yemek Özeti</TabsTrigger>
        </TabsList>
        <BusinessReportTab loading={loading} data={businessDetail} from={from} to={to} />
        <IncomeReportTab loading={loading} data={incomeData} businessData={businessData} trendData={trendData} onExport={() => void exportCSV("income")} />
        <PayrollReportTab loading={loading} data={payrollData} onExport={() => void exportCSV("payroll")} />
        <MealReportTab loading={loading} data={mealData} />
      </Tabs>
    </div>
  )
}
