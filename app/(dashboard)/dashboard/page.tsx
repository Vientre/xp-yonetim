"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Building2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"

// Önceki dönemle karşılaştırma badge'i
function ChangeBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null
  const isPositive = invert ? pct < 0 : pct > 0
  const isNeutral = pct === 0
  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 mt-0.5">
        <Minus className="h-3 w-3" /> Değişim yok
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium mt-0.5 ${isPositive ? "text-green-600" : "text-red-500"}`}>
      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(pct)}% geçen döneme göre
    </span>
  )
}
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"

type Period = "today" | "week" | "month" | "year"

interface BusinessSummary {
  id: string
  name: string
  income: number
  expense: number
  net: number
}

interface Comparison {
  prevIncome: number
  prevExpense: number
  prevNet: number
  prevFromDate: string
  prevToDate: string
  incomeChange: number | null
  expenseChange: number | null
  netChange: number | null
}

interface DashboardData {
  summary: {
    totalIncome: number
    totalExpense: number
    netAmount: number
    cashIncome: number
    cardIncome: number
    ticketIncome: number
  }
  comparison: Comparison
  businessSummary: BusinessSummary[]
  expenseByCategory: Array<{ name: string; color: string; total: number }>
  expenseByCategoryPerBusiness: Record<string, Array<{ name: string; color: string; total: number }>>
  dailyTrend: Array<{ date: string; income: number; expense: number }>
  mealSummary: { totalQuantity: number; totalPrice: number; orderCount: number }
  missingDays: Array<{ businessName: string; date: string }>
  period: string
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Bugün",
  week: "Bu Hafta",
  month: "Bu Ay",
  year: "Bu Yıl",
}

const ALL_BUSINESSES = [
  { id: "kim-sahne", name: "Kim Sahne" },
  { id: "xp-vr", name: "XP VR" },
  { id: "xp-racing", name: "XP Racing" },
  { id: "xp-laser", name: "XP Laser" },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?period=${period}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [period])

  // Merge businessSummary with all businesses (show 0 for missing ones)
  const businessRows: BusinessSummary[] = ALL_BUSINESSES.map((b) => {
    const found = data?.businessSummary.find((s) => s.id === b.id)
    return found ?? { id: b.id, name: b.name, income: 0, expense: 0, net: 0 }
  })

  const totalIncome = data?.summary.totalIncome ?? 0
  const totalExpense = data?.summary.totalExpense ?? 0
  const netAmount = data?.summary.netAmount ?? 0

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{PERIOD_LABELS[period]} için özet görünüm</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="year">Bu Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Uyarılar */}
      {data?.missingDays && data.missingDays.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Eksik Kayıt Uyarısı</p>
            <p className="text-xs text-amber-700 mt-1">Son 7 günde {data.missingDays.length} adet kayıt eksik:</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {data.missingDays.slice(0, 5).map((d, i) => (
                <Badge key={i} variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                  {d.businessName} — {formatDate(d.date)}
                </Badge>
              ))}
              {data.missingDays.length > 5 && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">+{data.missingDays.length - 5} daha</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Genel Toplam */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Toplam Gelir</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                  <ChangeBadge pct={data?.comparison?.incomeChange ?? null} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Toplam Gider</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                  <ChangeBadge pct={data?.comparison?.expenseChange ?? null} invert />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${netAmount >= 0 ? "bg-blue-100" : "bg-red-100"}`}>
                  <Wallet className={`h-5 w-5 ${netAmount >= 0 ? "text-blue-600" : "text-red-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Net Durum</p>
                  <p className={`text-xl font-bold ${netAmount >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(netAmount)}</p>
                  <ChangeBadge pct={data?.comparison?.netChange ?? null} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* İşletme Bazlı Kartlar */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> İşletme Bazlı Durum
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-6 w-28 mb-1" /><Skeleton className="h-4 w-24" /></CardContent></Card>
            ))
          ) : (
            businessRows.map((biz) => (
              <Card key={biz.id} className={biz.income > 0 ? "border-green-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground truncate">{biz.name}</p>
                    {biz.income > 0 ? (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Kayıt Yok</Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(biz.income)}</p>
                  <p className="text-xs text-muted-foreground">Gelir</p>
                  <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Gider</span>
                      <p className="font-medium text-red-600">{formatCurrency(biz.expense)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net</span>
                      <p className={`font-medium ${biz.net >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(biz.net)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Grafikler — satır 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              İşletme Karşılaştırması
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={businessRows} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Gelir" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gelir Kaynağı Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gelir Kaynağı Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : (() => {
              const cash = data?.summary.cashIncome ?? 0
              const card = data?.summary.cardIncome ?? 0
              const ticket = data?.summary.ticketIncome ?? 0
              const total = cash + card + ticket
              if (total === 0) return <p className="text-sm text-muted-foreground text-center py-16">Gelir kaydı yok</p>
              const pieData = [
                { name: "Nakit", value: cash, color: "#22c55e" },
                { name: "Kart", value: card, color: "#3b82f6" },
                { name: "Bilet", value: ticket, color: "#f59e0b" },
              ].filter((d) => d.value > 0)
              return (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-xs">{formatCurrency(d.value)}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(d.value / total * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Günlük Trend */}
      {(data?.dailyTrend?.length ?? 0) > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Günlük Gelir / Gider Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={data!.dailyTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v)
                      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "income" ? "Gelir" : "Gider"]}
                    labelFormatter={(label: string) => {
                      const d = new Date(label)
                      return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`
                    }}
                  />
                  <Legend formatter={(v) => v === "income" ? "Gelir" : "Gider"} />
                  <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gider Kategorileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gider Kategorileri — İşletme Bazlı</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {ALL_BUSINESSES.map((biz) => {
                const cats = data?.expenseByCategoryPerBusiness?.[biz.id] ?? []
                if (cats.length === 0) return (
                  <div key={biz.id}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{biz.name}</p>
                    <p className="text-xs text-slate-400 italic">Gider yok</p>
                  </div>
                )
                return (
                  <div key={biz.id}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{biz.name}</p>
                    <div className="space-y-1.5">
                      {cats.slice(0, 6).map((cat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="flex-1 truncate text-muted-foreground">{cat.name}</span>
                          <span className="font-medium">{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
