"use client"

import { useEffect, useState, useMemo } from "react"
import { CalendarClock, Plus, Trash2, RefreshCw, AlertTriangle, X, RotateCcw, Phone, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Reservation = {
  id: string
  tarih: string
  gun: string
  saat: string
  isim: string
  telefon: string
  ekleyenId: string
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenId: string
  silenAd: string
  silmeTarihi: string
}

type Me = { id: string; name: string; role: "admin" | "manager" | "staff" }

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function formatTrDate(iso: string) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function formatDateTime(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function RezervasyonlarPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Reservation | null>(null)

  const [tarih, setTarih] = useState(todayISO())
  const [saat, setSaat] = useState("")
  const [isim, setIsim] = useState("")
  const [telefon, setTelefon] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function fetchMe() {
    try {
      const res = await fetch("/api/me")
      if (res.ok) {
        const u = await res.json()
        setMe({ id: u.id, name: u.name, role: u.role })
      }
    } catch {}
  }

  async function fetchAll() {
    setLoading(true)
    try {
      const url = me?.role === "admin" ? "/api/rezervasyonlar?includeDeleted=1" : "/api/rezervasyonlar"
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setItems(json.reservations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMe() }, [])
  useEffect(() => { if (me) fetchAll() }, [me])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!isim.trim() && !telefon.trim()) {
      toast.error("İsim veya telefon zorunlu")
      return
    }
    if (!saat) {
      toast.error("Saat zorunlu")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/rezervasyonlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", tarih, saat, isim, telefon }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error?.message || "Eklenemedi")
        return
      }
      toast.success("Rezervasyon eklendi")
      setIsim("")
      setTelefon("")
      setSaat("")
      setShowForm(false)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    })
    if (!res.ok) {
      toast.error("Silinemedi")
      return
    }
    toast.success("Rezervasyon silindi")
    await fetchAll()
  }

  async function restore(id: string) {
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", id }),
    })
    if (!res.ok) {
      toast.error("Geri alınamadı")
      return
    }
    toast.success("Geri alındı")
    await fetchAll()
  }

  const active = useMemo(() => items.filter((r) => !r.silindi), [items])
  const deleted = useMemo(() => items.filter((r) => r.silindi), [items])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            Rezervasyonlar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kayıtlar her ayın 1&apos;inde otomatik temizlenir
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Yenile
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasyon
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Rezervasyon</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tarih</label>
                <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Saat</label>
                <Input type="time" value={saat} onChange={(e) => setSaat(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">İsim</label>
                <Input value={isim} onChange={(e) => setIsim(e.target.value)} placeholder="Ad Soyad" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Telefon</label>
                <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05xx ..." />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              İsim ve telefondan en az biri girilmeli.
            </p>
          </CardContent>
        </Card>
      )}

      {me?.role === "admin" ? (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Aktif ({active.length})</TabsTrigger>
            <TabsTrigger value="deleted">Silinmiş ({deleted.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <ReservationTable
              loading={loading}
              items={active}
              showAuditAdd
              onDelete={(r) => setPendingDelete(r)}
            />
          </TabsContent>
          <TabsContent value="deleted" className="mt-4">
            <ReservationTable
              loading={loading}
              items={deleted}
              showAuditAdd
              showAuditDelete
              onRestore={(id) => restore(id)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ReservationTable
          loading={loading}
          items={active}
          onDelete={(r) => setPendingDelete(r)}
        />
      )}

      {pendingDelete && (
        <DeleteDialog
          item={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function ReservationTable({
  loading,
  items,
  showAuditAdd = false,
  showAuditDelete = false,
  onDelete,
  onRestore,
}: {
  loading: boolean
  items: Reservation[]
  showAuditAdd?: boolean
  showAuditDelete?: boolean
  onDelete?: (r: Reservation) => void
  onRestore?: (id: string) => void
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Kayıt yok
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Gün</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Saat</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İsim</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Telefon</th>
                {showAuditAdd && (
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ekleyen</th>
                )}
                {showAuditDelete && (
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Silen</th>
                )}
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatTrDate(r.tarih)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.gun}</td>
                  <td className="px-4 py-2.5 font-mono">{r.saat}</td>
                  <td className="px-4 py-2.5">
                    {r.isim ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.isim}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.telefon ? (
                      <a href={`tel:${r.telefon}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
                        <Phone className="h-3.5 w-3.5" />
                        {r.telefon}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {showAuditAdd && (
                    <td className="px-4 py-2.5">
                      <p className="text-xs">{r.ekleyenAd || "-"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(r.olusturmaTarihi)}</p>
                    </td>
                  )}
                  {showAuditDelete && (
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-red-600">{r.silenAd || "-"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(r.silmeTarihi)}</p>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right">
                    {r.silindi ? (
                      onRestore && (
                        <Button variant="outline" size="sm" onClick={() => onRestore(r.id)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Geri Al
                        </Button>
                      )
                    ) : (
                      onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Sil
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: Reservation
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">Rezervasyonu sil?</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatTrDate(item.tarih)} {item.saat} —{" "}
              <span className="font-medium text-slate-700">{item.isim || item.telefon}</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Yöneticiler silen kişiyi ve saati görebilecek.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>İptal</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Sil
          </Button>
        </div>
      </div>
    </div>
  )
}
