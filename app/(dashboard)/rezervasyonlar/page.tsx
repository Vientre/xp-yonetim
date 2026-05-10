"use client"

import { useEffect, useState, useMemo } from "react"
import {
  CalendarClock, Plus, Trash2, RefreshCw, AlertTriangle, X, RotateCcw, Phone,
  StickyNote, Check, CheckCircle2, XCircle, Pencil, Users, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Durum = "" | "geldi" | "iptal"
type Sure = 30 | 45 | 60

type Reservation = {
  id: string
  tarih: string
  gun: string
  saat: string
  not: string
  telefon: string
  kisiSayisi: number
  sure: number
  ekleyenId: string
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenId: string
  silenAd: string
  silmeTarihi: string
  durum: Durum
  musteriNotu: string
}

type Me = { id: string; name: string; role: "admin" | "manager" | "staff" }

type PendingAction = { item: Reservation; type: "delete" | "complete" }

const SURE_OPTIONS: { value: Sure; label: string }[] = [
  { value: 30, label: "30 dk (yarım saat)" },
  { value: 45, label: "45 dk" },
  { value: 60, label: "60 dk (1 saat)" },
]

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

function addMinutes(hhmm: string, minutes: number): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return ""
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + minutes
  const eh = Math.floor(total / 60) % 24
  const em = ((total % 60) + 60) % 60
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
}

function formatSaatRange(saat: string, sure: number): string {
  if (!saat) return ""
  if (!sure || sure <= 0) return saat
  const end = addMinutes(saat, sure + 15)
  return end ? `${saat}-${end}` : saat
}

function formatSure(min: number): string {
  if (min === 30) return "yarım saat"
  if (min === 60) return "1 saat"
  if (min > 0) return `${min} dk`
  return ""
}

function groupByDate(items: Reservation[]) {
  const groups: { tarih: string; gun: string; items: Reservation[] }[] = []
  for (const r of items) {
    const last = groups[groups.length - 1]
    if (last && last.tarih === r.tarih) {
      last.items.push(r)
    } else {
      groups.push({ tarih: r.tarih, gun: r.gun, items: [r] })
    }
  }
  return groups
}

type FormState = {
  tarih: string
  saat: string
  kisiSayisi: string
  sure: Sure
  telefon: string
  not: string
}

const emptyForm = (): FormState => ({
  tarih: todayISO(),
  saat: "",
  kisiSayisi: "",
  sure: 30,
  telefon: "",
  not: "",
})

export default function RezervasyonlarPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [noteEditing, setNoteEditing] = useState<Reservation | null>(null)

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
      const res = await fetch("/api/rezervasyonlar?includeDeleted=1")
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

  function openNewForm() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEditForm(r: Reservation) {
    setEditingId(r.id)
    setForm({
      tarih: r.tarih,
      saat: r.saat,
      kisiSayisi: r.kisiSayisi > 0 ? String(r.kisiSayisi) : "",
      sure: (r.sure === 45 || r.sure === 60 ? r.sure : 30) as Sure,
      telefon: r.telefon,
      not: r.not,
    })
    setShowForm(true)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const kisi = parseInt(form.kisiSayisi, 10)
    if (!form.saat) return toast.error("Saat zorunlu")
    if (!Number.isFinite(kisi) || kisi <= 0) return toast.error("Kişi sayısı geçersiz")
    if (!form.telefon.trim()) return toast.error("Telefon zorunlu")

    setSubmitting(true)
    try {
      const payload = {
        action: editingId ? "update" : "add",
        ...(editingId ? { id: editingId } : {}),
        tarih: form.tarih,
        saat: form.saat,
        kisiSayisi: kisi,
        sure: form.sure,
        telefon: form.telefon.trim(),
        not: form.not.trim(),
      }
      const res = await fetch("/api/rezervasyonlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(typeof j?.error === "string" ? j.error : "İşlem başarısız")
        return
      }
      toast.success(editingId ? "Rezervasyon güncellendi" : "Rezervasyon eklendi")
      closeForm()
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmAction() {
    if (!pending) return
    const { item, type } = pending
    setPending(null)
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: type, id: item.id }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(typeof j?.error === "string" ? j.error : "İşlem başarısız")
      return
    }
    toast.success(type === "complete" ? "Müşteri geldi olarak işaretlendi" : "Rezervasyon silindi")
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

  async function uncomplete(id: string) {
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "uncomplete", id }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(typeof j?.error === "string" ? j.error : "Geri alınamadı")
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
            LaserTag Rezervasyon
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Yenile
          </Button>
          <Button onClick={() => (showForm && !editingId ? closeForm() : openNewForm())}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasyon
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Rezervasyonu Düzenle" : "Yeni Rezervasyon"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tarih *</label>
                <Input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Saat *</label>
                <Input
                  type="time"
                  value={form.saat}
                  onChange={(e) => setForm((f) => ({ ...f, saat: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Kişi sayısı *</label>
                <Input
                  type="number"
                  min={1}
                  value={form.kisiSayisi}
                  onChange={(e) => setForm((f) => ({ ...f, kisiSayisi: e.target.value }))}
                  placeholder="örn. 4"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Süre *</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.sure}
                  onChange={(e) => setForm((f) => ({ ...f, sure: parseInt(e.target.value, 10) as Sure }))}
                >
                  {SURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Telefon *</label>
                <Input
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  placeholder="05xx ..."
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Not</label>
                <Input
                  value={form.not}
                  onChange={(e) => setForm((f) => ({ ...f, not: e.target.value }))}
                  placeholder="(opsiyonel)"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  {form.saat && Number.isFinite(parseInt(form.kisiSayisi, 10)) ? (
                    <>
                      Önizleme: <span className="font-mono font-medium text-slate-700">
                        {formatSaatRange(form.saat, form.sure)}
                      </span>{" "}
                      {form.kisiSayisi || "?"} kişi · {formatSure(form.sure)}
                    </>
                  ) : (
                    "* zorunlu alanlar"
                  )}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={closeForm}>İptal</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? "Kaydediliyor..."
                      : editingId ? "Güncelle" : "Kaydet"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Aktif ({active.length})</TabsTrigger>
          <TabsTrigger value="deleted">Geçmiş ({deleted.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <ReservationGroups
            loading={loading}
            items={active}
            showAuditAdd
            onEdit={(r) => openEditForm(r)}
            onComplete={(r) => setPending({ item: r, type: "complete" })}
            onUncomplete={(id) => uncomplete(id)}
            onDelete={(r) => setPending({ item: r, type: "delete" })}
          />
        </TabsContent>
        <TabsContent value="deleted" className="mt-4">
          <ReservationGroups
            loading={loading}
            items={deleted}
            showAuditAdd
            showAuditDelete
            showCustomerNote
            onAddNote={(r) => setNoteEditing(r)}
            onRestore={me?.role === "admin" ? (id) => restore(id) : undefined}
          />
        </TabsContent>
      </Tabs>

      {pending && (
        <ConfirmDialog
          pending={pending}
          onCancel={() => setPending(null)}
          onConfirm={confirmAction}
        />
      )}

      {noteEditing && (
        <NoteDialog
          item={noteEditing}
          onCancel={() => setNoteEditing(null)}
          onSave={async (text) => {
            const id = noteEditing.id
            setNoteEditing(null)
            const res = await fetch("/api/rezervasyonlar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "addNote", id, musteriNotu: text }),
            })
            if (!res.ok) {
              const j = await res.json().catch(() => ({}))
              toast.error(typeof j?.error === "string" ? j.error : "Not kaydedilemedi")
              return
            }
            toast.success("Müşteri notu kaydedildi")
            await fetchAll()
          }}
        />
      )}
    </div>
  )
}

function ReservationGroups({
  loading,
  items,
  showAuditAdd = false,
  showAuditDelete = false,
  showCustomerNote = false,
  onEdit,
  onComplete,
  onUncomplete,
  onDelete,
  onRestore,
  onAddNote,
}: {
  loading: boolean
  items: Reservation[]
  showAuditAdd?: boolean
  showAuditDelete?: boolean
  showCustomerNote?: boolean
  onEdit?: (r: Reservation) => void
  onComplete?: (r: Reservation) => void
  onUncomplete?: (id: string) => void
  onDelete?: (r: Reservation) => void
  onRestore?: (id: string) => void
  onAddNote?: (r: Reservation) => void
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

  const groups = groupByDate(items)

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.tarih} className="overflow-hidden">
          <div className="flex items-center justify-between bg-blue-50 border-b border-blue-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm text-blue-900">{formatTrDate(g.tarih)}</span>
              <span className="text-xs text-blue-700">— {g.gun}</span>
            </div>
            <span className="text-xs text-blue-700 font-medium">{g.items.length} kayıt</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Saat</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Kişi · Süre</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Telefon</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Not</th>
                  {showAuditAdd && (
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ekleyen</th>
                  )}
                  {showAuditDelete && (
                    <>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Durum</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İşlem Yapan</th>
                    </>
                  )}
                  {showCustomerNote && (
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Müşteri Notu</th>
                  )}
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r) => {
                  const isGeldi = r.durum === "geldi" && !r.silindi
                  return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b last:border-0",
                      isGeldi ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-gray-50"
                    )}
                  >
                    <td className={cn(
                      "px-4 py-2.5 font-mono whitespace-nowrap font-medium",
                      isGeldi ? "text-emerald-800" : "text-slate-800"
                    )}>
                      {formatSaatRange(r.saat, r.sure)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.kisiSayisi > 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {r.kisiSayisi}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatSure(r.sure)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
                    <td className="px-4 py-2.5">
                      {r.not ? (
                        <span className="inline-flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.not}
                        </span>
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
                      <>
                        <td className="px-4 py-2.5">
                          <DurumBadge durum={r.durum} />
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs">{r.silenAd || "-"}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(r.silmeTarihi)}</p>
                        </td>
                      </>
                    )}
                    {showCustomerNote && (
                      <td className="px-4 py-2.5 max-w-xs">
                        {r.musteriNotu ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <StickyNote className="h-3.5 w-3.5 text-amber-600" />
                            {r.musteriNotu}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.silindi ? (
                        <div className="flex gap-1.5 justify-end">
                          {onAddNote && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() => onAddNote(r)}
                              title="Müşteri notu"
                            >
                              <StickyNote className="h-3.5 w-3.5 mr-1" />
                              {r.musteriNotu ? "Notu Düzenle" : "Not Ekle"}
                            </Button>
                          )}
                          {onRestore && (
                            <Button variant="outline" size="sm" onClick={() => onRestore(r.id)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Geri Al
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1.5 justify-end items-center">
                          {isGeldi ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Geldi
                            </span>
                          ) : (
                            onComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => onComplete(r)}
                                title="Müşteri geldi"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Geldi
                              </Button>
                            )
                          )}
                          {isGeldi && onUncomplete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600"
                              onClick={() => onUncomplete(r.id)}
                              title="Geldi'yi geri al"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-700 border-blue-200 hover:bg-blue-50"
                              onClick={() => onEdit(r)}
                              title="Düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Düzenle
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => onDelete(r)}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Sil
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}

function DurumBadge({ durum }: { durum: Durum }) {
  if (durum === "geldi") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Geldi
      </span>
    )
  }
  if (durum === "iptal") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" />
        İptal
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">-</span>
}

function NoteDialog({
  item,
  onCancel,
  onSave,
}: {
  item: Reservation
  onCancel: () => void
  onSave: (text: string) => void | Promise<void>
}) {
  const [text, setText] = useState(item.musteriNotu)
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-md">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <StickyNote className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">Müşteri Notu</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatTrDate(item.tarih)} {formatSaatRange(item.saat, item.sure)} —{" "}
              <span className="font-medium text-slate-700">{item.telefon || item.not}</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Bu müşteri ile ilgili not ekleyin (örn: tekrar gelecek, problemli vs.)"
          rows={4}
          maxLength={500}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1 mb-4">{text.length}/500</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>İptal</Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={async () => {
              setSaving(true)
              await onSave(text)
            }}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingAction
  onCancel: () => void
  onConfirm: () => void
}) {
  const isComplete = pending.type === "complete"
  const { item } = pending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            isComplete ? "bg-emerald-100" : "bg-red-100"
          )}>
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">
              {isComplete ? "Müşteri geldi mi?" : "Rezervasyonu sil?"}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatTrDate(item.tarih)} {formatSaatRange(item.saat, item.sure)} —{" "}
              <span className="font-medium text-slate-700">
                {item.kisiSayisi > 0 ? `${item.kisiSayisi} kişi` : (item.not || item.telefon)}
              </span>
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          {isComplete
            ? "Kayıt 'Geldi' olarak işaretlenip yeşil renkte kalacak."
            : "Kayıt 'İptal' olarak işaretlenip Geçmiş sekmesine taşınacak."}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Vazgeç</Button>
          <Button
            size="sm"
            className={cn(
              isComplete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            )}
            onClick={onConfirm}
          >
            {isComplete ? (<><Check className="w-3.5 h-3.5 mr-1" />Geldi</>) : (<><Trash2 className="w-3.5 h-3.5 mr-1" />Sil</>)}
          </Button>
        </div>
      </div>
    </div>
  )
}
