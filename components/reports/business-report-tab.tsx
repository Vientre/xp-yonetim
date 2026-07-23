"use client"

import { Building2, Download, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsContent } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { BizDetailResponse } from "./types"

interface BusinessReportTabProps {
  loading: boolean
  data: BizDetailResponse | null
  from: string
  to: string
}

function downloadCSV(data: BizDetailResponse, from: string, to: string) {
  let csv = "İşletme,Nakit Gelir,Kart Gelir,Bilet Gelir,Toplam Gelir,Toplam Gider,Net\n"
  csv += data.businesses.map((business) =>
    `${business.name},${business.income.nakit},${business.income.kart},${business.income.bilet},${business.income.total},${business.expense.total},${business.net}`
  ).join("\n")
  csv += `\nTOPLAM,${data.grand.nakit},${data.grand.kart},${data.grand.bilet},${data.grand.gelir},${data.grand.gider},${data.grand.net}`
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `isletme_detay_${from}_${to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function BusinessReportTab({ loading, data, from, to }: BusinessReportTabProps) {
  return (
    <TabsContent value="business" className="mt-4 space-y-6">
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-64 w-full" />)}
        </div>
      ) : (
        <>
          {data?.grand && (
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Toplam Gelir" value={data.grand.gelir} color="green" icon={<TrendingUp className="h-4 w-4 text-green-600" />}>
                <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                  <span>💵 {formatCurrency(data.grand.nakit)}</span>
                  <span>💳 {formatCurrency(data.grand.kart)}</span>
                  <span>🎟 {formatCurrency(data.grand.bilet)}</span>
                </div>
              </SummaryCard>
              <SummaryCard label="Toplam Gider" value={data.grand.gider} color="red" icon={<TrendingDown className="h-4 w-4 text-red-600" />} />
              <SummaryCard label="Net" value={data.grand.net} color={data.grand.net >= 0 ? "blue" : "red"} icon={<Wallet className={`h-4 w-4 ${data.grand.net >= 0 ? "text-blue-600" : "text-red-600"}`} />} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {(data?.businesses ?? []).map((business) => (
              <Card key={business.id} className="overflow-hidden">
                <CardHeader className="border-b bg-gray-50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-muted-foreground" />{business.name}</CardTitle>
                    <Badge variant="outline" className={business.net >= 0 ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}>Net: {formatCurrency(business.net)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-b p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gelir</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        ["Nakit", business.income.nakit, "text-green-700", "bg-green-50"],
                        ["Kart", business.income.kart, "text-blue-700", "bg-blue-50"],
                        ["Bilet", business.income.bilet, "text-amber-700", "bg-amber-50"],
                        ["Toplam", business.income.total, "text-green-800", "bg-green-100"],
                      ].map(([label, value, color, background]) => (
                        <div key={String(label)} className={`rounded-lg p-2.5 text-center ${background}`}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className={`mt-0.5 text-sm font-bold ${color}`}>{formatCurrency(Number(value))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gider Kalemleri</p>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(business.expense.total)}</span>
                    </div>
                    {business.expense.byCategory.length === 0 ? <p className="py-3 text-center text-xs italic text-muted-foreground">Gider kaydı yok</p> : (
                      <div className="space-y-2">
                        {business.expense.byCategory.map((category) => {
                          const percentage = business.expense.total > 0 ? Math.round(category.total / business.expense.total * 100) : 0
                          return <div key={category.name}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5"><div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className="text-gray-700">{category.name}</span></div>
                              <div className="flex items-center gap-2"><span className="text-muted-foreground">{percentage}%</span><span className="font-semibold">{formatCurrency(category.total)}</span></div>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: category.color }} /></div>
                          </div>
                        })}
                      </div>
                    )}
                  </div>
                  {business.dailyRows.length > 0 && (
                    <details className="border-t">
                      <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-gray-50">Günlük Kapanışlar ({business.dailyRows.length} kayıt)</summary>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b bg-gray-50">
                            {["Tarih", "Nakit", "Kart", "Bilet", "Gelir", "Gider", "Net"].map((heading, index) => <th key={heading} className={`${index ? "text-right" : "text-left"} px-4 py-2 font-medium text-muted-foreground`}>{heading}</th>)}
                          </tr></thead>
                          <tbody>{business.dailyRows.map((row) => <tr key={row.date} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2">{formatDate(row.date)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(row.nakit)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(row.kart)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(row.bilet)}</td>
                            <td className="px-4 py-2 text-right font-medium text-green-700">{formatCurrency(row.gelir)}</td>
                            <td className="px-4 py-2 text-right text-red-600">{formatCurrency(row.gider)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${row.gelir - row.gider >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(row.gelir - row.gider)}</td>
                          </tr>)}</tbody>
                          <tfoot><tr className="border-t bg-gray-50 font-semibold">
                            <td className="px-4 py-2">Toplam</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(business.income.nakit)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(business.income.kart)}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(business.income.bilet)}</td>
                            <td className="px-4 py-2 text-right text-green-700">{formatCurrency(business.income.total)}</td>
                            <td className="px-4 py-2 text-right text-red-600">{formatCurrency(business.expense.total)}</td>
                            <td className={`px-4 py-2 text-right ${business.net >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(business.net)}</td>
                          </tr></tfoot>
                        </table>
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={!data} onClick={() => data && downloadCSV(data, from, to)}><Download className="mr-1 h-3.5 w-3.5" />CSV İndir</Button>
          </div>
        </>
      )}
    </TabsContent>
  )
}

function SummaryCard({ label, value, color, icon, children }: { label: string; value: number; color: "green" | "red" | "blue"; icon: React.ReactNode; children?: React.ReactNode }) {
  const styles = { green: "bg-green-100 text-green-600", red: "bg-red-100 text-red-600", blue: "bg-blue-100 text-blue-600" }[color]
  const [background, text] = styles.split(" ")
  return <Card><CardContent className="flex items-center gap-3 p-4">
    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${background}`}>{icon}</div>
    <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${text}`}>{formatCurrency(value)}</p>{children}</div>
  </CardContent></Card>
}
