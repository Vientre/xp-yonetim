"use client"

import type { FormEventHandler } from "react"
import { Eraser, Plus, Trash2, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BUSINESSES } from "@/lib/constants"
import type { Employee } from "./types"

interface AttendanceManagementProps {
  showEmployeePanel: boolean
  employees: Employee[]
  newEmployeeName: string
  newEmployeeBusinessId: string
  addingEmployee: boolean
  deletingEmployeeId: string | null
  bulkBusinessId: string
  bulkMonth: string
  bulkDeleting: boolean
  onNewEmployeeNameChange: (value: string) => void
  onNewEmployeeBusinessChange: (value: string) => void
  onAddEmployee: FormEventHandler<HTMLFormElement>
  onDeleteEmployee: (employee: Employee) => void
  onBulkBusinessChange: (value: string) => void
  onBulkMonthChange: (value: string) => void
  onBulkDelete: () => void
}

export function AttendanceManagement({
  showEmployeePanel,
  employees,
  newEmployeeName,
  newEmployeeBusinessId,
  addingEmployee,
  deletingEmployeeId,
  bulkBusinessId,
  bulkMonth,
  bulkDeleting,
  onNewEmployeeNameChange,
  onNewEmployeeBusinessChange,
  onAddEmployee,
  onDeleteEmployee,
  onBulkBusinessChange,
  onBulkMonthChange,
  onBulkDelete,
}: AttendanceManagementProps) {
  return (
    <>
      {showEmployeePanel && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-violet-600" />Personel Yönetimi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onAddEmployee} className="flex flex-wrap gap-2">
              <Input placeholder="Personel adı" value={newEmployeeName} onChange={(event) => onNewEmployeeNameChange(event.target.value)} className="min-w-[180px] flex-1 bg-white" />
              <Select value={newEmployeeBusinessId} onValueChange={onNewEmployeeBusinessChange}>
                <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{BUSINESSES.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="submit" disabled={addingEmployee} size="sm" className="gap-1"><Plus className="h-4 w-4" />{addingEmployee ? "Ekleniyor..." : "Ekle"}</Button>
            </form>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BUSINESSES.map((business) => {
                const businessEmployees = employees.filter((employee) => employee.businessId === business.id)
                return <div key={business.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">{business.name}</p>
                  {businessEmployees.length === 0 ? <p className="text-xs italic text-slate-400">Personel yok</p> : (
                    <ul className="space-y-1">{businessEmployees.map((employee) => (
                      <li key={employee.id} className="flex items-center justify-between gap-1">
                        <span className="text-sm text-slate-700">{employee.name}</span>
                        <button type="button" onClick={() => onDeleteEmployee(employee)} disabled={deletingEmployeeId === employee.id} className="rounded p-0.5 text-slate-300 transition-colors hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}</ul>
                  )}
                </div>
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-red-700"><Eraser className="h-4 w-4" /><span className="text-sm font-medium">Toplu Sil</span></div>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">İşletme</Label>
                <Select value={bulkBusinessId} onValueChange={onBulkBusinessChange}>
                  <SelectTrigger className="h-8 w-44 bg-white text-sm"><SelectValue placeholder="Seçin..." /></SelectTrigger>
                  <SelectContent>{BUSINESSES.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ay</Label>
                <Input type="month" value={bulkMonth} onChange={(event) => onBulkMonthChange(event.target.value)} className="h-8 w-36 bg-white text-sm" />
              </div>
              <Button variant="destructive" size="sm" onClick={onBulkDelete} disabled={bulkDeleting || !bulkBusinessId} className="h-8">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />{bulkDeleting ? "Siliniyor..." : "Tümünü Sil"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
