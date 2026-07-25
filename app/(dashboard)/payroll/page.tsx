"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { addWeeks, format, startOfWeek, subWeeks } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Printer,
  Users,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BUSINESSES } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"

type PaymentStatus = "bekliyor" | "kismi" | "odendi"

interface PayrollRecord {
  date: string
  business: string
  hours: number
  meal: number
  tip: number
  deduction: number
  overtime: number
  notes: string
}

interface EmployeePayroll {
  name: string
  businesses: string[]
  days: number
  totalHours: number
  hourlyRate: number
  basePay: number
  totalOvertime: number
  overtimeMultiplier: number
  overtimePay: number
  totalMeal: number
  totalTip: number
  totalDeduction: number
  netPay: number
  paidAmount: number
  remainingAmount: number
  status: PaymentStatus
  records: PayrollRecord[]
}

interface PayrollData {
  weekStart: string
  weekEnd: string
  paymentDate: string
  defaultHourlyRate: number
  employees: EmployeePayroll[]
  totals: {
    employees: number
    totalHours: number
    netPay: number
    paidAmount: number
    remainingAmount: number
  }
}

function previousWeekMonday(): string {
  return format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd")
}

function moveWeek(weekStart: string, amount: number): string {
  return format(addWeeks(new Date(`${weekStart}T12:00:00`), amount), "yyyy-MM-dd")
}

function trDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00`), "d MMMM yyyy", { locale: tr })
}

const statusLabels: Record<PaymentStatus, string> = {
  bekliyor: "Bekliyor",
  kismi: "Kısmi ödendi",
  odendi: "Ödendi",
}

export default function PayrollPage() {
  const [weekStart, setWeekStart] = useState(previousWeekMonday)
  const [businessId, setBusinessId] = useState("all")
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [payingEmployee, setPayingEmployee] = useState<EmployeePayroll | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "banka">("banka")
  const [paymentNote, setPaymentNote] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)

  const loadPayroll = useCallback(async () => {
    const params = new URLSearchParams({ weekStart })
    if (businessId !== "all") params.set("businessId", businessId)
    const response = await fetch(`/api/payroll?${params}`)
    const result = await response.json()
    if (!response.ok) {
      toast.error(result.error || "Bordro yüklenemedi")
      setData(null)
    } else {
      setData(result)
    }
    setLoading(false)
  }, [weekStart, businessId])

  useEffect(() => {
    void loadPayroll()
  }, [loadPayroll])

  function changeWeek(next: string) {
    setLoading(true)
    setWeekStart(next)
    setExpanded(new Set())
  }

  function changeBusiness(next: string) {
    setLoading(true)
    setBusinessId(next)
  }

  function toggleEmployee(name: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function openPayment(employee: EmployeePayroll) {
    setPayingEmployee(employee)
    setPaymentAmount(employee.remainingAmount.toFixed(2))
    setPaymentMethod("banka")
    setPaymentNote("")
  }

  async function savePayment(event: React.FormEvent) {
    event.preventDefault()
    if (!payingEmployee) return

    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > payingEmployee.remainingAmount) {
      toast.error("Geçerli ve kalan tutarı aşmayan bir ödeme girin")
      return
    }

    setSavingPayment(true)
    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          employeeName: payingEmployee.name,
          amount,
          paymentMethod,
          note: paymentNote,
          businessId: businessId === "all" ? undefined : businessId,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Ödeme kaydedilemedi")
        return
      }
      toast.success("Maaş ödemesi kaydedildi")
      setPayingEmployee(null)
      await loadPayroll()
    } finally {
      setSavingPayment(false)
    }
  }

  const totals = data?.totals

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Haftalık Maaş</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pazartesi–Pazar puantajı, takip eden Pazartesi ödenir
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Yazdır / PDF
        </Button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Haftalık Maaş Bordrosu</h1>
        {data && <p>{trDate(data.weekStart)} – {trDate(data.weekEnd)}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeWeek(moveWeek(weekStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-56 text-center">
            <p className="text-sm font-semibold">
              {data ? `${trDate(data.weekStart)} – ${trDate(data.weekEnd)}` : "Hafta yükleniyor"}
            </p>
            {data && <p className="text-xs text-muted-foreground">Ödeme: {trDate(data.paymentDate)}</p>}
          </div>
          <Button variant="outline" size="icon" onClick={() => changeWeek(moveWeek(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" onClick={() => changeWeek(previousWeekMonday())}>
          Son tamamlanan hafta
        </Button>
        <Select value={businessId} onValueChange={changeBusiness}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İşletmeler</SelectItem>
            {BUSINESSES.map((business) => (
              <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}><CardContent className="p-4"><Skeleton className="h-11" /></CardContent></Card>
          ))
        ) : (
          <>
            <Summary icon={Users} label="Personel" value={String(totals?.employees ?? 0)} />
            <Summary icon={Clock} label="Toplam Saat" value={String(totals?.totalHours ?? 0)} />
            <Summary icon={Wallet} label="Net Hakediş" value={formatCurrency(totals?.netPay ?? 0)} />
            <Summary icon={Banknote} label="Ödenen" value={formatCurrency(totals?.paidAmount ?? 0)} />
            <Summary icon={Wallet} label="Kalan" value={formatCurrency(totals?.remainingAmount ?? 0)} accent />
          </>
        )}
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Personel Hakedişleri</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14" />)}
            </div>
          ) : !data?.employees.length ? (
            <p className="py-14 text-center text-muted-foreground">Bu hafta puantaj kaydı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-muted-foreground">
                    <th className="w-8 px-3 py-3 print:hidden" />
                    <th className="px-3 py-3 text-left">Personel</th>
                    <th className="px-3 py-3 text-center">Gün</th>
                    <th className="px-3 py-3 text-center">Saat</th>
                    <th className="px-3 py-3 text-right">Saatlik</th>
                    <th className="px-3 py-3 text-right">Mesai</th>
                    <th className="px-3 py-3 text-right">Net</th>
                    <th className="px-3 py-3 text-right">Ödenen</th>
                    <th className="px-3 py-3 text-right">Kalan</th>
                    <th className="px-3 py-3 text-center">Durum</th>
                    <th className="px-3 py-3 print:hidden" />
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((employee) => (
                    <Fragment key={employee.name}>
                      <tr className="border-b">
                        <td className="px-3 py-3 print:hidden">
                          <Button variant="ghost" size="icon" onClick={() => toggleEmployee(employee.name)}>
                            {expanded.has(employee.name)
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.businesses.join(", ")}</p>
                        </td>
                        <td className="px-3 py-3 text-center">{employee.days}</td>
                        <td className="px-3 py-3 text-center">{employee.totalHours}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(employee.hourlyRate)}</td>
                        <td className="px-3 py-3 text-right">
                          {employee.totalOvertime > 0
                            ? `${employee.totalOvertime}s / ${formatCurrency(employee.overtimePay)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(employee.netPay)}</td>
                        <td className="px-3 py-3 text-right text-emerald-600">{formatCurrency(employee.paidAmount)}</td>
                        <td className="px-3 py-3 text-right font-bold text-blue-700">{formatCurrency(employee.remainingAmount)}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={employee.status === "odendi" ? "success" : employee.status === "kismi" ? "warning" : "secondary"}>
                            {statusLabels[employee.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 print:hidden">
                          <Button
                            size="sm"
                            disabled={employee.remainingAmount <= 0 || businessId !== "all"}
                            onClick={() => openPayment(employee)}
                            title={businessId !== "all" ? "Ödeme için Tüm İşletmeler görünümünü seçin" : undefined}
                          >
                            Ödeme Yap
                          </Button>
                        </td>
                      </tr>
                      {expanded.has(employee.name) && (
                        <tr className="border-b bg-slate-50 print:hidden">
                          <td colSpan={11} className="px-6 py-4">
                            <div className="mb-3 text-xs text-muted-foreground">
                              Normal: {employee.totalHours}s × {formatCurrency(employee.hourlyRate)}
                              {" + "}Mesai: {employee.totalOvertime}s × {employee.overtimeMultiplier}×
                              {employee.totalMeal > 0 && ` + Yemek ${formatCurrency(employee.totalMeal)}`}
                              {employee.totalTip > 0 && ` + Tip ${formatCurrency(employee.totalTip)}`}
                              {employee.totalDeduction > 0 && ` − Kesinti ${formatCurrency(employee.totalDeduction)}`}
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {employee.records.map((record) => (
                                <div key={`${record.date}-${record.business}`} className="rounded border bg-white p-3 text-xs">
                                  <div className="flex justify-between font-medium">
                                    <span>{trDate(record.date)} · {record.business}</span>
                                    <span>{record.hours}s{record.overtime > 0 ? ` + ${record.overtime}s mesai` : ""}</span>
                                  </div>
                                  {(record.meal > 0 || record.tip > 0 || record.deduction > 0) && (
                                    <p className="mt-1 text-muted-foreground">
                                      {record.meal > 0 && `Yemek ${formatCurrency(record.meal)}`}
                                      {record.tip > 0 && `${record.meal > 0 ? " · " : ""}Tip ${formatCurrency(record.tip)}`}
                                      {record.deduction > 0 && `${record.meal > 0 || record.tip > 0 ? " · " : ""}Kesinti −${formatCurrency(record.deduction)}`}
                                    </p>
                                  )}
                                  {record.notes && <p className="mt-1 text-muted-foreground">{record.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(payingEmployee)} onOpenChange={(open) => !open && setPayingEmployee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Maaş Ödemesi</DialogTitle></DialogHeader>
          {payingEmployee && (
            <form onSubmit={savePayment} className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="font-semibold">{payingEmployee.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Net hakediş</span>
                  <span className="text-right">{formatCurrency(payingEmployee.netPay)}</span>
                  <span className="text-muted-foreground">Daha önce ödenen</span>
                  <span className="text-right">{formatCurrency(payingEmployee.paidAmount)}</span>
                  <span className="font-medium">Kalan</span>
                  <span className="text-right font-bold text-blue-700">{formatCurrency(payingEmployee.remainingAmount)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Ödenecek Tutar</Label>
                <Input
                  type="number"
                  min="0.01"
                  max={payingEmployee.remainingAmount}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ödeme Yöntemi</Label>
                <Select value={paymentMethod} onValueChange={(value: "nakit" | "banka") => setPaymentMethod(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banka">Banka</SelectItem>
                    <SelectItem value="nakit">Nakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Not</Label>
                <Textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={savingPayment}>
                {savingPayment ? "Kaydediliyor..." : `${formatCurrency(Number(paymentAmount) || 0)} Öde`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Summary({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${accent ? "text-blue-600" : "text-slate-500"}`} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`truncate font-bold ${accent ? "text-blue-700" : ""}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
