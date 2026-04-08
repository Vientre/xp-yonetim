"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PlusCircle,
  Trash2,
  Save,
  ClipboardList,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import { format } from "date-fns"

interface Business {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  color: string
}

interface Closing {
  id: string
  date: string
  business: { name: string }
  totalIncome: number
  totalExpense: number
  netAmount: number
  status: string
  cashIncome: number
  cardIncome: number
  ticketIncome: number
}

const expenseRow = z.object({
  categoryId: z.string().min(1, "Kategori seçin"),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Geçerli tutar girin"),
  description: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "TICKET", "MIXED"]).default("CASH"),
})

const formSchema = z.object({
  businessId: z.string().min(1, "İşletme seçin"),
  date: z.string().min(1, "Tarih seçin"),
  cashIncome: z.string().default("0"),
  cardIncome: z.string().default("0"),
  ticketIncome: z.string().default("0"),
  notes: z.string().optional(),
  expenses: z.array(expenseRow),
})

type FormData = z.infer<typeof formSchema>

export default function DailyEntryPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recentClosings, setRecentClosings] = useState<Closing[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [viewClosing, setViewClosing] = useState<Closing | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      businessId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      cashIncome: "0",
      cardIncome: "0",
      ticketIncome: "0",
      notes: "",
      expenses: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "expenses" })

  const watchedValues = watch()
  const totalIncome =
    (parseFloat(watchedValues.cashIncome || "0") || 0) +
    (parseFloat(watchedValues.cardIncome || "0") || 0) +
    (parseFloat(watchedValues.ticketIncome || "0") || 0)

  const totalExpense = watchedValues.expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount || "0") || 0),
    0
  )
  const net = totalIncome - totalExpense

  useEffect(() => {
    Promise.all([
      fetch("/api/businesses").then((r) => r.json()),
      fetch("/api/expense-categories").then((r) => r.json()),
      fetch("/api/daily-closings?limit=20").then((r) => r.json()),
    ]).then(([biz, cats, closings]) => {
      setBusinesses(biz)
      setCategories(cats)
      setRecentClosings(closings)
      if (biz.length === 1) setValue("businessId", biz[0].id)
    }).finally(() => setFetching(false))
  }, [])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch("/api/daily-closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.status === 409) {
        toast.error("Bu işletme için bu tarihe ait kayıt zaten mevcut!")
        return
      }

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Kayıt oluşturulamadı")
        return
      }

      toast.success("Günlük kapanış kaydedildi!")
      reset({
        businessId: data.businessId,
        date: format(new Date(), "yyyy-MM-dd"),
        cashIncome: "0",
        cardIncome: "0",
        ticketIncome: "0",
        notes: "",
        expenses: [],
      })

      // Listeyi güncelle
      fetch("/api/daily-closings?limit=20")
        .then((r) => r.json())
        .then(setRecentClosings)
    } finally {
      setLoading(false)
    }
  }

  function addExpenseRow() {
    if (categories.length === 0) return
    append({
      categoryId: categories[0].id,
      amount: "",
      description: "",
      paymentMethod: "CASH",
    })
  }

  if (fetching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Günlük Kayıt</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gelir ve gider bilgilerini girin</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Yeni Kapanış Kaydı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* İşletme ve Tarih */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>İşletme *</Label>
                    <Select
                      value={watchedValues.businessId}
                      onValueChange={(v) => setValue("businessId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="İşletme seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessId && (
                      <p className="text-xs text-red-500">{errors.businessId.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tarih *</Label>
                    <Input type="date" {...register("date")} />
                    {errors.date && (
                      <p className="text-xs text-red-500">{errors.date.message}</p>
                    )}
                  </div>
                </div>

                {/* Gelir Alanları */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Gelir Bilgileri
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nakit (₺)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register("cashIncome")}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kart (₺)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register("cardIncome")}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bilet (₺)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register("ticketIncome")}
                        className="text-right"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-green-600">
                    Toplam Gelir: {formatCurrency(totalIncome)}
                  </div>
                </div>

                {/* Gider Alanları */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Gider Kalemleri
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExpenseRow}
                      className="h-8 text-xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      Gider Ekle
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground bg-gray-50 rounded-lg border-2 border-dashed">
                      Gider kalemi yok. Eklemek için yukarıdaki butona tıklayın.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-12 gap-2 items-start p-2 bg-gray-50 rounded-lg"
                        >
                          {/* Kategori */}
                          <div className="col-span-4">
                            <Select
                              value={watchedValues.expenses[index]?.categoryId}
                              onValueChange={(v) => setValue(`expenses.${index}.categoryId`, v)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Kategori" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Tutar */}
                          <div className="col-span-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="h-8 text-xs text-right bg-white"
                              {...register(`expenses.${index}.amount`)}
                            />
                          </div>
                          {/* Açıklama */}
                          <div className="col-span-4">
                            <Input
                              placeholder="Not (opsiyonel)"
                              className="h-8 text-xs bg-white"
                              {...register(`expenses.${index}.description`)}
                            />
                          </div>
                          {/* Sil */}
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalExpense > 0 && (
                    <div className="mt-2 text-right text-sm font-semibold text-red-600">
                      Toplam Gider: {formatCurrency(totalExpense)}
                    </div>
                  )}
                </div>

                {/* Net */}
                <div
                  className={`p-3 rounded-lg text-center ${
                    net >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">Net Durum</p>
                  <p className={`text-2xl font-bold ${net >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(net)}
                  </p>
                </div>

                {/* Notlar */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Notlar (opsiyonel)</Label>
                  <Textarea
                    placeholder="Gün hakkında not ekleyin..."
                    rows={2}
                    {...register("notes")}
                  />
                </div>

                {/* Yüksek tutar uyarısı */}
                {(totalIncome > 50000 || totalExpense > 20000) && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Yüksek tutar girdiniz. Lütfen kontrol edin.</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Son Kayıtlar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Son Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentClosings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz kayıt yok</p>
              ) : (
                <div className="divide-y">
                  {recentClosings.map((closing) => (
                    <div key={closing.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{closing.business.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(closing.date)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-green-600 font-medium">
                            +{formatCurrency(Number(closing.totalIncome))}
                          </p>
                          <p className="text-xs text-red-500">
                            -{formatCurrency(Number(closing.totalExpense))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <Badge
                          variant={closing.status === "CLOSED" ? "success" : "warning"}
                          className="text-xs"
                        >
                          {closing.status === "CLOSED" ? "Kapalı" : "Açık"}
                        </Badge>
                        <span
                          className={`text-xs font-semibold ${
                            Number(closing.netAmount) >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(Number(closing.netAmount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
