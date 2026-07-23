import { Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { DailyClosing } from "./types"

export function RecentClosings({ closings, editingId, onEdit, onCancelEdit }: {
  closings: DailyClosing[]
  editingId: string | null
  onEdit: (closing: DailyClosing) => void
  onCancelEdit: () => void
}) {
  return (
    <div>
      <Card>
        <CardHeader><CardTitle className="text-base">Son Kayıtlar</CardTitle></CardHeader>
        <CardContent className="p-0">
          {closings.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Henüz kayıt yok</p> : (
            <div className="divide-y">
              {closings.map((closing) => (
                <div key={closing.id} className={`px-4 py-3 transition-colors hover:bg-gray-50 ${editingId === closing.id ? "bg-amber-50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{closing.business.name}</p><p className="text-xs text-muted-foreground">{formatDate(closing.date)}</p></div>
                    <div className="flex-shrink-0 text-right"><p className="text-xs font-medium text-green-600">+{formatCurrency(Number(closing.totalIncome))}</p><p className="text-xs text-red-500">-{formatCurrency(Number(closing.totalExpense))}</p></div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${Number(closing.netAmount) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(Number(closing.netAmount))}</span>
                    <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={() => editingId === closing.id ? onCancelEdit() : onEdit(closing)}>
                      {editingId === closing.id ? <><X className="h-3 w-3" />İptal</> : <><Pencil className="h-3 w-3" />Düzenle</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
