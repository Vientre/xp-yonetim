"use client"

import { useEffect, useState, useMemo } from "react"
import {
  CalendarClock, Plus, Trash2, RefreshCw, AlertTriangle, X, RotateCcw, Phone, Download,
  StickyNote, Check, CheckCircle2, XCircle, Pencil, Users, Clock, Trash, ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"

type Durum = "" | "geldi" | "gelmedi" | "iptal"
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

type PendingAction = { item: Reservation; type: "delete" | "complete" | "noshow" }

type PendingHardDelete =
  | { kind: "single"; item: Reservation }
  | { kind: "date"; tarih: string; gun: string; count: number }
  | { kind: "week"; tarih: string; weekStart: string; weekEnd: string; count: number }
  | { kind: "month"; tarih: string; yearMonth: string; count: number }

const SURE_OPTIONS: { value: Sure; label: string }[] = [
  { value: 30, label: "30 dk (yarım saat)" },
  { value: 45, label: "45 dk" },
  { value: 60, label: "60 dk (1 saat)" },
]

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function isoOffset(days: number, base?: string): string {
  const d = new Date((base ?? todayISO()) + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function reservationMinutes(saat: string): number {
  if (!saat || !/^\d{2}:\d{2}$/.test(saat)) return -1
  const [h, m] = saat.split(":").map(Number)
  return h * 60 + m
}

/** İki rezervasyonun zaman aralıklarının çakışıp çakışmadığını kontrol eder. Bitiş saati = başlangıç + süre + 15dk buffer. */
function timesOverlap(saatA: string, sureA: number, saatB: string, sureB: number): boolean {
  const aStart = reservationMinutes(saatA)
  const bStart = reservationMinutes(saatB)
  if (aStart < 0 || bStart < 0) return false
  const aEnd = aStart + (sureA || 0) + 15
  const bEnd = bStart + (sureB || 0) + 15
  return aStart < bEnd && bStart < aEnd
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

function startOfWeekIso(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  const dow = d.getUTCDay()
  const offset = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

function endOfWeekIso(iso: string): string {
  const d = new Date(startOfWeekIso(iso) + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

const TR_MONTHS_LONG = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  if (!y || !m) return yearMonth
  return `${TR_MONTHS_LONG[m - 1]} ${y}`
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const [, ms, ds] = weekStart.split("-").map(Number)
  const [, me, de] = weekEnd.split("-").map(Number)
  if (ms === me) {
    return `${ds}-${de} ${TR_MONTHS_LONG[(ms ?? 1) - 1]}`
  }
  return `${ds} ${TR_MONTHS_LONG[(ms ?? 1) - 1]} - ${de} ${TR_MONTHS_LONG[(me ?? 1) - 1]}`
}

/** Strip non-digits and take last 10 chars to compare regardless of "+90", "0", spaces, etc. */
function normalizePhone(s: string): string {
  return (s ?? "").replace(/\D/g, "").slice(-10)
}

type PhoneStats = {
  total: number
  geldi: number
  gelmedi: number
  iptal: number
}

function computePhoneStats(
  items: Reservation[],
  rawPhone: string,
  excludeId?: string
): PhoneStats | null {
  const norm = normalizePhone(rawPhone)
  if (norm.length < 7) return null
  const matching = items.filter((r) => {
    if (excludeId && r.id === excludeId) return false
    return normalizePhone(r.telefon) === norm
  })
  return {
    total: matching.length,
    geldi: matching.filter((r) => r.durum === "geldi").length,
    gelmedi: matching.filter((r) => r.durum === "gelmedi").length,
    iptal: matching.filter((r) => r.durum === "iptal").length,
  }
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
  const [hardDelete, setHardDelete] = useState<PendingHardDelete | null>(null)
  const [endDayPending, setEndDayPending] = useState<{ tarih: string; gun: string; count: number } | null>(null)

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
    toast.success(
      type === "complete" ? "Müşteri geldi olarak işaretlendi" :
      type === "noshow" ? "Müşteri gelmedi olarak işaretlendi" :
      "Rezervasyon silindi"
    )
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

  async function confirmHardDelete() {
    if (!hardDelete) return
    const target = hardDelete
    setHardDelete(null)
    let payload: Record<string, unknown>
    if (target.kind === "single") {
      payload = { action: "hardDelete", id: target.item.id }
    } else {
      const range = target.kind === "date" ? "day" : target.kind
      payload = { action: "hardDeleteDate", tarih: target.tarih, range }
    }
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(typeof j?.error === "string" ? j.error : "Silinemedi")
      return
    }
    if (target.kind === "single") {
      toast.success("Kayıt kalıcı silindi")
    } else {
      const j = await res.json().catch(() => ({}))
      toast.success(`${j?.deleted ?? 0} kayıt kalıcı silindi`)
    }
    await fetchAll()
  }

  function openHardDeleteWeek(tarih: string) {
    const ws = startOfWeekIso(tarih)
    const we = endOfWeekIso(tarih)
    const count = deleted.filter((r) => r.tarih >= ws && r.tarih <= we).length
    setHardDelete({ kind: "week", tarih, weekStart: ws, weekEnd: we, count })
  }

  function openHardDeleteMonth(tarih: string) {
    const yearMonth = tarih.slice(0, 7)
    const count = deleted.filter((r) => r.tarih.startsWith(yearMonth)).length
    setHardDelete({ kind: "month", tarih, yearMonth, count })
  }

  async function confirmEndDay() {
    if (!endDayPending) return
    const target = endDayPending
    setEndDayPending(null)
    const res = await fetch("/api/rezervasyonlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "endDay", tarih: target.tarih }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(typeof j?.error === "string" ? j.error : "İşlem başarısız")
      return
    }
    const j = await res.json().catch(() => ({}))
    toast.success(`${j?.processed ?? 0} kayıt geçmişe taşındı`)
    await fetchAll()
  }

  function exportToCsv() {
    if (items.length === 0) {
      toast.error("İndirilebilecek kayıt yok")
      return
    }
    const headers = [
      "Tarih", "Gün", "Saat", "Bitiş", "Kişi", "Süre (dk)",
      "Telefon", "Not", "Müşteri Notu",
      "Durum", "Ekleyen", "Oluşturma", "Silen", "Silme Tarihi",
    ]
    const sorted = [...items].sort((a, b) => {
      if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih)
      return b.saat.localeCompare(a.saat)
    })
    const rows = [
      headers,
      ...sorted.map((r) => {
        const endSaat = r.sure > 0 ? addMinutes(r.saat, r.sure + 15) : ""
        const durumLabel = r.silindi
          ? (r.durum === "geldi" ? "Geldi (geçmiş)" : r.durum === "gelmedi" ? "Gelmedi (geçmiş)" : "İptal")
          : (r.durum === "geldi" ? "Geldi" : r.durum === "gelmedi" ? "Gelmedi" : "Bekliyor")
        return [
          r.tarih, r.gun, r.saat, endSaat,
          r.kisiSayisi || "", r.sure || "",
          r.telefon, r.not, r.musteriNotu,
          durumLabel, r.ekleyenAd, r.olusturmaTarihi,
          r.silenAd, r.silmeTarihi,
        ]
      }),
    ]
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`rezervasyonlar-${today}.csv`, rows)
    toast.success(`${sorted.length} kayıt indirildi`)
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
  const phoneInfo = useMemo(
    () => computePhoneStats(items, form.telefon, editingId ?? undefined),
    [items, form.telefon, editingId]
  )

  const noshowWarning = useMemo(() => {
    if (!phoneInfo || phoneInfo.gelmedi === 0) return null
    if (phoneInfo.total === 1 && phoneInfo.gelmedi === 1) {
      return { rate: 100, text: "Geçen sefer gelmedi" }
    }
    const rate = phoneInfo.gelmedi / phoneInfo.total
    if (phoneInfo.total >= 2 && rate >= 0.5) {
      return {
        rate: Math.round(rate * 100),
        text: `%${Math.round(rate * 100)} gelmeme oranı (${phoneInfo.gelmedi}/${phoneInfo.total})`,
      }
    }
    return null
  }, [phoneInfo])

  const summary = useMemo(() => {
    const today = todayISO()
    const tomorrow = isoOffset(1, today)
    const ws = startOfWeekIso(today)
    const we = endOfWeekIso(today)
    const tally = (pred: (r: Reservation) => boolean) => {
      const filtered = active.filter(pred)
      return {
        count: filtered.length,
        kisi: filtered.reduce((s, r) => s + (r.kisiSayisi || 0), 0),
      }
    }
    return {
      today: tally((r) => r.tarih === today),
      tomorrow: tally((r) => r.tarih === tomorrow),
      week: tally((r) => r.tarih >= ws && r.tarih <= we),
    }
  }, [active])

  const dateReservations = useMemo(() => {
    if (!form.tarih) return []
    return active
      .filter((r) => r.tarih === form.tarih && (!editingId || r.id !== editingId))
      .sort((a, b) => a.saat.localeCompare(b.saat))
  }, [active, form.tarih, editingId])

  const conflicts = useMemo(() => {
    if (!form.saat) return []
    return dateReservations.filter((r) =>
      timesOverlap(form.saat, form.sure, r.saat, r.sure)
    )
  }, [dateReservations, form.saat, form.sure])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            LaserTag Rezervasyon
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Yenile
          </Button>
          <Button variant="outline" onClick={exportToCsv} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
          <Button onClick={() => (showForm && !editingId ? closeForm() : openNewForm())}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasyon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Bugün" count={summary.today.count} kisi={summary.today.kisi} accent="blue" />
        <SummaryCard label="Yarın" count={summary.tomorrow.count} kisi={summary.tomorrow.kisi} accent="purple" />
        <SummaryCard label="Bu hafta" count={summary.week.count} kisi={summary.week.kisi} accent="emerald" />
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
                {phoneInfo && phoneInfo.total > 0 && (
                  <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-2.5 py-1.5 mt-1">
                    <span className="text-base leading-none">🔁</span>
                    <div className="flex-1">
                      <p className="font-medium">
                        Bu müşteri {phoneInfo.total + 1}. defa kayıt yaptırıyor
                      </p>
                      <p className="text-amber-700">
                        {phoneInfo.geldi > 0 && <>✓ {phoneInfo.geldi} kez geldi</>}
                        {phoneInfo.geldi > 0 && (phoneInfo.gelmedi > 0 || phoneInfo.iptal > 0) && " · "}
                        {phoneInfo.gelmedi > 0 && <>✗ {phoneInfo.gelmedi} kez gelmedi</>}
                        {phoneInfo.gelmedi > 0 && phoneInfo.iptal > 0 && " · "}
                        {phoneInfo.iptal > 0 && <>🗑️ {phoneInfo.iptal} kez iptal</>}
                        {phoneInfo.geldi === 0 && phoneInfo.gelmedi === 0 && phoneInfo.iptal === 0 && (
                          <>Geçmiş kaydı var, durumu henüz işaretlenmemiş</>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {noshowWarning && (
                  <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-300 text-red-900 rounded-md px-2.5 py-1.5 mt-1.5">
                    <span className="text-base leading-none">🚨</span>
                    <p className="font-semibold flex-1">
                      Bu müşterinin {noshowWarning.text}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Not</label>
                <Input
                  value={form.not}
                  onChange={(e) => setForm((f) => ({ ...f, not: e.target.value }))}
                  placeholder="(opsiyonel)"
                />
              </div>
              {form.tarih && dateReservations.length > 0 && (
                <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">
                    📅 {formatTrDate(form.tarih)} tarihindeki diğer rezervasyonlar ({dateReservations.length}):
                  </p>
                  <ul className="space-y-1">
                    {dateReservations.map((r) => {
                      const isConflict = conflicts.some((c) => c.id === r.id)
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            "text-xs flex items-center gap-2 px-2 py-1 rounded",
                            isConflict
                              ? "bg-red-100 text-red-900 border border-red-300"
                              : "text-slate-600"
                          )}
                        >
                          {isConflict && <span>⚠️</span>}
                          <span className="font-mono font-medium">
                            {formatSaatRange(r.saat, r.sure)}
                          </span>
                          <span>·</span>
                          <span>{r.kisiSayisi} kişi</span>
                          <span>·</span>
                          <span>{formatSure(r.sure)}</span>
                          {r.telefon && (<><span>·</span><span className="opacity-75">{r.telefon}</span></>)}
                          {r.durum === "geldi" && <span className="ml-auto text-emerald-700">✓ geldi</span>}
                          {r.durum === "gelmedi" && <span className="ml-auto text-red-700">✗ gelmedi</span>}
                        </li>
                      )
                    })}
                  </ul>
                  {conflicts.length > 0 && (
                    <p className="text-xs text-red-700 font-medium mt-1.5">
                      ⚠️ Seçtiğiniz {formatSaatRange(form.saat, form.sure)} aralığı yukarıdaki kırmızı kayıt(lar) ile çakışıyor.
                    </p>
                  )}
                </div>
              )}
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
            onNoshow={(r) => setPending({ item: r, type: "noshow" })}
            onUncomplete={(id) => uncomplete(id)}
            onDelete={(r) => setPending({ item: r, type: "delete" })}
            onEndDay={(tarih, gun, count) => setEndDayPending({ tarih, gun, count })}
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
            onHardDelete={
              me?.role === "admin"
                ? (r) => setHardDelete({ kind: "single", item: r })
                : undefined
            }
            onHardDeleteDate={
              me?.role === "admin"
                ? (tarih, gun, count) =>
                    setHardDelete({ kind: "date", tarih, gun, count })
                : undefined
            }
            onHardDeleteWeek={me?.role === "admin" ? openHardDeleteWeek : undefined}
            onHardDeleteMonth={me?.role === "admin" ? openHardDeleteMonth : undefined}
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

      {endDayPending && (
        <EndDayDialog
          target={endDayPending}
          onCancel={() => setEndDayPending(null)}
          onConfirm={confirmEndDay}
        />
      )}

      {hardDelete && (
        <HardDeleteDialog
          target={hardDelete}
          onCancel={() => setHardDelete(null)}
          onConfirm={confirmHardDelete}
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

function SummaryCard({
  label,
  count,
  kisi,
  accent,
}: {
  label: string
  count: number
  kisi: number
  accent: "blue" | "purple" | "emerald"
}) {
  const accentMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", muted: "text-blue-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", muted: "text-purple-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", muted: "text-emerald-700" },
  }
  const c = accentMap[accent]
  return (
    <div className={cn("rounded-lg border px-4 py-3 flex items-center justify-between", c.bg, c.border)}>
      <div>
        <p className={cn("text-xs font-medium", c.muted)}>{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums leading-tight", c.text)}>
          {count}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("text-xs", c.muted)}>rezervasyon</p>
        <p className={cn("text-xs font-medium", c.text)}>
          <Users className="inline h-3 w-3 mr-0.5 -mt-0.5" />
          {kisi} kişi
        </p>
      </div>
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
  onNoshow,
  onUncomplete,
  onDelete,
  onRestore,
  onAddNote,
  onHardDelete,
  onHardDeleteDate,
  onHardDeleteWeek,
  onHardDeleteMonth,
  onEndDay,
}: {
  loading: boolean
  items: Reservation[]
  showAuditAdd?: boolean
  showAuditDelete?: boolean
  showCustomerNote?: boolean
  onEdit?: (r: Reservation) => void
  onComplete?: (r: Reservation) => void
  onNoshow?: (r: Reservation) => void
  onUncomplete?: (id: string) => void
  onDelete?: (r: Reservation) => void
  onRestore?: (id: string) => void
  onAddNote?: (r: Reservation) => void
  onHardDelete?: (r: Reservation) => void
  onHardDeleteDate?: (tarih: string, gun: string, count: number) => void
  onHardDeleteWeek?: (tarih: string) => void
  onHardDeleteMonth?: (tarih: string) => void
  onEndDay?: (tarih: string, gun: string, count: number) => void
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-700 font-medium">{g.items.length} kayıt</span>
              {onEndDay && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 h-7"
                  onClick={() => onEndDay(g.tarih, g.gun, g.items.length)}
                  title="Bu günün tüm aktif kayıtlarını geçmişe taşı"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Günü Bitir
                </Button>
              )}
              {onHardDeleteDate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-50 h-7"
                  onClick={() => onHardDeleteDate(g.tarih, g.gun, g.items.length)}
                  title="Bu güne ait tüm kayıtları kalıcı sil"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Günü Sil
                </Button>
              )}
              {onHardDeleteWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-50 h-7"
                  onClick={() => onHardDeleteWeek(g.tarih)}
                  title="Bu haftadaki tüm kayıtları kalıcı sil"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Haftayı Sil
                </Button>
              )}
              {onHardDeleteMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-50 h-7"
                  onClick={() => onHardDeleteMonth(g.tarih)}
                  title="Bu aydaki tüm kayıtları kalıcı sil"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Ayı Sil
                </Button>
              )}
            </div>
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
                  const isGelmedi = r.durum === "gelmedi" && !r.silindi
                  return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b last:border-0",
                      isGeldi
                        ? "bg-emerald-50 hover:bg-emerald-100"
                        : isGelmedi
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-gray-50"
                    )}
                  >
                    <td className={cn(
                      "px-4 py-2.5 font-mono whitespace-nowrap font-medium",
                      isGeldi
                        ? "text-emerald-800"
                        : isGelmedi
                          ? "text-red-800"
                          : "text-slate-800"
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
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`/musteri/${encodeURIComponent(normalizePhone(r.telefon))}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                            title="Müşteri profilini aç"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {r.telefon}
                          </a>
                        </div>
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
                          {onHardDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => onHardDelete(r)}
                              title="Kalıcı sil"
                            >
                              <Trash className="h-3.5 w-3.5 mr-1" />
                              Sil
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
                          ) : isGelmedi ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 text-white">
                              <XCircle className="h-3.5 w-3.5" />
                              Gelmedi
                            </span>
                          ) : (
                            <>
                              {onComplete && (
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
                              )}
                              {onNoshow && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-700 border-red-200 hover:bg-red-50"
                                  onClick={() => onNoshow(r)}
                                  title="Müşteri gelmedi"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Gelmedi
                                </Button>
                              )}
                            </>
                          )}
                          {(isGeldi || isGelmedi) && onUncomplete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600"
                              onClick={() => onUncomplete(r.id)}
                              title="Geri al"
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
  if (durum === "gelmedi") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" />
        Gelmedi
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

function EndDayDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: { tarih: string; gun: string; count: number }
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">Günü bitir?</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{formatTrDate(target.tarih)}</span> ({target.gun}) —{" "}
              <span className="font-medium text-slate-700">{target.count} kayıt</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-5">
          Bu günün tüm aktif kayıtları <strong>Geçmiş</strong> sekmesine taşınacak.
          Geldi/Gelmedi işaretleri korunur; durumu boş olanlar <strong>İptal</strong> olarak kaydedilir.
          Geri almak için Geçmiş&apos;ten her kaydı tek tek geri alabilirsiniz.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Vazgeç</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onConfirm}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {target.count} kaydı bitir
          </Button>
        </div>
      </div>
    </div>
  )
}

function HardDeleteDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: PendingHardDelete
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleMap: Record<PendingHardDelete["kind"], string> = {
    single: "Kaydı kalıcı silmek istiyor musunuz?",
    date: "Günü kalıcı silmek istiyor musunuz?",
    week: "Haftayı kalıcı silmek istiyor musunuz?",
    month: "Ayı kalıcı silmek istiyor musunuz?",
  }
  const isBulk = target.kind !== "single"
  const count = isBulk ? target.count : 1

  let subtitle: React.ReactNode
  if (target.kind === "single") {
    subtitle = (
      <>
        {formatTrDate(target.item.tarih)} {formatSaatRange(target.item.saat, target.item.sure)} —{" "}
        <span className="font-medium text-slate-700">
          {target.item.kisiSayisi > 0 ? `${target.item.kisiSayisi} kişi` : (target.item.telefon || target.item.not)}
        </span>
      </>
    )
  } else if (target.kind === "date") {
    subtitle = (
      <>
        <span className="font-medium text-slate-700">{formatTrDate(target.tarih)}</span> ({target.gun}) —{" "}
        <span className="font-medium text-slate-700">{target.count} kayıt</span>
      </>
    )
  } else if (target.kind === "week") {
    subtitle = (
      <>
        <span className="font-medium text-slate-700">{formatWeekLabel(target.weekStart, target.weekEnd)}</span>{" "}
        haftası —{" "}
        <span className="font-medium text-slate-700">{target.count} kayıt</span>
      </>
    )
  } else {
    subtitle = (
      <>
        <span className="font-medium text-slate-700">{formatYearMonthLabel(target.yearMonth)}</span>{" "}
        ayı —{" "}
        <span className="font-medium text-slate-700">{target.count} kayıt</span>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">{titleMap[target.kind]}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-5">
          ⚠️ Bu işlem geri alınamaz. Kayıt{isBulk ? "lar" : ""} Sheet&apos;ten tamamen silinecek.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={count === 0}>Vazgeç</Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={count === 0}
          >
            <Trash className="w-3.5 h-3.5 mr-1" />
            {isBulk ? `${count} kaydı sil` : "Kalıcı sil"}
          </Button>
        </div>
      </div>
    </div>
  )
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
  const isNoshow = pending.type === "noshow"
  const { item } = pending

  const title =
    isComplete ? "Müşteri geldi mi?" :
    isNoshow ? "Müşteri gelmedi mi?" :
    "Rezervasyonu sil?"
  const desc =
    isComplete ? "Kayıt 'Geldi' olarak işaretlenip yeşil renkte kalacak." :
    isNoshow ? "Kayıt 'Gelmedi' olarak işaretlenip kırmızı renkte kalacak." :
    "Kayıt 'İptal' olarak işaretlenip Geçmiş sekmesine taşınacak."

  const accentBg = isComplete ? "bg-emerald-100" : "bg-red-100"
  const accentIcon = isComplete ? "text-emerald-600" : "text-red-600"
  const accentBtn = isComplete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", accentBg)}>
            {isComplete ? (
              <CheckCircle2 className={cn("w-5 h-5", accentIcon)} />
            ) : isNoshow ? (
              <XCircle className={cn("w-5 h-5", accentIcon)} />
            ) : (
              <AlertTriangle className={cn("w-5 h-5", accentIcon)} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
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
        <p className="text-xs text-slate-500 mb-5">{desc}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Vazgeç</Button>
          <Button size="sm" className={accentBtn} onClick={onConfirm}>
            {isComplete ? (<><Check className="w-3.5 h-3.5 mr-1" />Geldi</>) :
             isNoshow ? (<><XCircle className="w-3.5 h-3.5 mr-1" />Gelmedi</>) :
             (<><Trash2 className="w-3.5 h-3.5 mr-1" />Sil</>)}
          </Button>
        </div>
      </div>
    </div>
  )
}
