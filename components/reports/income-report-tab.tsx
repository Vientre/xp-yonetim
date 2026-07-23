"use client"

import { Download } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsContent } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { BusinessPoint, IncomeResponse, TrendPoint } from "./types"

interface IncomeReportTabProps {
  loading: boolean
  data: IncomeResponse | null
  businessData: BusinessPoint[]
  trendData: TrendPoint[]
  onExport: () => void
}

export function IncomeReportTab({ loading, data, businessData, trendData, onExport }: IncomeReportTabProps) {
  return (
    <TabsContent value="income" className="mt-4 space-y-4">
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              ["Toplam Gelir", data?.summary?.totalIncome ?? 0, "text-green-600"],
              ["Toplam Gider", data?.summary?.totalExpense ?? 0, "text-red-600"],
              ["Net Kar/Zarar", data?.summary?.netAmount ?? 0, (data?.summary?.netAmount ?? 0) >= 0 ? "text-green-700" : "text-red-700"],
            ].map(([label, value, color]) => (
              <Card key={String(label)}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{formatCurrency(Number(value))}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {businessData.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">İşletme Karşılaştırması</CardTitle>
                <Button variant="outline" size="sm" onClick={onExport}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={businessData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Gelir" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {trendData.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Günlük Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value) => formatDate(value, "dd.MM")} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <Tooltip labelFormatter={(value) => formatDate(value as string)} formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" name="Gelir" stroke="#22c55e" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" name="Gider" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Detay Listesi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    {["Tarih", "İşletme", "Gelir", "Gider", "Net"].map((heading, index) => (
                      <th key={heading} className={`${index > 1 ? "text-right" : "text-left"} px-4 py-2 text-xs font-medium text-muted-foreground`}>{heading}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(data?.data ?? []).map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs">{formatDate(entry.date)}</td>
                        <td className="px-4 py-2 text-xs font-medium">{entry.business.name}</td>
                        <td className="px-4 py-2 text-right text-xs text-green-600">{formatCurrency(Number(entry.totalIncome))}</td>
                        <td className="px-4 py-2 text-right text-xs text-red-600">{formatCurrency(Number(entry.totalExpense))}</td>
                        <td className={`px-4 py-2 text-right text-xs font-semibold ${Number(entry.netAmount) >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(Number(entry.netAmount))}</td>
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
  )
}
