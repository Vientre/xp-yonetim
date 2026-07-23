"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Trash2, Search, Printer, GraduationCap, ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn, formatCurrency } from "@/lib/utils"
import { PaymentConfirmDialog as ConfirmDialog } from "@/components/course/payment-confirm-dialog"
import { CourseStudentTable } from "@/components/course/course-student-table"
import type {
  CourseExpense as Expense,
  CoursePayment as Payment,
  CourseStudent as Student,
  PendingPaymentToggle as PendingToggle,
} from "@/components/course/types"
import {
  formatCourseDate as formatDate,
  getMonthRange,
  todayISO,
} from "@/components/course/utils"


// ─── Component ────────────────────────────────────────────────────────────────

export default function KursPage() {
  const now = new Date()
  const [rangeStart, setRangeStart] = useState({
    year: now.getFullYear(),
    month: Math.max(0, now.getMonth() - 2),
  })

  const [students, setStudents] = useState<Student[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSinif, setSelectedSinif] = useState("")

  // Öğrenci ekleme
  const [newName, setNewName] = useState("")
  const [newFee, setNewFee] = useState("")
  const [newSinif, setNewSinif] = useState("")
  const [adding, setAdding] = useState(false)

  // Gider ekleme
  const [giderTarih, setGiderTarih] = useState(todayISO())
  const [giderDetay, setGiderDetay] = useState("")
  const [giderTutar, setGiderTutar] = useState("")
  const [addingGider, setAddingGider] = useState(false)
  const [deletingGider, setDeletingGider] = useState<string | null>(null)

  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Onay dialogu
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null)

  const months = getMonthRange(rangeStart.year, rangeStart.month, 3)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/kurs")
      if (!res.ok) throw new Error()
      const json = await res.json()
      setStudents(json.students ?? [])
      setExpenses(json.expenses ?? [])
    } catch {
      toast.error("Veriler yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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

  // ── Öğrenci ekle ──────────────────────────────────────────────────────────
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

  // ── Ödeme toggle — onay isteği ────────────────────────────────────────────
  function requestToggle(student: Student, mo: { key: string; label: string }, payment: Payment | undefined) {
    const newPaid = !(payment?.paid ?? false)
    setPendingToggle({
      studentId: student.id,
      studentName: student.name,
      month: mo.key,
      monthLabel: mo.label,
      current: payment,
      newPaid,
    })
  }

  async function confirmToggle() {
    if (!pendingToggle) return
    const { studentId, month, current, newPaid } = pendingToggle
    const newDate = newPaid ? todayISO() : ""
    const key = `${studentId}-${month}`
    setPendingToggle(null)
    setToggling(key)

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
      toast.success(newPaid ? "Ödeme kaydedildi" : "Ödeme geri alındı")
    } catch {
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

  // ── Öğrenci sil ───────────────────────────────────────────────────────────
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

  // ── Gider ekle ────────────────────────────────────────────────────────────
  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const detay = giderDetay.trim()
    const tutar = parseFloat(giderTutar)
    if (!detay) { toast.error("Detay girin"); return }
    if (!tutar || tutar <= 0) { toast.error("Geçerli bir tutar girin"); return }
    if (!giderTarih) { toast.error("Tarih seçin"); return }
    setAddingGider(true)
    try {
      const res = await fetch("/api/kurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addExpense", tarih: giderTarih, detay, tutar }),
      })
      if (!res.ok) throw new Error()
      const newExp: Expense = await res.json()
      setExpenses((prev) => [newExp, ...prev].sort((a, b) => b.tarih.localeCompare(a.tarih)))
      setGiderDetay(""); setGiderTutar("")
      toast.success("Gider eklendi")
    } catch {
      toast.error("Eklenemedi")
    } finally {
      setAddingGider(false)
    }
  }

  // ── Gider sil ─────────────────────────────────────────────────────────────
  async function deleteExpense(id: string) {
    if (!confirm("Bu gider silinsin mi?")) return
    setDeletingGider(id)
    try {
      const res = await fetch("/api/kurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteExpense", id }),
      })
      if (!res.ok) throw new Error()
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      toast.success("Gider silindi")
    } catch {
      toast.error("Silinemedi")
    } finally {
      setDeletingGider(null)
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

  const totalExpenses = expenses.reduce((s, e) => s + e.tutar, 0)

  return (
    <div className="p-6 space-y-5">

      {/* Onay Dialogu */}
      {pendingToggle && (
        <ConfirmDialog
          pending={pendingToggle}
          onConfirm={confirmToggle}
          onCancel={() => setPendingToggle(null)}
        />
      )}

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

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {selectedSinif ? `${selectedSinif} Öğrencisi` : "Toplam Öğrenci"}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{filtered.length}</p>
          {selectedSinif && <p className="text-xs text-slate-400 mt-0.5">Toplam: {students.length}</p>}
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Toplam Tahsilat</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Eksik Ödeme</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{formatCurrency(totalMissing)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Toplam Gider</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-orange-500 mt-0.5">{expenses.length} kalem</p>
        </div>
        {(() => {
          const net = totalCollected - totalExpenses
          const isPositive = net >= 0
          return (
            <div className={`rounded-xl p-4 shadow-sm border ${isPositive ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${isPositive ? "text-blue-700" : "text-red-700"}`}>Net</p>
              <p className={`text-3xl font-bold mt-1 ${isPositive ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(net)}</p>
              <p className={`text-xs mt-0.5 ${isPositive ? "text-blue-500" : "text-red-500"}`}>
                {isPositive ? "Tahsilat − Gider" : "Zarar"}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Yeni öğrenci formu */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print:hidden">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Yeni Öğrenci Ekle</h2>
        <form onSubmit={addStudent} className="flex gap-2 flex-wrap">
          <Input placeholder="Ad Soyad" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 min-w-[180px]" />
          <Input placeholder="Sınıf (örn: 1A)" value={newSinif} onChange={(e) => setNewSinif(e.target.value)} className="w-32" />
          <Input type="number" placeholder="Aylık Ücret (₺)" value={newFee} onChange={(e) => setNewFee(e.target.value)} min="0" className="w-44" />
          <Button type="submit" disabled={adding} className="gap-2">
            <Plus className="w-4 h-4" />
            {adding ? "Ekleniyor…" : "Ekle"}
          </Button>
        </form>
      </div>

      {/* ── GİDER BÖLÜMÜ ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-orange-200 rounded-xl shadow-sm print:hidden overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-100">
          <Receipt className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-semibold text-orange-800">Kurs Giderleri</h2>
          <span className="ml-auto text-sm font-bold text-orange-700">{formatCurrency(totalExpenses)}</span>
        </div>

        {/* Gider ekleme formu */}
        <form onSubmit={addExpense} className="flex gap-2 flex-wrap p-4 border-b border-slate-100">
          <Input
            type="date"
            value={giderTarih}
            onChange={(e) => setGiderTarih(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="Detay (örn: Kira, Malzeme…)"
            value={giderDetay}
            onChange={(e) => setGiderDetay(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Input
            type="number"
            placeholder="Tutar (₺)"
            value={giderTutar}
            onChange={(e) => setGiderTutar(e.target.value)}
            min="0"
            step="0.01"
            className="w-36"
          />
          <Button type="submit" disabled={addingGider} variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
            <Plus className="w-4 h-4" />
            {addingGider ? "Ekleniyor…" : "Gider Ekle"}
          </Button>
        </form>

        {/* Gider listesi */}
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Henüz gider kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs">
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Tarih</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Detay</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Tutar</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums whitespace-nowrap">{formatDate(exp.tarih)}</td>
                    <td className="px-4 py-2.5 text-slate-800">{exp.detay}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-orange-700 tabular-nums">{formatCurrency(exp.tutar)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        disabled={deletingGider === exp.id}
                        className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={2} className="px-4 py-2.5 font-semibold text-slate-700 text-xs">TOPLAM</td>
                  <td className="px-4 py-2.5 text-right font-bold text-orange-700 tabular-nums">{formatCurrency(totalExpenses)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        {sinifList.length > 0 && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
            <button
              onClick={() => setSelectedSinif("")}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedSinif === "" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >Tümü</button>
            {sinifList.map((sinif) => (
              <button
                key={sinif}
                onClick={() => setSelectedSinif(sinif)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  selectedSinif === sinif ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >{sinif}</button>
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
            placeholder="Öğrenci ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <CourseStudentTable
        loading={loading}
        students={students}
        filteredStudents={filtered}
        months={months}
        toggling={toggling}
        deleting={deleting}
        selectedClass={selectedSinif}
        totalCollected={totalCollected}
        totalMissing={totalMissing}
        onRequestToggle={requestToggle}
        onDeleteStudent={(student) => void deleteStudent(student)}
      />
    </div>
  )
}
