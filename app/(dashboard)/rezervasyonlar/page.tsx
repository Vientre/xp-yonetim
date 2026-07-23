"use client"

import { useEffect, useState, useMemo } from "react"
import {
  CalendarClock, Plus, RefreshCw, Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"
import type {
  CurrentUser as Me,
  PendingHardDelete,
  PendingReservationAction as PendingAction,
  Reservation,
  ReservationDuration,
  ReservationFormState as FormState,
} from "@/components/reservations/types"
import {
  addMinutes,
  computePhoneStats,
  createEmptyForm,
  endOfWeekIso,
  isoOffset,
  startOfWeekIso,
  timesOverlap,
  todayISO,
} from "@/components/reservations/utils"
import {
  ConfirmDialog,
  EndDayDialog,
  HardDeleteDialog,
  NoteDialog,
} from "@/components/reservations/dialogs"
import {
  ReservationGroups,
  SummaryCard,
} from "@/components/reservations/reservation-groups"
import { ReservationForm } from "@/components/reservations/reservation-form"

const emptyForm = createEmptyForm

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
      sure: (r.sure === 45 || r.sure === 60 ? r.sure : 30) as ReservationDuration,
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
        <ReservationForm
          editing={Boolean(editingId)}
          form={form}
          submitting={submitting}
          phoneInfo={phoneInfo}
          noshowWarning={noshowWarning}
          dateReservations={dateReservations}
          conflicts={conflicts}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
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
