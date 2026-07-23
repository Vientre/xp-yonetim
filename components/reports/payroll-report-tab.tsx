import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsContent } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import type { PayrollResponse } from "./types"

interface PayrollReportTabProps {
  loading: boolean
  data: PayrollResponse | null
  onExport: () => void
}

export function PayrollReportTab({ loading, data, onExport }: PayrollReportTabProps) {
  const rows = data?.summary ?? []
  return (
    <TabsContent value="payroll" className="mt-4 space-y-4">
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Personel Ödeme Özeti</CardTitle>
              {data?.saatlikUcret ? <p className="mt-0.5 text-xs text-muted-foreground">Saatlik ücret: {formatCurrency(data.saatlikUcret)} — Taban = Toplam Saat × Saatlik Ücret</p> : null}
            </div>
            <Button variant="outline" size="sm" onClick={onExport}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {["Personel", "Gün", "Saat", "Taban", "Yemek", "Tip", "Kesinti", "Net"].map((heading, index) => (
                    <th key={heading} className={`${index === 0 ? "text-left" : index < 3 ? "text-center" : "text-right"} px-4 py-2 text-xs font-medium text-muted-foreground`}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((entry) => {
                    const net = entry.totalPay + entry.totalTip - entry.totalDeduction
                    return <tr key={entry.name} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{entry.name}</td>
                      <td className="px-4 py-2.5 text-center">{entry.days}</td>
                      <td className="px-4 py-2.5 text-center">{entry.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(entry.totalPay)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-600">{formatCurrency(entry.totalMeal)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">{formatCurrency(entry.totalTip)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(entry.totalDeduction)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-700">{formatCurrency(net)}</td>
                    </tr>
                  })}
                  {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Veri yok</td></tr>}
                </tbody>
                {rows.length > 0 && <tfoot><tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-2">Toplam</td>
                  <td className="px-4 py-2 text-center">{rows.reduce((sum, entry) => sum + entry.days, 0)}</td>
                  <td className="px-4 py-2 text-center">{rows.reduce((sum, entry) => sum + entry.totalHours, 0).toFixed(1)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(rows.reduce((sum, entry) => sum + entry.totalPay, 0))}</td>
                  <td className="px-4 py-2 text-right text-orange-600">{formatCurrency(rows.reduce((sum, entry) => sum + entry.totalMeal, 0))}</td>
                  <td className="px-4 py-2 text-right text-amber-600">{formatCurrency(rows.reduce((sum, entry) => sum + entry.totalTip, 0))}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(rows.reduce((sum, entry) => sum + entry.totalDeduction, 0))}</td>
                  <td className="px-4 py-2 text-right text-blue-700">{formatCurrency(rows.reduce((sum, entry) => sum + entry.totalPay + entry.totalTip - entry.totalDeduction, 0))}</td>
                </tr></tfoot>}
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
