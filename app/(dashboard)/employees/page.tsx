"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

interface Business {
  id: string
  name: string
}

interface Employee {
  id: string
  name: string
  businessId: string
  business: Business
  createdAt: string
  hourlyRate: number
  overtimeMultiplier: number
}

const emptyForm = {
  name: "",
  businessId: "",
  hourlyRate: "0",
  overtimeMultiplier: "2",
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    const [employeeRes, businessRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/businesses"),
    ])
    const [employeeData, businessData] = await Promise.all([
      employeeRes.json(),
      businessRes.json(),
    ])
    setEmployees(Array.isArray(employeeData) ? employeeData : [])
    setBusinesses(Array.isArray(businessData) ? businessData : [])
    setFetching(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, businessId: businesses[0]?.id ?? "" })
    setDialogOpen(true)
  }

  function openEdit(employee: Employee) {
    setEditing(employee)
    setForm({
      name: employee.name,
      businessId: employee.businessId,
      hourlyRate: String(employee.hourlyRate || 0),
      overtimeMultiplier: String(employee.overtimeMultiplier || 2),
    })
    setDialogOpen(true)
  }

  async function saveEmployee(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.businessId) {
      toast.error("Ad ve işletme zorunludur")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        editing ? `/api/employees/${editing.id}` : "/api/employees",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            businessId: form.businessId,
            hourlyRate: Number(form.hourlyRate) || 0,
            overtimeMultiplier: Number(form.overtimeMultiplier) || 2,
          }),
        }
      )
      const result = await response.json()
      if (!response.ok) {
        toast.error(typeof result.error === "string" ? result.error : "Kaydedilemedi")
        return
      }
      toast.success(editing ? "Personel güncellendi" : "Personel eklendi")
      setDialogOpen(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function deleteEmployee(employee: Employee) {
    if (!confirm(`${employee.name} isimli personel silinsin mi?`)) return
    const response = await fetch(`/api/employees/${employee.id}`, { method: "DELETE" })
    if (!response.ok) {
      toast.error("Personel silinemedi")
      return
    }
    setEmployees((current) => current.filter((item) => item.id !== employee.id))
    toast.success("Personel silindi")
  }

  if (fetching) {
    return <div className="space-y-4"><Skeleton className="h-9 w-48" /><Skeleton className="h-80 w-full" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Çalışanlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saatlik ücret ve mesai çarpanlarını yönetin
          </p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Çalışan Ekle</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{employee.name}</p>
                  <Badge variant="outline" className="mt-2">{employee.business.name}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(employee)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={() => void deleteEmployee(employee)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saatlik ücret</p>
                  <p className="font-semibold">
                    {employee.hourlyRate > 0 ? formatCurrency(employee.hourlyRate) : "Ortak ücret"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mesai çarpanı</p>
                  <p className="font-semibold">{employee.overtimeMultiplier || 2}×</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Henüz çalışan eklenmemiş</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Çalışanı Düzenle" : "Yeni Çalışan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEmployee} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ad Soyad</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>İşletme</Label>
              <Select
                value={form.businessId}
                onValueChange={(businessId) => setForm({ ...form, businessId })}
              >
                <SelectTrigger><SelectValue placeholder="İşletme seçin" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Saatlik Ücret (₺)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">0 ise ortak ayar kullanılır.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mesai Çarpanı</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.25"
                  value={form.overtimeMultiplier}
                  onChange={(event) => setForm({ ...form, overtimeMultiplier: event.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
