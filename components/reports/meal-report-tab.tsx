import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsContent } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { MealResponse } from "./types"

interface MealReportTabProps {
  loading: boolean
  data: MealResponse | null
}

export function MealReportTab({ loading, data }: MealReportTabProps) {
  return (
    <TabsContent value="meals" className="mt-4 space-y-4">
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Toplam Adet</p>
              <p className="text-3xl font-bold text-orange-600">{data?.summary?.totalQty ?? 0}</p>
              <p className="text-xs text-muted-foreground">yemek siparişi</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
              <p className="text-2xl font-bold">{formatCurrency(data?.summary?.totalPrice ?? 0)}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Sipariş Listesi</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {["Tarih", "İşletme", "Adet", "Toplam"].map((heading, index) => (
                    <th key={heading} className={`${index === 2 ? "text-center" : index === 3 ? "text-right" : "text-left"} px-4 py-2 text-xs font-medium text-muted-foreground`}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody>{(data?.data ?? []).map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs">{formatDate(order.date)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{order.business.name}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-orange-600">{order.count}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{formatCurrency(Number(order.totalCost))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div></CardContent>
          </Card>
        </>
      )}
    </TabsContent>
  )
}
