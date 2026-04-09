"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Trash2, Search, Printer, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Payment = { paid: boolean; date: string }

type Student = {
  id: string
  name: string
  monthlyFee: number
  createdAt: string
  sinif: string
  payments: Record<string, Payment>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TR_MONTHS = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
]

function formatTL(n: number) {
  return "₺" + new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function getMonthRange(startYear: number, startMonth: number, count: number) {
  const result = []
  for (let i = 0; i < count; i++) {
    let m = startMonth + i
    let y = startYear
    while (m > 11) { m -= 12; y++ }
    const key = `${y}-${String(m + 1).padStart(2, "0")}`
    result.push({ year: y, month: m, key, label: `${TR_MONTHS[m]} ${y}` })
  }
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KursPage() {
  const now = new Date()
  const [rangeStart, setRangeStart] = useState({
    year: now.getFullYear(),
    month: Math.max(0, now.getMonth() - 2),
  })

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSinif, setSelectedSinif] = useState("")

  const [newName, setNewName] = useState("")
  const [newFee, setNewFee] = useState("")
  const [newSinif, setNewSinif] = useState("")
  const [adding, setAdding] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const months = getMonthRange(rangeStart.year, rangeStart.month, 3)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/kurs")
      if (!res.ok) throw new Error()
      setStudents(await res.json())
    } catch {
      toast.error("Veriler yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  function prevPeriod() {
    setRangeStart(({ year, month }) => {
      let m = month - 3; let y = year
      if (m < 0) { m += 12; y-- }
      return { year: y, month: m }
    })
  }
  function nextPeriod() {
    setRangeStart(({ year, month }) => {
      let m = month + 3; let y = year
      if (m > 11) { m -= 12; y++ }
      return { year: y, month: m }
    })
  }

  const sinifList = useMemo(() => {
    const set = new Set(students.map((s) => s.sinif).filter(Boolean))
    return Array.from(set).sort()
  }, [students])

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    const fee = parseFloat(newFee)
    const sinif = newSinif.trim()
    if (!name) { toast.error("Ad soyad girin"); return }
    if (!fee || fee <= 0) { toast.error("Geçerli bir ücret girin"); return }
    setAdding(true)
    try {
      const res = await fetch("/api/kurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", name, monthlyFee: fee, sinif }),
      })
      if (!res.ok) throw new Error()
      const student: Student = await res.json()
      setStudents((prev) => [...prev, student])
      setNewName(""); setNewFee(""); setNewSinif("")
      toast.success(`${name} eklendi`)
    } catch {
      toast.error("Eklenemedi")
    } finally {
      setAdding(false)
    }
  }

  async function togglePayment(studentId: string, month: string, current: Payment | undefined) {
    const currentPaid = current?.paid ?? false
    const newPaid = !currentPaid
    const newDate = newPaid ? todayISO() : ""
    const key = `${studentId}-${month}`
    setToggling(key)

    // Optimistic
    setStudents((prev) => prev.map((s) =>
      s.id === studentId
        ? { ...s, payments: { ...s.payments, [month]: { paid: newPaid, date: newDate } } }
        : s
    ))

    try {
      const res = await fetch("/api/kurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", studentId, month, paid: newPaid, date: newDate }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert
      setStudents((prev) => prev.map((s) =>
        s.id === studentId
          ? { ...s, payments: { ...s.payments, [month]: current ?? { paid: false, date: "" } } }
          : s
      ))
      toast.error("Kaydedilemedi")
    } finally {
      setToggling(null)
    }
  }

  async function deleteStudent(student: Student) {
    if (!confirm(`"${student.name}" silinsin mi?`)) return
    setDeleting(student.id)
    try {
      const res = await fetch(`/api/kurs/${student.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setStudents((prev) => prev.filter((s) => s.id !== student.id))
      toast.success("Öğrenci silindi")
    } catch {
      toast.error("Silinemedi")
    } finally {
      setDeleting(null)
    }
  }

  const filtered = students.filter((s) => {
    const matchSinif = !selectedSinif || s.sinif === selectedSinif
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    return matchSinif && matchSearch
  })

  let totalCollected = 0, totalMissing = 0
  for (const s of filtered) {
    for (const mo of months) {
      if (s.payments[mo.key]?.paid) totalCollected += s.monthlyFee
      else totalMissing += s.monthlyFee
    }
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kurs Ödeme Takip</h1>
            <p className="text-sm text-slate-500">{months[0].label} – {months[2].label}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 print:hidden">
          <Printer className="w-4 h-4" />
          Yazdır / PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {selectedSinif ? `${selectedSinif} Öğrencisi` : "Toplam Öğrenci"}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{filtered.length}</p>
          {selectedSinif && <p className="text-xs text-slate-400 mt-0.5">Toplam: {students.length}</p>}
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Toplam Tahsilat</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{formatTL(totalCollected)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Eksik Ödeme</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{formatTL(totalMissing)}</p>
        </div>
      </div>

      {/* Add student form */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print:hidden">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Yeni Öğrenci Ekle</h2>
        <form onSubmit={addStudent} className="flex gap-2 flex-wrap">
          <Input
            placeholder="Ad Soyad"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[180px]"
          />
          <Input
            placeholder="Sınıf (örn: 1A, 2B)"
            value={newSinif}
            onChange={(e) => setNewSinif(e.target.value)}
            className="w-36"
          />
          <Input
            type="number"
            placeholder="Aylık Ücret (₺)"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            min="0"
            className="w-44"
          />
          <Button type="submit" disabled={adding} className="gap-2">
            <Plus className="w-4 h-4" />
            {adding ? "Ekleniyor..." : "Ekle"}
          </Button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        {sinifList.length > 0 && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
            <button
              onClick={() => setSelectedSinif("")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedSinif === "" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Tümü
            </button>
            {sinifList.map((sinif) => (
              <button
                key={sinif}
                onClick={() => setSelectedSinif(sinif)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  selectedSinif === sinif ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {sinif}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
          <button onClick={prevPeriod} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[190px] text-center">
            {months[0].label} – {months[2].label}
          </span>
          <button onClick={nextPeriod} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Öğrenci ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Yükleniyor…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold w-8">#</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Ad Soyad</th>
                  <th className="text-center px-3 py-3 text-slate-600 font-semibold">Sınıf</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Aylık Ücret</th>
                  {months.map((mo) => (
                    <th key={mo.key} className="text-center px-4 py-3 text-slate-600 font-semibold min-w-[130px]">
                      {mo.label}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-emerald-700 font-semibold">Ödenen</th>
                  <th className="text-right px-4 py-3 text-red-700 font-semibold">Borç</th>
                  <th className="px-3 py-3 print:hidden w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={months.length + 6} className="text-center py-12 text-slate-400 text-sm italic">
                      {students.length === 0 ? "Henüz öğrenci eklenmedi." : "Sonuç bulunamadı."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((student, idx) => {
                    const paidCount = months.filter((mo) => student.payments[mo.key]?.paid).length
                    const totalPaid = paidCount * student.monthlyFee
                    const totalDebt = (months.length - paidCount) * student.monthlyFee
                    return (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                        <td className="px-3 py-3 text-center">
                          {student.sinif ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                              {student.sinif}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatTL(student.monthlyFee)}</td>
                        {months.map((mo) => {
                          const payment = student.payments[mo.key]
                          const paid = payment?.paid ?? false
                          const payDate = payment?.date ?? ""
                          const toggleKey = `${student.id}-${mo.key}`
                          const isToggling = toggling === toggleKey
                          return (
                            <td key={mo.key} className="px-4 py-3 text-center">
                              <button
                                onClick={() => togglePayment(student.id, mo.key, payment)}
                                disabled={isToggling}
                                className={cn(
                                  "inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-w-[100px]",
                                  paid
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200",
                                  isToggling && "opacity-50 cursor-wait"
                                )}
                              >
                                <span>{isToggling ? "…" : paid ? "✓ Ödendi" : "✗ Ödenmedi"}</span>
                                {paid && payDate && (
                                  <span className="text-[10px] font-normal opacity-70 mt-0.5">
                                    {formatDate(payDate)}
                                  </span>
                                )}
                              </button>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                          {totalPaid > 0 ? formatTL(totalPaid) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 tabular-nums">
                          {totalDebt > 0 ? formatTL(totalDebt) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 print:hidden">
                          <button
                            onClick={() => deleteStudent(student)}
                            disabled={deleting === student.id}
                            className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">
                      TOPLAM ({filtered.length} öğrenci{selectedSinif ? ` · ${selectedSinif}` : ""})
                    </td>
                    {months.map((mo) => {
                      const paidCount = filtered.filter((s) => s.payments[mo.key]?.paid).length
                      return (
                        <td key={mo.key} className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-500">{paidCount}/{filtered.length} ödedi</span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      {formatTL(totalCollected)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-700 tabular-nums">
                      {formatTL(totalMissing)}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
