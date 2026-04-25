"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { BUSINESSES } from "@/lib/constants"

interface Employee { id: string; name: string; businessId: string }
interface AttendanceEntry {
  id: string; date: string; employeeName: string
  businessId: string; business: { name: string }
  hoursWorked: number; mesai: number; notes: string
}

export default function QuickEntryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [recentEntries, setRecentEntries] = useState<AttendanceEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showRecent, setShowRecent] = useState(false)

  // Form
  const [businessId, setBusinessId] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [hours, setHours] = useState(8)
  const [mesaiEnabled, setMesaiEnabled] = useState(false)
  const [mesai, setMesai] = useState(0)
  const [notes, setNotes] = useState("")

  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/attendance"),
      ])
      const empData = await empRes.json()
      const attData = await attRes.json()
      setEmployees(Array.isArray(empData) ? empData : [])
      const entries = Array.isArray(attData) ? attData : []
      setRecentEntries(entries.slice(0, 10))
    } catch {
      toast.error("Veriler yüklenemedi")
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const bizEmployees = employees.filter((e) => e.businessId === businessId)

  function selectBusiness(biz: string) {
    setBusinessId(biz)
    setEmployeeId("")
    setEmployeeName("")
  }

  function selectEmployee(empId: string) {
    setEmployeeId(empId)
    const emp = bizEmployees.find((e) => e.id === empId)
    setEmployeeName(emp?.name ?? "")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) { toast.error("İşletme seçin"); return }
    if (!employeeName.trim()) { toast.error("Personel adı girin"); return }

    setSaving(true)
    setSuccess(false)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, date,
          employeeName: employeeName.trim(),
          hoursWorked: hours,
          mealAmount: 0,
          tipAmount: 0,
          deductionAmount: 0,
          mesai: mesaiEnabled ? mesai : 0,
          notes,
        }),
      })
      if (!res.ok) { toast.error("Kaydedilemedi"); return }
      setSuccess(true)
      setNotes("")
      setMesai(0)
      setMesaiEnabled(false)
      setHours(8)
      await fetchData()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      toast.error("Hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-2 text-blue-600 mb-1">
          <Zap className="h-5 w-5" />
          <h1 className="text-xl font-bold">Hızlı Saat Girişi</h1>
        </div>
        <p className="text-xs text-muted-foreground">Günlük çalışma saatini kaydet</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Kaydedildi!</p>
            <p className="text-xs">Çalışma saatin sisteme eklendi.</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-5 space-y-5">

            {/* İşletme */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">İşletme</Label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESSES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBusiness(b.id)}
                    className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      businessId === b.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Personel */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Personel</Label>
              {businessId && bizEmployees.length > 0 ? (
                <Select value={employeeId} onValueChange={selectEmployee}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Personel seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bizEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="text-base py-3">
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Adınızı yazın"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="h-12 text-base"
                  disabled={!businessId}
                />
              )}
            </div>

            {/* Tarih */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tarih</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Saat — büyük dokunmatik kontroller */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Çalışma Saati</Label>
              <div className="flex items-center justify-center gap-6 py-4 bg-slate-50 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setHours((h) => Math.max(0, h - 0.5))}
                  className="w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-xl font-bold text-slate-600 hover:border-blue-400 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-5xl font-bold text-blue-600">{hours}</span>
                  <p className="text-xs text-muted-foreground mt-1">saat</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHours((h) => Math.min(24, h + 0.5))}
                  className="w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-xl font-bold text-slate-600 hover:border-blue-400 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                >
                  +
                </button>
              </div>
              {/* Hızlı seçim */}
              <div className="grid grid-cols-5 gap-1.5">
                {[6, 7, 8, 9, 10].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      hours === h
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {h}s
                  </button>
                ))}
              </div>
            </div>

            {/* Mesai */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Mesai</Label>
                <Switch checked={mesaiEnabled} onCheckedChange={setMesaiEnabled} />
              </div>
              {mesaiEnabled && (
                <div className="flex items-center justify-center gap-6 py-3 bg-orange-50 rounded-xl border border-orange-200">
                  <button
                    type="button"
                    onClick={() => setMesai((m) => Math.max(0, m - 0.5))}
                    className="w-10 h-10 rounded-full bg-white border-2 border-orange-300 text-lg font-bold text-orange-600 hover:border-orange-400 active:scale-95 transition-all flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-orange-600">{mesai}</span>
                    <p className="text-xs text-muted-foreground mt-1">mesai saati</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMesai((m) => Math.min(12, m + 0.5))}
                    className="w-10 h-10 rounded-full bg-white border-2 border-orange-300 text-lg font-bold text-orange-600 hover:border-orange-400 active:scale-95 transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Notlar */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Not (opsiyonel)</Label>
              <Input
                placeholder="Varsa kısa bir not..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-11 text-base"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold rounded-xl"
              disabled={saving || fetching}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Son kayıtlar */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <button
            type="button"
            onClick={() => setShowRecent(!showRecent)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Son Girişler
            </CardTitle>
            {showRecent ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showRecent && (
          <CardContent className="px-5 pb-4 pt-0">
            {recentEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Kayıt yok</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{entry.business.name} — {formatDate(entry.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{entry.hoursWorked}s</p>
                      {entry.mesai > 0 && <p className="text-xs text-orange-500">+{entry.mesai}s mesai</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
