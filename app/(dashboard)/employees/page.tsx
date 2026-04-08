"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Phone,
  Building2,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, getSalaryTypeName } from "@/lib/utils"
import { employeeSchema, type EmployeeInput } from "@/lib/validations"
import { format } from "date-fns"

interface Business { id: string; name: string }
interface Employee {
  id: string
  name: string
  phone?: string
  isActive: boolean
  salaryType: string
  currentSalary: number
  dailyMealRate: number
  defaultTipEnabled: boolean
  startDate?: string
  endDate?: string
  notes?: string
  businessAssignments: Array<{ business: { id: string; name: string } }>
  salaryHistory?: Array<{ amount: number; effectiveDate: string; salaryType: string }>
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      isActive: true,
      salaryType: "DAILY",
      currentSalary: "0",
      dailyMealRate: "75",
      defaultTipEnabled: false,
      businessIds: [],
    },
  })

  const watchedValues = watch()

  useEffect(() => {
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/businesses").then((r) => r.json()),
    ]).then(([emps, biz]) => {
      setEmployees(emps)
      setBusinesses(biz)
    }).finally(() => setFetching(false))
  }, [])

  function openNew() {
    reset({
      name: "",
      phone: "",
      email: "",
      isActive: true,
      salaryType: "DAILY",
      currentSalary: "0",
      dailyMealRate: "75",
      defaultTipEnabled: false,
      businessIds: [],
      startDate: format(new Date(), "yyyy-MM-dd"),
    })
    setSelectedBizIds([])
    setEditingEmployee(null)
    setShowForm(true)
  }

  function openEdit(emp: Employee) {
    const bizIds = emp.businessAssignments.map((ba) => ba.business.id)
    setSelectedBizIds(bizIds)
    reset({
      name: emp.name,
      phone: emp.phone ?? "",
      isActive: emp.isActive,
      salaryType: emp.salaryType as any,
      currentSalary: String(emp.currentSalary),
      dailyMealRate: String(emp.dailyMealRate),
      defaultTipEnabled: emp.defaultTipEnabled,
      businessIds: bizIds,
      startDate: emp.startDate ? format(new Date(emp.startDate), "yyyy-MM-dd") : "",
      notes: emp.notes ?? "",
    })
    setEditingEmployee(emp)
    setShowForm(true)
  }

  function toggleBusiness(bizId: string) {
    setSelectedBizIds((prev) => {
      const next = prev.includes(bizId) ? prev.filter((id) => id !== bizId) : [...prev, bizId]
      setValue("businessIds", next)
      return next
    })
  }

  async function onSubmit(data: EmployeeInput) {
    data.businessIds = selectedBizIds
    if (selectedBizIds.length === 0) {
      toast.error("En az bir işletme seçin")
      return
    }

    setLoading(true)
    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees"
      const method = editingEmployee ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Kaydedilemedi")
        return
      }

      toast.success(editingEmployee ? "Çalışan güncellendi" : "Çalışan oluşturuldu")
      setShowForm(false)

      const [emps] = await Promise.all([fetch("/api/employees").then((r) => r.json())])
      setEmployees(emps)
    } finally {
      setLoading(false)
    }
  }

  async function deleteEmployee(id: string) {
    if (!confirm("Bu çalışanı silmek istediğinizden emin misiniz?")) return
    await fetch(`/api/employees/${id}`, { method: "DELETE" })
    toast.success("Çalışan silindi")
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  if (fetching) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

  const active = employees.filter((e) => e.isActive)
  const inactive = employees.filter((e) => !e.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Çalışanlar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {active.length} aktif, {inactive.length} pasif çalışan
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Çalışan Ekle
        </Button>
      </div>

      {/* Çalışan listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <Card key={emp.id} className={!emp.isActive ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{emp.name}</p>
                    <Badge variant={emp.isActive ? "success" : "secondary"} className="text-xs flex-shrink-0">
                      {emp.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {emp.phone}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => deleteEmployee(emp.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ücret Tipi</span>
                  <span className="font-medium">{getSalaryTypeName(emp.salaryType)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Maaş</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(Number(emp.currentSalary))}</span>
                </div>
                {Number(emp.dailyMealRate) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Yemek</span>
                    <span>{formatCurrency(Number(emp.dailyMealRate))}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {emp.businessAssignments.map((ba) => (
                  <Badge key={ba.business.id} variant="outline" className="text-xs">
                    {ba.business.name}
                  </Badge>
                ))}
              </div>

              {emp.startDate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Başlangıç: {formatDate(emp.startDate)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Henüz çalışan eklenmemiş</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Çalışanı Düzenle" : "Yeni Çalışan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Ad Soyad *</Label>
                <Input placeholder="Örn: Ali Yılmaz" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input placeholder="05XX XXX XXXX" {...register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" {...register("startDate")} />
              </div>
            </div>

            {/* Ücret */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ücret Tipi *</Label>
                <Select
                  value={watchedValues.salaryType}
                  onValueChange={(v) => setValue("salaryType", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Aylık Maaş</SelectItem>
                    <SelectItem value="DAILY">Günlük Ücret</SelectItem>
                    <SelectItem value="HOURLY">Saatlik Ücret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Maaş (₺) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="text-right"
                  {...register("currentSalary")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yemek (₺/gün)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-right"
                  {...register("dailyMealRate")}
                />
              </div>
            </div>

            {/* İşletmeler */}
            <div className="space-y-1.5">
              <Label>İşletmeler *</Label>
              <div className="flex flex-wrap gap-2">
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => toggleBusiness(biz.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedBizIds.includes(biz.id)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {biz.name}
                  </button>
                ))}
              </div>
              {selectedBizIds.length === 0 && (
                <p className="text-xs text-red-500">En az bir işletme seçin</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={watchedValues.isActive}
                  onCheckedChange={(v) => setValue("isActive", v)}
                />
                <Label>Aktif</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={watchedValues.defaultTipEnabled}
                  onCheckedChange={(v) => setValue("defaultTipEnabled", v)}
                />
                <Label>Varsayılan Tip</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea rows={2} placeholder="Çalışan hakkında notlar..." {...register("notes")} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                İptal
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
