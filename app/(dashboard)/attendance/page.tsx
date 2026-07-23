"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { BUSINESSES } from "@/lib/constants"
import { AttendanceRecords } from "@/components/attendance/attendance-records"
import { AttendanceManagement } from "@/components/attendance/attendance-management"
import { AttendanceForms } from "@/components/attendance/attendance-forms"
import type { AttendanceEntry, Employee, EntryRow } from "@/components/attendance/types"
import { calculateEmployeeTotals, createEmptyRow } from "@/components/attendance/utils"

const emptyRow = createEmptyRow

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  // ── State ──
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Batch entry form
  const [businessId, setBusinessId] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [rows, setRows] = useState<EntryRow[]>([emptyRow()])

  // Employee management panel
  const [showEmpPanel, setShowEmpPanel] = useState(false)
  const [newEmpName, setNewEmpName] = useState("")
  const [newEmpBizId, setNewEmpBizId] = useState<string>(BUSINESSES[0].id)
  const [addingEmp, setAddingEmp] = useState(false)
  const [deletingEmp, setDeletingEmp] = useState<string | null>(null)

  // Edit mode (single row)
  const [editEntry, setEditEntry] = useState<AttendanceEntry | null>(null)

  // Bulk delete
  const [bulkBizId, setBulkBizId] = useState("")
  const [bulkMonth, setBulkMonth] = useState(format(new Date(), "yyyy-MM"))
  const [bulkDeleting, setBulkDeleting] = useState(false)

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
            mesai: row.mesaiEnabled ? row.mesai : 0,
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
          date: editEntry.date,
          employeeName: editEntry.employeeName,
          hoursWorked: editEntry.hoursWorked,
          mealAmount: editEntry.mealAmount,
          tipAmount: editEntry.tipAmount,
          deductionAmount: editEntry.deductionAmount,
          mesai: editEntry.mesai,
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

  // ── Bulk delete ──
  async function handleBulkDelete() {
    if (!bulkBizId) { toast.error("İşletme seçin"); return }
    const bizName = BUSINESSES.find((b) => b.id === bulkBizId)?.name ?? bulkBizId
    const count = entries.filter((e) => e.businessId === bulkBizId && e.date.startsWith(bulkMonth)).length
    if (count === 0) { toast.error("Bu dönemde kayıt yok"); return }
    if (!confirm(`"${bizName}" — ${bulkMonth} için ${count} kayıt silinecek. Emin misiniz?`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch(`/api/attendance?businessId=${bulkBizId}&month=${bulkMonth}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error("Silinemedi"); return }
      toast.success(`${data.deleted} kayıt silindi`)
      fetchAll()
    } catch { toast.error("Hata oluştu") }
    finally { setBulkDeleting(false) }
  }

  // ── Summary ──
  const thisMonth = format(new Date(), "yyyy-MM")
  const thisMonthEntries = entries.filter((e) => e.date.startsWith(thisMonth))
  const totalHours = thisMonthEntries.reduce((s, e) => s + e.hoursWorked, 0)
  const empTotals = calculateEmployeeTotals(thisMonthEntries)

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

      <AttendanceManagement
        showEmployeePanel={showEmpPanel}
        employees={allEmployees}
        newEmployeeName={newEmpName}
        newEmployeeBusinessId={newEmpBizId}
        addingEmployee={addingEmp}
        deletingEmployeeId={deletingEmp}
        bulkBusinessId={bulkBizId}
        bulkMonth={bulkMonth}
        bulkDeleting={bulkDeleting}
        onNewEmployeeNameChange={setNewEmpName}
        onNewEmployeeBusinessChange={setNewEmpBizId}
        onAddEmployee={addEmployee}
        onDeleteEmployee={(employee) => void deleteEmployee(employee)}
        onBulkBusinessChange={setBulkBizId}
        onBulkMonthChange={setBulkMonth}
        onBulkDelete={() => void handleBulkDelete()}
      />


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
        <AttendanceForms
          editEntry={editEntry}
          setEditEntry={setEditEntry}
          saving={saving}
          onEditSave={handleEditSave}
          businessId={businessId}
          setBusinessId={setBusinessId}
          date={date}
          setDate={setDate}
          rows={rows}
          setRows={setRows}
          businessEmployees={bizEmployees}
          updateRow={updateRow}
          selectEmployee={selectEmployee}
          removeRow={removeRow}
          addRow={addRow}
          onBatchSave={handleBatchSave}
        />


        <AttendanceRecords
          entries={entries}
          employeeTotals={empTotals}
          editingId={editEntry?.id}
          deletingId={deleting}
          onEdit={loadEdit}
          onCancelEdit={() => setEditEntry(null)}
          onDelete={(entry) => void handleDelete(entry)}
        />
      </div>
    </div>
  )
}
