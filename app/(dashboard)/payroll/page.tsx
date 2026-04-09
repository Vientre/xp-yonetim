"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Printer, ChevronDown, ChevronUp, Users, Clock, Wallet, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { format, addMonths, subMonths } from "date-fns"
import { BUSINESSES } from "@/lib/constants"

const TR_MONTHS: Record<string, string> = {
  "01": "Ocak", "02": "Şubat", "03": "Mart", "04": "Nisan",
  "05": "Mayıs", "06": "Haziran", "07": "Temmuz", "08": "Ağustos",
  "09": "Eylül", "10": "Ekim", "11": "Kasım", "12": "Aralık",
}
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]

function monthLabel(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-")
  return `${TR_MONTHS[month] ?? month} ${year}`
}

interface Employee {
  name: string
  businesses: string[]
  days: number
  totalHours: number
  basePay: number
  totalMesai: number
  mesaiOdeme: number
  totalMeal: number
  totalTip: number
  totalDeduction: number
  netPay: number
  records: Array<{ date: string; business: string; hours: number; meal: number; tip: number; deduction: number; mesai: number; notes: string }>
}

interface PayrollData {
  employees: Employee[]
  totals: { days: number; totalHours: number; basePay: number; totalMesai: number; mesaiOdeme: number; totalMeal: number; totalTip: number; totalDeduction: number; netPay: number }
  saatlikUcret: number
  month: string
}

export default function PayrollPage() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [businessId, setBusinessId] = useState("all")
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (businessId !== "all") params.set("businessId", businessId)
    fetch(`/api/payroll?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month, businessId])

  function toggleExpand(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function prevMonth() {
    setMonth(format(subMonths(new Date(month + "-01"), 1), "yyyy-MM"))
  }
  function nextMonth() {
    setMonth(format(addMonths(new Date(month + "-01"), 1), "yyyy-MM"))
  }

  const employees = data?.employees ?? []
  const totals = data?.totals

  return (
    <div className="space-y-6">
      {/* Header - hidden in print */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maaş Bordrosu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Puantaj kayıtlarından otomatik hesaplanır
            {data?.saatlikUcret ? ` — Saatlik ücret: ${formatCurrency(data.saatlikUcret)}` : ""}
          </p>
        </div>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Yazdır / PDF
        </Button>
      </div>

      {/* Print header - only visible in print */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Maaş Bordrosu — {monthLabel(month)}</h1>
        <p className="text-sm text-gray-600 mt-1">
          Saatlik ücret: {formatCurrency(data?.saatlikUcret ?? 0)} | Toplam personel: {employees.length} | Oluşturulma: {format(new Date(), "dd.MM.yyyy HH:mm")}
        </p>
        <hr className="mt-3" />
      </div>

      {/* Filters - hidden in print */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{monthLabel(month)}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={businessId} onValueChange={setBusinessId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İşletmeler</SelectItem>
            {BUSINESSES.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards - hidden in print */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Personel</p>
                  <p className="text-xl font-bold">{employees.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Saat</p>
                  <p className="text-xl font-bold">{totals?.totalHours ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taban Ücret</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totals?.basePay ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Toplam</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(totals?.netPay ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Table */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:py-2">
          <CardTitle className="text-base">
            {monthLabel(month)} Bordro Detayı
            {data?.saatlikUcret && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Saatlik ücret: {formatCurrency(data.saatlikUcret)})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Bu ay puantaj kaydı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground print:hidden w-8"></th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Personel</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">İşletme</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Gün</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Saat</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Taban</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Mesai</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Yemek</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Tip</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Kesinti</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <>
                      <tr
                        key={emp.name}
                        className="border-b hover:bg-gray-50 cursor-pointer print:cursor-default"
                        onClick={() => toggleExpand(emp.name)}
                      >
                        <td className="px-4 py-3 print:hidden">
                          {expanded.has(emp.name)
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3 font-semibold">{emp.name}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {emp.businesses.map((b, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm">{emp.days}</td>
                        <td className="px-3 py-3 text-center font-medium text-purple-700">{emp.totalHours}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(emp.basePay)}</td>
                        <td className="px-3 py-3 text-right text-orange-500 hidden sm:table-cell">
                          {emp.totalMesai > 0 ? <span title={`${emp.totalMesai}s × 2x`}>{formatCurrency(emp.mesaiOdeme)}</span> : "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-orange-600 hidden sm:table-cell">{formatCurrency(emp.totalMeal)}</td>
                        <td className="px-3 py-3 text-right text-amber-600 hidden sm:table-cell">{formatCurrency(emp.totalTip)}</td>
                        <td className="px-3 py-3 text-right text-red-500 hidden sm:table-cell">
                          {emp.totalDeduction > 0 ? `−${formatCurrency(emp.totalDeduction)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-blue-700 text-base">{formatCurrency(emp.netPay)}</span>
                        </td>
                      </tr>
                      {/* Expanded daily records */}
                      {expanded.has(emp.name) && (
                        <tr key={`${emp.name}-detail`} className="print:hidden">
                          <td colSpan={11} className="bg-slate-50 px-6 pb-4 pt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Günlük Kayıtlar</p>
                            <table className="w-full text-xs border rounded overflow-hidden">
                              <thead>
                                <tr className="bg-white border-b">
                                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Tarih</th>
                                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">İşletme</th>
                                  <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Saat</th>
                                  <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Mesai</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Yemek</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Tip</th>
                                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Kesinti</th>
                                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Not</th>
                                </tr>
                              </thead>
                              <tbody>
                                {emp.records.map((rec, i) => {
                                  const d = new Date(rec.date)
                                  return (
                                    <tr key={i} className="border-b last:border-0 bg-white">
                                      <td className="px-3 py-1.5">
                                        {TR_DAYS[d.getDay()]} {d.getDate().toString().padStart(2, "0")}.{String(d.getMonth() + 1).padStart(2, "0")}
                                      </td>
                                      <td className="px-3 py-1.5 text-muted-foreground">{rec.business}</td>
                                      <td className="px-3 py-1.5 text-center font-medium text-purple-700">{rec.hours}</td>
                                      <td className="px-3 py-1.5 text-center text-orange-500">{rec.mesai > 0 ? `${rec.mesai}s` : "—"}</td>
                                      <td className="px-3 py-1.5 text-right">{rec.meal > 0 ? formatCurrency(rec.meal) : "—"}</td>
                                      <td className="px-3 py-1.5 text-right">{rec.tip > 0 ? formatCurrency(rec.tip) : "—"}</td>
                                      <td className="px-3 py-1.5 text-right text-red-500">{rec.deduction > 0 ? `−${formatCurrency(rec.deduction)}` : "—"}</td>
                                      <td className="px-3 py-1.5 text-muted-foreground">{rec.notes || "—"}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                            <p className="text-xs text-muted-foreground mt-2">
                              Taban: {emp.totalHours} saat × {formatCurrency(data?.saatlikUcret ?? 0)} = {formatCurrency(emp.basePay)}
                              {emp.totalMesai > 0 && ` + Mesai: ${emp.totalMesai}s × 2 × ${formatCurrency(data?.saatlikUcret ?? 0)} = ${formatCurrency(emp.mesaiOdeme)}`}
                              {emp.totalTip > 0 && ` + Tip ${formatCurrency(emp.totalTip)}`}
                              {emp.totalDeduction > 0 && ` − Kesinti ${formatCurrency(emp.totalDeduction)}`}
                              {" = "}<strong>Net {formatCurrency(emp.netPay)}</strong>
                            </p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr className="border-t-2 bg-slate-50 font-semibold">
                      <td className="print:hidden" />
                      <td className="px-4 py-3 font-bold">TOPLAM</td>
                      <td className="hidden md:table-cell" />
                      <td className="px-3 py-3 text-center">{totals.days}</td>
                      <td className="px-3 py-3 text-center text-purple-700">{totals.totalHours}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.basePay)}</td>
                      <td className="px-3 py-3 text-right text-orange-500 hidden sm:table-cell">
                        {totals.mesaiOdeme > 0 ? formatCurrency(totals.mesaiOdeme) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600 hidden sm:table-cell">{formatCurrency(totals.totalMeal)}</td>
                      <td className="px-3 py-3 text-right text-amber-600 hidden sm:table-cell">{formatCurrency(totals.totalTip)}</td>
                      <td className="px-3 py-3 text-right text-red-500 hidden sm:table-cell">
                        {totals.totalDeduction > 0 ? `−${formatCurrency(totals.totalDeduction)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-blue-700 text-lg">{formatCurrency(totals.netPay)}</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-500 border-t pt-4">
        <p>Saatlik ücret: {formatCurrency(data?.saatlikUcret ?? 0)} | Net = (Saat × Saatlik Ücret) + (Mesai × 2 × Saatlik Ücret) + Tip − Kesinti</p>
        <p className="mt-1">Bu belge otomatik olarak oluşturulmuştur.</p>
      </div>
    </div>
  )
}
