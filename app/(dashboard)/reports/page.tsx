"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Download, Calendar, RefreshCw } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"

interface Business { id: string; name: string }

export default function ReportsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([{ id: "all", name: "Tüm İşletmeler" }])
  const [businessId, setBusinessId] = useState("all")
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [data, setData] = useState<any>(null)
  const [payrollData, setPayrollData] = useState<any>(null)
  const [mealData, setMealData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((biz) => {
      setBusinesses([{ id: "all", name: "Tüm İşletmeler" }, ...biz])
    })
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (businessId && businessId !== "all") params.set("businessId", businessId)

    try {
      const [income, payroll, meals] = await Promise.all([
        fetch(`/api/reports?type=income&${params}`).then((r) => r.json()),
        fetch(`/api/reports?type=payroll&${params}`).then((r) => r.json()),
        fetch(`/api/reports?type=meals&${params}`).then((r) => r.json()),
      ])
      setData(income)
      setPayrollData(payroll)
      setMealData(meals)
    } finally {
      setLoading(false)
    }
  }

  function setPreset(months: number) {
    const end = new Date()
    const start = subMonths(new Date(), months - 1)
    setFrom(format(startOfMonth(start), "yyyy-MM-dd"))
    setTo(format(endOfMonth(end), "yyyy-MM-dd"))
  }

  // Günlük trend verisi (kapanışlardan hesapla)
  const trendData = (data?.data ?? []).reduce((acc: any[], c: any) => {
    const dateKey = new Date(c.date).toISOString().split("T")[0]
    const existing = acc.find((d) => d.date === dateKey)
    if (existing) {
      existing.income += Number(c.totalIncome)
      existing.expense += Number(c.totalExpense)
    } else {
      acc.push({ date: dateKey, income: Number(c.totalIncome), expense: Number(c.totalExpense) })
    }
    return acc
  }, [])

  // İşletme bazlı özet
  const bizData = (data?.data ?? []).reduce((acc: any[], c: any) => {
    const existing = acc.find((d) => d.name === c.business.name)
    if (existing) {
      existing.income += Number(c.totalIncome)
      existing.expense += Number(c.totalExpense)
      existing.net = existing.income - existing.expense
    } else {
      acc.push({
        name: c.business.name,
        income: Number(c.totalIncome),
        expense: Number(c.totalExpense),
        net: Number(c.totalIncome) - Number(c.totalExpense),
      })
    }
    return acc
  }, [])

  async function exportCSV(type: string) {
    const params = new URLSearchParams({ type, from, to })
    if (businessId && businessId !== "all") params.set("businessId", businessId)

    const res = await fetch(`/api/reports?${params}`)
    const json = await res.json()

    let csv = ""
    if (type === "income") {
      csv = "Tarih,İşletme,Nakit Gelir,Kart Gelir,Bilet Gelir,Toplam Gelir,Toplam Gider,Net\n"
      csv += (json.data ?? []).map((c: any) =>
        `${formatDate(c.date)},${c.business.name},${c.cashIncome},${c.cardIncome},${c.ticketIncome},${c.totalIncome},${c.totalExpense},${c.netAmount}`
      ).join("\n")
    } else if (type === "payroll") {
      csv = "Personel,Toplam Gün,Toplam Saat,Taban Ücret,Yemek,Tip,Kesinti,Net Ödeme\n"
      csv += (json.summary ?? []).map((e: any) => {
        const net = (e.totalPay ?? 0) + (e.totalTip ?? 0) - (e.totalDeduction ?? 0)
        return `${e.name},${e.days},${e.totalHours.toFixed(1)},${(e.totalPay ?? 0).toFixed(2)},${(e.totalMeal ?? 0).toFixed(2)},${(e.totalTip ?? 0).toFixed(2)},${(e.totalDeduction ?? 0).toFixed(2)},${net.toFixed(2)}`
      }).join("\n")
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rapor_${type}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gelir, gider, personel ve yemek raporları</p>
        </div>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">İşletme</Label>
              <Select value={businessId} onValueChange={setBusinessId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
            </div>
            <div className="flex gap-2">
              {[
                { label: "Bu Ay", months: 1 },
                { label: "3 Ay", months: 3 },
                { label: "6 Ay", months: 6 },
              ].map((p) => (
                <Button
                  key={p.months}
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset(p.months)}
                  className="text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Button onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Güncelle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Gelir-Gider</TabsTrigger>
          <TabsTrigger value="payroll">Personel Ödemeleri</TabsTrigger>
          <TabsTrigger value="meals">Yemek Özeti</TabsTrigger>
        </TabsList>

        {/* GELİR GİDER */}
        <TabsContent value="income" className="space-y-4 mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {/* Özet Kartlar */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Toplam Gelir</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data?.summary?.totalIncome ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Toplam Gider</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data?.summary?.totalExpense ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Net Kar/Zarar</p>
                    <p className={`text-2xl font-bold ${(data?.summary?.netAmount ?? 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(data?.summary?.netAmount ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* İşletme Grafiği */}
              {bizData.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">İşletme Karşılaştırması</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("income")}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={bizData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="income" name="Gelir" fill="#22c55e" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Günlük Trend */}
              {trendData.length > 1 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Günlük Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => formatDate(v, "dd.MM")} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip labelFormatter={(v) => formatDate(v as string)} formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="income" name="Gelir" stroke="#22c55e" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="expense" name="Gider" stroke="#ef4444" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detay Tablosu */}
              <Card>
                <CardHeader><CardTitle className="text-base">Detay Listesi</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tarih</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İşletme</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Gelir</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Gider</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.data ?? []).map((c: any) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs">{formatDate(c.date)}</td>
                            <td className="px-4 py-2 text-xs font-medium">{c.business.name}</td>
                            <td className="px-4 py-2 text-xs text-right text-green-600">{formatCurrency(Number(c.totalIncome))}</td>
                            <td className="px-4 py-2 text-xs text-right text-red-600">{formatCurrency(Number(c.totalExpense))}</td>
                            <td className={`px-4 py-2 text-xs text-right font-semibold ${Number(c.netAmount) >= 0 ? "text-green-700" : "text-red-700"}`}>
                              {formatCurrency(Number(c.netAmount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* PERSONEL */}
        <TabsContent value="payroll" className="space-y-4 mt-4">
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Personel Ödeme Özeti</CardTitle>
                  {payrollData?.saatlikUcret && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saatlik ücret: {formatCurrency(payrollData.saatlikUcret)} — Taban = Toplam Saat × Saatlik Ücret
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => exportCSV("payroll")}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Personel</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Gün</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Saat</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Taban</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Yemek</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Tip</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Kesinti</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payrollData?.summary ?? []).map((e: any) => {
                        const net = (e.totalPay ?? 0) + (e.totalTip ?? 0) - (e.totalDeduction ?? 0)
                        return (
                          <tr key={e.name} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-sm">{e.name}</td>
                            <td className="px-4 py-2.5 text-center text-sm">{e.days}</td>
                            <td className="px-4 py-2.5 text-center text-sm">{e.totalHours.toFixed(1)}</td>
                            <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(e.totalPay)}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-orange-600">{formatCurrency(e.totalMeal)}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-amber-600">{formatCurrency(e.totalTip)}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-red-600">{formatCurrency(e.totalDeduction)}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold text-blue-700">{formatCurrency(net)}</td>
                          </tr>
                        )
                      })}
                      {(payrollData?.summary ?? []).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Veri yok</td></tr>
                      )}
                    </tbody>
                    {(payrollData?.summary ?? []).length > 0 && (
                      <tfoot>
                        <tr className="border-t bg-gray-50 font-semibold">
                          <td className="px-4 py-2">Toplam</td>
                          <td className="px-4 py-2 text-center">{(payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.days, 0)}</td>
                          <td className="px-4 py-2 text-center">{(payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.totalHours, 0).toFixed(1)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency((payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.totalPay, 0))}</td>
                          <td className="px-4 py-2 text-right text-orange-600">{formatCurrency((payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.totalMeal, 0))}</td>
                          <td className="px-4 py-2 text-right text-amber-600">{formatCurrency((payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.totalTip, 0))}</td>
                          <td className="px-4 py-2 text-right text-red-600">{formatCurrency((payrollData?.summary ?? []).reduce((s: number, e: any) => s + e.totalDeduction, 0))}</td>
                          <td className="px-4 py-2 text-right text-blue-700">
                            {formatCurrency((payrollData?.summary ?? []).reduce((s: number, e: any) => s + (e.totalPay ?? 0) + (e.totalTip ?? 0) - (e.totalDeduction ?? 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* YEMEK */}
        <TabsContent value="meals" className="space-y-4 mt-4">
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Toplam Adet</p>
                    <p className="text-3xl font-bold text-orange-600">{mealData?.summary?.totalQty ?? 0}</p>
                    <p className="text-xs text-muted-foreground">yemek siparişi</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                    <p className="text-2xl font-bold">{formatCurrency(mealData?.summary?.totalPrice ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Sipariş Listesi</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tarih</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İşletme</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Adet</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mealData?.data ?? []).map((o: any) => (
                          <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs">{formatDate(o.date)}</td>
                            <td className="px-4 py-2.5 text-xs font-medium">{o.business.name}</td>
                            <td className="px-4 py-2.5 text-center text-sm font-bold text-orange-600">{o.count}</td>
                            <td className="px-4 py-2.5 text-right text-xs">{formatCurrency(Number(o.totalCost))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
