"use client"

import { CalendarCheck, Clock, Pencil, Trash2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { AttendanceEntry, EmployeeAttendanceTotal } from "./types"

interface AttendanceRecordsProps {
  entries: AttendanceEntry[]
  employeeTotals: Record<string, EmployeeAttendanceTotal>
  editingId?: string
  deletingId: string | null
  onEdit: (entry: AttendanceEntry) => void
  onCancelEdit: () => void
  onDelete: (entry: AttendanceEntry) => void
}

export function AttendanceRecords({
  entries,
  employeeTotals,
  editingId,
  deletingId,
  onEdit,
  onCancelEdit,
  onDelete,
}: AttendanceRecordsProps) {
  return (
    <div className="space-y-4 xl:col-span-2">
      {Object.keys(employeeTotals).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Bu Ay Personel Özeti</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                {["Personel", "Saat", "Mesai", "Yemek", "Tip", "Kesinti"].map((heading, index) => (
                  <th key={heading} className={`${index ? "text-right" : "text-left"} px-4 py-2 text-xs font-medium text-muted-foreground`}>{heading}</th>
                ))}
              </tr></thead>
              <tbody>
                {Object.entries(employeeTotals).sort(([, a], [, b]) => b.hours - a.hours).map(([name, total]) => (
                  <tr key={name} className="border-b last:border-0">
                    <td className="px-4 py-2 text-xs font-medium">{name}</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-blue-600">{total.hours}s</td>
                    <td className="px-4 py-2 text-right text-xs text-orange-600">{total.mesai > 0 ? `${total.mesai}s` : "-"}</td>
                    <td className="px-4 py-2 text-right text-xs">{total.meal > 0 ? formatCurrency(total.meal) : "-"}</td>
                    <td className="px-4 py-2 text-right text-xs">{total.tip > 0 ? formatCurrency(total.tip) : "-"}</td>
                    <td className="px-4 py-2 text-right text-xs text-red-600">{total.deduction > 0 ? formatCurrency(total.deduction) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="h-4 w-4" />Tüm Kayıtlar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                {["Tarih", "Personel", "İşletme", "Saat", "Mesai", "Yemek", "Tip", "Kesinti", "Not"].map((heading, index) => (
                  <th key={heading} className={`${index >= 3 && index <= 7 ? "text-right" : "text-left"} px-4 py-2 text-xs font-medium text-muted-foreground`}>{heading}</th>
                ))}
                <th className="w-16 px-2 py-2" />
              </tr></thead>
              <tbody>
                {entries.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">Kayıt yok</td></tr> : entries.map((entry) => (
                  <tr key={entry.id} className={`border-b last:border-0 hover:bg-gray-50 ${editingId === entry.id ? "bg-amber-50" : ""}`}>
                    <td className="px-4 py-2.5 text-xs">{formatDate(entry.date)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{entry.employeeName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.business.name}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-blue-600">{entry.hoursWorked}s</td>
                    <td className="px-4 py-2.5 text-right text-xs text-orange-600">{entry.mesai > 0 ? `${entry.mesai}s` : "-"}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{entry.mealAmount > 0 ? formatCurrency(entry.mealAmount) : "-"}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{entry.tipAmount > 0 ? formatCurrency(entry.tipAmount) : "-"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-600">{entry.deductionAmount > 0 ? formatCurrency(entry.deductionAmount) : "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.notes || "-"}</td>
                    <td className="px-2 py-2.5"><div className="flex gap-1">
                      <button type="button" onClick={() => editingId === entry.id ? onCancelEdit() : onEdit(entry)} className="rounded p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                        {editingId === entry.id ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => onDelete(entry)} disabled={deletingId === entry.id} className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
