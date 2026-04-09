"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarCheck, Save, Plus, Clock, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import { format } from "date-fns"

interface Business { id: string; name: string }
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

export default function AttendancePage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [businessId, setBusinessId] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [employeeName, setEmployeeName] = useState("")
  const [hoursWorked, setHoursWorked] = useState(8)
  const [mealEnabled, setMealEnabled] = useState(false)
  const [mealAmount, setMealAmount] = useState(0)
  const [tipEnabled, setTipEnabled] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [deductionEnabled, setDeductionEnabled] = useState(false)
  const [deductionAmount, setDeductionAmount] = useState(0)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/businesses").then((r) => r.json()),
      fetch("/api/attendance").then((r) => r.json()),
    ]).then(([biz, recs]) => {
      setBusinesses(biz)
      setEntries(Array.isArray(recs) ? recs : [])
      if (biz.length === 1) setBusinessId(biz[0].id)
    }).catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setFetching(false))
  }, [])

  function refreshEntries() {
    fetch("/api/attendance").then((r) => r.json()).then((d) => setEntries(Array.isArray(d) ? d : []))
  }

  function resetForm() {
    setEditingId(null)
    setEmployeeName("")
    setHoursWorked(8)
    setMealEnabled(false); setMealAmount(0)
    setTipEnabled(false); setTipAmount(0)
    setDeductionEnabled(false); setDeductionAmount(0)
    setNotes("")
    setDate(format(new Date(), "yyyy-MM-dd"))
  }

  function loadForEdit(entry: AttendanceEntry) {
    setEditingId(entry.id)
    setBusinessId(entry.businessId)
    setDate(entry.date)
    setEmployeeName(entry.employeeName)
    setHoursWorked(entry.hoursWorked)
    setMealEnabled(entry.mealAmount > 0)
    setMealAmount(entry.mealAmount)
    setTipEnabled(entry.tipAmount > 0)
    setTipAmount(entry.tipAmount)
    setDeductionEnabled(entry.deductionAmount > 0)
    setDeductionAmount(entry.deductionAmount)
    setNotes(entry.notes)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) { toast.error("İşletme seçin"); return }
    if (!employeeName.trim()) { toast.error("Personel adı girin"); return }

    setLoading(true)
    try {
      const payload = {
        businessId, date,
        employeeName: employeeName.trim(),
        hoursWorked,
        mealAmount: mealEnabled ? mealAmount : 0,
        tipAmount: tipEnabled ? tipAmount : 0,
        deductionAmount: deductionEnabled ? deductionAmount : 0,
        notes,
      }

      if (editingId) {
        const res = await fetch(`/api/attendance/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || "Güncellenemedi"); return }
        toast.success("Puantaj güncellendi!")
      } else {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || "Kaydedilemedi"); return }
        toast.success("Puantaj kaydedildi!")
      }

      resetForm()
      refreshEntries()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entry: AttendanceEntry) {
    if (!confirm(`"${entry.employeeName}" — ${formatDate(entry.date)} kaydı silinsin mi?`)) return
    setDeleting(entry.id)
    try {
      const res = await fetch(`/api/attendance/${entry.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Silinemedi"); return }
      toast.success("Kayıt silindi")
      if (editingId === entry.id) resetForm()
      refreshEntries()
    } finally {
      setDeleting(null)
    }
  }

  const thisMonth = format(new Date(), "yyyy-MM")
  const thisMonthEntries = entries.filter((e) => e.date.startsWith(thisMonth))
  const totalHoursThisMonth = thisMonthEntries.reduce((s, e) => s + e.hoursWorked, 0)

  const employeeTotals: Record<string, { hours: number; meal: number; tip: number; deduction: number }> = {}
  for (const e of thisMonthEntries) {
    if (!employeeTotals[e.employeeName]) employeeTotals[e.employeeName] = { hours: 0, meal: 0, tip: 0, deduction: 0 }
    employeeTotals[e.employeeName].hours += e.hoursWorked
    employeeTotals[e.employeeName].meal += e.mealAmount
    employeeTotals[e.employeeName].tip += e.tipAmount
    employeeTotals[e.employeeName].deduction += e.deductionAmount
  }

  if (fetching) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Puantaj</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personel çalışma saati takibi</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Bu Ay Toplam Saat</p>
          <p className="text-2xl font-bold text-blue-600">{totalHoursThisMonth}</p>
          <p className="text-xs text-muted-foreground">saat</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Bu Ay Kayıt</p>
          <p className="text-2xl font-bold">{thisMonthEntries.length}</p>
          <p className="text-xs text-muted-foreground">giriş</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Personel Sayısı</p>
          <p className="text-2xl font-bold">{Object.keys(employeeTotals).length}</p>
          <p className="text-xs text-muted-foreground">kişi</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <div className="xl:col-span-1">
          <form onSubmit={handleSubmit}>
            <Card className={editingId ? "border-amber-300 ring-1 ring-amber-300" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {editingId ? "Kaydı Düzenle" : "Saat Girişi"}
                  </CardTitle>
                  {editingId && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-slate-500 gap-1">
                      <X className="h-4 w-4" /> İptal
                    </Button>
                  )}
                </div>
                {editingId && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
                    Düzenleme modu
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>İşletme *</Label>
                  <Select value={businessId} onValueChange={setBusinessId} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tarih *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!editingId} />
                </div>

                <div className="space-y-1.5">
                  <Label>Personel Adı *</Label>
                  <Input placeholder="Ad Soyad" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Çalışılan Saat *</Label>
                  <Input
                    type="number" min="0" max="24" step="0.5"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                    className="text-center font-bold text-lg"
                  />
                </div>

                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={mealEnabled} onCheckedChange={setMealEnabled} />
                        <Label className="text-sm">Yemek (₺)</Label>
                      </div>
                      {mealEnabled && (
                        <Input type="number" step="0.01" min="0" value={mealAmount}
                          onChange={(e) => setMealAmount(parseFloat(e.target.value) || 0)}
                          className="w-24 text-right h-7 text-sm" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={tipEnabled} onCheckedChange={setTipEnabled} />
                        <Label className="text-sm">Tip (₺)</Label>
                      </div>
                      {tipEnabled && (
                        <Input type="number" step="0.01" min="0" value={tipAmount}
                          onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                          className="w-24 text-right h-7 text-sm" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={deductionEnabled} onCheckedChange={setDeductionEnabled} />
                        <Label className="text-sm">Kesinti (₺)</Label>
                      </div>
                      {deductionEnabled && (
                        <Input type="number" step="0.01" min="0" value={deductionAmount}
                          onChange={(e) => setDeductionAmount(parseFloat(e.target.value) || 0)}
                          className="w-24 text-right h-7 text-sm" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notlar</Label>
                  <Input placeholder="İzin, mazeret vb..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Kayıtlar */}
        <div className="xl:col-span-2 space-y-4">
          {Object.keys(employeeTotals).length > 0 && (
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
                    {Object.entries(employeeTotals).sort(([, a], [, b]) => b.hours - a.hours).map(([name, totals]) => (
                      <tr key={name} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-xs">{name}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-600 text-xs">{totals.hours}s</td>
                        <td className="px-4 py-2 text-right text-xs">{totals.meal > 0 ? formatCurrency(totals.meal) : "-"}</td>
                        <td className="px-4 py-2 text-right text-xs">{totals.tip > 0 ? formatCurrency(totals.tip) : "-"}</td>
                        <td className="px-4 py-2 text-right text-red-600 text-xs">{totals.deduction > 0 ? formatCurrency(totals.deduction) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

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
                      <th className="px-2 py-2 text-xs w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Kayıt yok</td></tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className={`border-b last:border-0 hover:bg-gray-50 ${editingId === entry.id ? "bg-amber-50" : ""}`}>
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
                              <button
                                onClick={() => editingId === entry.id ? resetForm() : loadForEdit(entry)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Düzenle"
                              >
                                {editingId === entry.id ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDelete(entry)}
                                disabled={deleting === entry.id}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Sil"
                              >
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
