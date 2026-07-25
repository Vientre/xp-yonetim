"use client"

import type { Dispatch, FormEventHandler, SetStateAction } from "react"
import { Pencil, Plus, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { BUSINESSES } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import type { AttendanceEntry, Employee, EntryRow } from "./types"
import { createEmptyRow as emptyRow } from "./utils"

export function AttendanceForms({ editEntry, setEditEntry, saving, onEditSave, businessId, setBusinessId, date, setDate, rows, setRows, businessEmployees, updateRow, selectEmployee, removeRow, addRow, onBatchSave }: {
  editEntry: AttendanceEntry | null
  setEditEntry: Dispatch<SetStateAction<AttendanceEntry | null>>
  saving: boolean
  onEditSave: FormEventHandler<HTMLFormElement>
  businessId: string
  setBusinessId: (value: string) => void
  date: string
  setDate: (value: string) => void
  rows: EntryRow[]
  setRows: Dispatch<SetStateAction<EntryRow[]>>
  businessEmployees: Employee[]
  updateRow: (index: number, patch: Partial<EntryRow>) => void
  selectEmployee: (index: number, employeeId: string) => void
  removeRow: (index: number) => void
  addRow: () => void
  onBatchSave: FormEventHandler<HTMLFormElement>
}) {
  const handleEditSave = onEditSave
  const handleBatchSave = onBatchSave
  const bizEmployees = businessEmployees
  return (
<div className="xl:col-span-1 space-y-4">

  {/* Edit mode */}
  {editEntry ? (
    <form onSubmit={handleEditSave}>
      <Card className="border-amber-300 ring-1 ring-amber-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Kaydı Düzenle
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditEntry(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
            {editEntry.employeeName} — {formatDate(editEntry.date)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tarih</Label>
            <Input type="date" value={editEntry.date}
              onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Personel Adı</Label>
            <Input value={editEntry.employeeName}
              onChange={(e) => setEditEntry({ ...editEntry, employeeName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Çalışılan Saat</Label>
            <Input type="number" min="0" max="24" step="0.5"
              value={editEntry.hoursWorked}
              onChange={(e) => setEditEntry({ ...editEntry, hoursWorked: parseFloat(e.target.value) || 0 })}
              className="text-center font-bold text-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Yemek", key: "mealAmount" as const },
              { label: "Tip", key: "tipAmount" as const },
              { label: "Kesinti", key: "deductionAmount" as const },
              { label: "Tamirat", key: "repairAmount" as const },
              { label: "Mesai (saat)", key: "mesai" as const },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}{key !== "mesai" ? " (₺)" : ""}</Label>
                <Input type="number" step={key === "mesai" ? "0.5" : "0.01"} min="0"
                  value={editEntry[key]}
                  onChange={(e) => setEditEntry({ ...editEntry, [key]: parseFloat(e.target.value) || 0 })}
                  className="text-right text-xs h-8" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notlar</Label>
            <Input value={editEntry.notes}
              onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Kaydediliyor..." : "Güncelle"}
          </Button>
        </CardContent>
      </Card>
    </form>
  ) : (
    /* Batch entry form */
    <form onSubmit={handleBatchSave}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Toplu Saat Girişi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">İşletme *</Label>
              <Select value={businessId} onValueChange={(v) => { setBusinessId(v); setRows([emptyRow()]) }}>
                <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                <SelectContent>
                  {BUSINESSES.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tarih *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* Employee rows */}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {businessId && bizEmployees.length > 0 ? (
                      <Select
                        value={row.employeeId}
                        onValueChange={(v) => selectEmployee(i, v)}
                      >
                        <SelectTrigger className="h-8 text-sm bg-white">
                          <SelectValue placeholder="Personel seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bizEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Personel adı"
                        value={row.employeeName}
                        onChange={(e) => updateRow(i, { employeeName: e.target.value })}
                        className="h-8 text-sm bg-white"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" min="0" max="24" step="0.5"
                      value={row.hoursWorked}
                      onChange={(e) => updateRow(i, { hoursWorked: parseFloat(e.target.value) || 0 })}
                      className="w-16 text-center font-bold h-8 bg-white text-sm"
                    />
                    <span className="text-xs text-slate-500">s</span>
                  </div>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)}
                      className="text-slate-300 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Optional fields */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={row.mealEnabled} onCheckedChange={(v) => updateRow(i, { mealEnabled: v })} />
                    <Label className="text-xs">Yemek</Label>
                    {row.mealEnabled && (
                      <Input type="number" step="0.01" min="0"
                        value={row.mealAmount}
                        onChange={(e) => updateRow(i, { mealAmount: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-6 text-xs text-right bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={row.tipEnabled} onCheckedChange={(v) => updateRow(i, { tipEnabled: v })} />
                    <Label className="text-xs">Tip</Label>
                    {row.tipEnabled && (
                      <Input type="number" step="0.01" min="0"
                        value={row.tipAmount}
                        onChange={(e) => updateRow(i, { tipAmount: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-6 text-xs text-right bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={row.deductionEnabled} onCheckedChange={(v) => updateRow(i, { deductionEnabled: v })} />
                    <Label className="text-xs">Kesinti</Label>
                    {row.deductionEnabled && (
                      <Input type="number" step="0.01" min="0"
                        value={row.deductionAmount}
                        onChange={(e) => updateRow(i, { deductionAmount: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-6 text-xs text-right bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={row.mesaiEnabled} onCheckedChange={(v) => updateRow(i, { mesaiEnabled: v })} />
                    <Label className="text-xs">Mesai</Label>
                    {row.mesaiEnabled && (
                      <Input type="number" step="0.5" min="0"
                        value={row.mesai}
                        onChange={(e) => updateRow(i, { mesai: parseFloat(e.target.value) || 0 })}
                        className="w-16 h-6 text-xs text-right bg-white" />
                    )}
                    {row.mesaiEnabled && <span className="text-xs text-slate-500">s</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={row.repairEnabled} onCheckedChange={(v) => updateRow(i, { repairEnabled: v })} />
                    <Label className="text-xs">Tamirat</Label>
                    {row.repairEnabled && (
                      <Input type="number" step="0.01" min="0"
                        value={row.repairAmount}
                        onChange={(e) => updateRow(i, { repairAmount: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-6 text-xs text-right bg-white" />
                    )}
                  </div>
                </div>

                <Input
                  placeholder="Not (opsiyonel)"
                  value={row.notes}
                  onChange={(e) => updateRow(i, { notes: e.target.value })}
                  className="h-7 text-xs bg-white"
                />
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addRow}>
            <Plus className="h-4 w-4" /> Personel Ekle
          </Button>

          <Button type="submit" className="w-full" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Kaydediliyor..." : `Tümünü Kaydet (${rows.filter(r => r.employeeName).length} kişi)`}
          </Button>
        </CardContent>
      </Card>
    </form>
  )}
</div>
  )
}
