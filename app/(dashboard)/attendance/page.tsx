"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarCheck, Save, Plus, Clock, Pencil, Trash2, X, Users, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { BUSINESSES } from "@/lib/constants"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; businessId: string }

interface AttendanceEntry {
  id: string
  date: string
  employeeName: string
  businessId: string
  business: { name: string }
  hoursWorked: number
  mealAmount: number
  tipAmount: number
  deductionAmount: number
  notes: string
}

interface EntryRow {
  employeeId: string   // selected employee id (or "__custom__")
  employeeName: string
  hoursWorked: number
  mealEnabled: boolean; mealAmount: number
  tipEnabled: boolean;  tipAmount: number
  deductionEnabled: boolean; deductionAmount: number
  notes: string
}

function emptyRow(): EntryRow {
  return {
    employeeId: "", employeeName: "",
    hoursWorked: 8,
    mealEnabled: false, mealAmount: 0,
    tipEnabled: false,  tipAmount: 0,
    deductionEnabled: false, deductionAmount: 0,
    notes: "",
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  // ── State ──
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Batch entry form
  const [businessId, setBusinessId] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [rows, setRows] = useState<EntryRow[]>([emptyRow()])

  // Employee management panel
  const [showEmpPanel, setShowEmpPanel] = useState(false)
  const [newEmpName, setNewEmpName] = useState("")
  const [newEmpBizId, setNewEmpBizId] = useState(BUSINESSES[0].id)
  const [addingEmp, setAddingEmp] = useState(false)
  const [deletingEmp, setDeletingEmp] = useState<string | null>(null)

  // Edit mode (single row)
  const [editEntry, setEditEntry] = useState<AttendanceEntry | null>(null)

  // ── Fetchers ──
  const fetchAll = useCallback(async () => {
    setFetching(true)
    try {
      const [empData, attData] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch("/api/attendance").then((r) => r.json()),
      ])
      setAllEmployees(Array.isArray(empData) ? empData : [])
      setEntries(Array.isArray(attData) ? attData : [])
    } catch { toast.error("Veriler yüklenemedi") }
    finally { setFetching(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Employees filtered for selected business
  const bizEmployees = allEmployees.filter((e) => e.businessId === businessId)

  // ── Employee management ──
  async function addEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmpName.trim()) { toast.error("İsim girin"); return }
    setAddingEmp(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEmpName.trim(), businessId: newEmpBizId }),
      })
      if (!res.ok) { toast.error("Eklenemedi"); return }
      const emp: Employee = await res.json()
      setAllEmployees((prev) => [...prev, emp].sort((a, b) => a.name.localeCompare(b.name, "tr")))
      setNewEmpName("")
      toast.success(`${emp.name} eklendi`)
    } finally { setAddingEmp(false) }
  }

  async function deleteEmployee(emp: Employee) {
    if (!confirm(`"${emp.name}" silinsin mi?`)) return
    setDeletingEmp(emp.id)
    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Silinemedi"); return }
      setAllEmployees((prev) => prev.filter((e) => e.id !== emp.id))
      toast.success("Personel silindi")
    } finally { setDeletingEmp(null) }
  }

  // ── Batch row helpers ──
  function updateRow(i: number, patch: Partial<EntryRow>) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]) }
  function removeRow(i: number) { setRows((prev) => prev.filter((_, idx) => idx !== i)) }

  function selectEmployee(i: number, empId: string) {
    const emp = bizEmployees.find((e) => e.id === empId)
    updateRow(i, { employeeId: empId, employeeName: emp?.name ?? "" })
  }

  // ── Batch save ──
  async function handleBatchSave(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) { toast.error("İşletme seçin"); return }
    const validRows = rows.filter((r) => r.employeeName.trim())
    if (validRows.length === 0) { toast.error("En az bir personel girin"); return }

    setSaving(true)
    let saved = 0
    let failed = 0
    for (const row of validRows) {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId, date,
            employeeName: row.employeeName.trim(),
            hoursWorked: row.hoursWorked,
            mealAmount: row.mealEnabled ? row.mealAmount : 0,
            tipAmount: row.tipEnabled ? row.tipAmount : 0,
            deductionAmount: row.deductionEnabled ? row.deductionAmount : 0,
            notes: row.notes,
          }),
        })
        if (res.ok) saved++
        else failed++
      } catch { failed++ }
    }

    if (saved > 0) toast.success(`${saved} kayıt kaydedildi${failed > 0 ? `, ${failed} başarısız` : ""}`)
    else toast.error("Kaydedilemedi")

    setRows([emptyRow()])
    fetchAll()
    setSaving(false)
  }

  // ── Edit single entry ──
  function loadEdit(entry: AttendanceEntry) {
    setEditEntry(entry)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editEntry) return
    setSaving(true)
    try {
      const res = await fetch(`/api/attendance/${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: editEntry.employeeName,
          hoursWorked: editEntry.hoursWorked,
          mealAmount: editEntry.mealAmount,
          tipAmount: editEntry.tipAmount,
          deductionAmount: editEntry.deductionAmount,
          notes: editEntry.notes,
        }),
      })
      if (!res.ok) { toast.error("Güncellenemedi"); return }
      toast.success("Kayıt güncellendi")
      setEditEntry(null)
      fetchAll()
    } finally { setSaving(false) }
  }

  async function handleDelete(entry: AttendanceEntry) {
    if (!confirm(`"${entry.employeeName}" — ${formatDate(entry.date)} silinsin mi?`)) return
    setDeleting(entry.id)
    try {
      const res = await fetch(`/api/attendance/${entry.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Silinemedi"); return }
      toast.success("Silindi")
      fetchAll()
    } finally { setDeleting(null) }
  }

  // ── Summary ──
  const thisMonth = format(new Date(), "yyyy-MM")
  const thisMonthEntries = entries.filter((e) => e.date.startsWith(thisMonth))
  const totalHours = thisMonthEntries.reduce((s, e) => s + e.hoursWorked, 0)
  const empTotals: Record<string, { hours: number; meal: number; tip: number; deduction: number }> = {}
  for (const e of thisMonthEntries) {
    if (!empTotals[e.employeeName]) empTotals[e.employeeName] = { hours: 0, meal: 0, tip: 0, deduction: 0 }
    empTotals[e.employeeName].hours += e.hoursWorked
    empTotals[e.employeeName].meal += e.mealAmount
    empTotals[e.employeeName].tip += e.tipAmount
    empTotals[e.employeeName].deduction += e.deductionAmount
  }

  if (fetching) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Puantaj</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personel çalışma saati takibi</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEmpPanel(!showEmpPanel)} className="gap-2">
          <Users className="h-4 w-4" />
          {showEmpPanel ? "Gizle" : "Personel Yönetimi"}
        </Button>
      </div>

      {/* Employee Management Panel */}
      {showEmpPanel && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-violet-600" />
              Personel Yönetimi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addEmployee} className="flex gap-2 flex-wrap">
              <Input
                placeholder="Personel adı"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                className="flex-1 min-w-[180px] bg-white"
              />
              <Select value={newEmpBizId} onValueChange={setNewEmpBizId}>
                <SelectTrigger className="w-44 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESSES.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={addingEmp} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                {addingEmp ? "Ekleniyor..." : "Ekle"}
              </Button>
            </form>

            {/* Employee list grouped by business */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {BUSINESSES.map((biz) => {
                const bizEmps = allEmployees.filter((e) => e.businessId === biz.id)
                return (
                  <div key={biz.id} className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">{biz.name}</p>
                    {bizEmps.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Personel yok</p>
                    ) : (
                      <ul className="space-y-1">
                        {bizEmps.map((emp) => (
                          <li key={emp.id} className="flex items-center justify-between gap-1">
                            <span className="text-sm text-slate-700">{emp.name}</span>
                            <button
                              onClick={() => deleteEmployee(emp)}
                              disabled={deletingEmp === emp.id}
                              className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Bu Ay Toplam Saat</p>
          <p className="text-2xl font-bold text-blue-600">{totalHours}</p>
          <p className="text-xs text-muted-foreground">saat</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Bu Ay Kayıt</p>
          <p className="text-2xl font-bold">{thisMonthEntries.length}</p>
          <p className="text-xs text-muted-foreground">giriş</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Personel Sayısı</p>
          <p className="text-2xl font-bold">{Object.keys(empTotals).length}</p>
          <p className="text-xs text-muted-foreground">kişi</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Entry Form ── */}
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
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Yemek", key: "mealAmount" as const },
                      { label: "Tip", key: "tipAmount" as const },
                      { label: "Kesinti", key: "deductionAmount" as const },
                    ].map(({ label, key }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label} (₺)</Label>
                        <Input type="number" step="0.01" min="0"
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

        {/* ── Records ── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Monthly summary */}
          {Object.keys(empTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bu Ay Personel Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Personel</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Saat</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Yemek</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Tip</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Kesinti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(empTotals).sort(([, a], [, b]) => b.hours - a.hours).map(([name, t]) => (
                      <tr key={name} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-xs">{name}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-600 text-xs">{t.hours}s</td>
                        <td className="px-4 py-2 text-right text-xs">{t.meal > 0 ? formatCurrency(t.meal) : "-"}</td>
                        <td className="px-4 py-2 text-right text-xs">{t.tip > 0 ? formatCurrency(t.tip) : "-"}</td>
                        <td className="px-4 py-2 text-right text-red-600 text-xs">{t.deduction > 0 ? formatCurrency(t.deduction) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* All records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Tüm Kayıtlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Tarih</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Personel</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">İşletme</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Saat</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Yemek</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Tip</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Kesinti</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Not</th>
                      <th className="px-2 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Kayıt yok</td></tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${editEntry?.id === entry.id ? "bg-amber-50" : ""}`}>
                          <td className="px-4 py-2.5 text-xs">{formatDate(entry.date)}</td>
                          <td className="px-4 py-2.5 font-medium text-xs">{entry.employeeName}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.business.name}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-600 text-xs">{entry.hoursWorked}s</td>
                          <td className="px-4 py-2.5 text-right text-xs">{entry.mealAmount > 0 ? formatCurrency(entry.mealAmount) : "-"}</td>
                          <td className="px-4 py-2.5 text-right text-xs">{entry.tipAmount > 0 ? formatCurrency(entry.tipAmount) : "-"}</td>
                          <td className="px-4 py-2.5 text-right text-red-600 text-xs">{entry.deductionAmount > 0 ? formatCurrency(entry.deductionAmount) : "-"}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.notes || "-"}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex gap-1">
                              <button onClick={() => editEntry?.id === entry.id ? setEditEntry(null) : loadEdit(entry)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                {editEntry?.id === entry.id ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => handleDelete(entry)} disabled={deleting === entry.id}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
