"use client"

import { useState, type ReactNode } from "react"
import { AlertTriangle, CalendarClock, Check, CheckCircle2, ShieldAlert, StickyNote, Trash, Trash2, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PendingHardDelete, PendingReservationAction, Reservation } from "./types"
import { formatTimeRange, formatTrDate, formatWeekLabel, formatYearMonthLabel } from "./utils"

export function EndDayDialog({ target, onCancel, onConfirm }: {
  target: { tarih: string; gun: string; count: number }
  onCancel: () => void
  onConfirm: () => void
}) {
  return <DialogShell icon={<CalendarClock className="h-5 w-5 text-blue-600" />} iconClass="bg-blue-100" title="Günü bitir?" subtitle={<>{formatTrDate(target.tarih)} ({target.gun}) — <strong>{target.count} kayıt</strong></>} onCancel={onCancel}>
    <p className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      Bu günün tüm aktif kayıtları <strong>Geçmiş</strong> sekmesine taşınacak. Geldi/Gelmedi işaretleri korunur; durumu boş olanlar <strong>İptal</strong> olarak kaydedilir.
    </p>
    <DialogActions onCancel={onCancel}>
      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onConfirm}><Check className="mr-1 h-3.5 w-3.5" />{target.count} kaydı bitir</Button>
    </DialogActions>
  </DialogShell>
}

export function HardDeleteDialog({ target, onCancel, onConfirm }: {
  target: PendingHardDelete
  onCancel: () => void
  onConfirm: () => void
}) {
  const titles = {
    single: "Kaydı kalıcı silmek istiyor musunuz?",
    date: "Günü kalıcı silmek istiyor musunuz?",
    week: "Haftayı kalıcı silmek istiyor musunuz?",
    month: "Ayı kalıcı silmek istiyor musunuz?",
  }
  const count = target.kind === "single" ? 1 : target.count
  let subtitle: ReactNode
  if (target.kind === "single") subtitle = <>{formatTrDate(target.item.tarih)} {formatTimeRange(target.item.saat, target.item.sure)} — <strong>{target.item.kisiSayisi > 0 ? `${target.item.kisiSayisi} kişi` : target.item.telefon || target.item.not}</strong></>
  else if (target.kind === "date") subtitle = <>{formatTrDate(target.tarih)} ({target.gun}) — <strong>{target.count} kayıt</strong></>
  else if (target.kind === "week") subtitle = <><strong>{formatWeekLabel(target.weekStart, target.weekEnd)}</strong> haftası — <strong>{target.count} kayıt</strong></>
  else subtitle = <><strong>{formatYearMonthLabel(target.yearMonth)}</strong> ayı — <strong>{target.count} kayıt</strong></>

  return <DialogShell icon={<ShieldAlert className="h-5 w-5 text-red-600" />} iconClass="bg-red-100" title={titles[target.kind]} subtitle={subtitle} onCancel={onCancel}>
    <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ Bu işlem geri alınamaz. Kayıt{target.kind === "single" ? "" : "lar"} Sheet&apos;ten tamamen silinecek.</p>
    <DialogActions onCancel={onCancel}>
      <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={onConfirm} disabled={count === 0}><Trash className="mr-1 h-3.5 w-3.5" />{target.kind === "single" ? "Kalıcı sil" : `${count} kaydı sil`}</Button>
    </DialogActions>
  </DialogShell>
}

export function NoteDialog({ item, onCancel, onSave }: {
  item: Reservation
  onCancel: () => void
  onSave: (text: string) => void | Promise<void>
}) {
  const [text, setText] = useState(item.musteriNotu)
  const [saving, setSaving] = useState(false)
  return <DialogShell icon={<StickyNote className="h-5 w-5 text-amber-600" />} iconClass="bg-amber-100" title="Müşteri Notu" subtitle={<>{formatTrDate(item.tarih)} {formatTimeRange(item.saat, item.sure)} — <strong>{item.telefon || item.not}</strong></>} onCancel={onCancel}>
    <textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="Bu müşteri ile ilgili not ekleyin" rows={4} maxLength={500} className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
    <p className="mb-4 mt-1 text-xs text-muted-foreground">{text.length}/500</p>
    <DialogActions onCancel={onCancel} disabled={saving}>
      <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={saving} onClick={async () => { setSaving(true); await onSave(text); setSaving(false) }}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
    </DialogActions>
  </DialogShell>
}

export function ConfirmDialog({ pending, onCancel, onConfirm }: {
  pending: PendingReservationAction
  onCancel: () => void
  onConfirm: () => void
}) {
  const complete = pending.type === "complete"
  const noshow = pending.type === "noshow"
  const title = complete ? "Müşteri geldi mi?" : noshow ? "Müşteri gelmedi mi?" : "Rezervasyonu sil?"
  const description = complete ? "Kayıt 'Geldi' olarak işaretlenip yeşil renkte kalacak." : noshow ? "Kayıt 'Gelmedi' olarak işaretlenip kırmızı renkte kalacak." : "Kayıt 'İptal' olarak işaretlenip Geçmiş sekmesine taşınacak."
  const icon = complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : noshow ? <XCircle className="h-5 w-5 text-red-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />
  return <DialogShell icon={icon} iconClass={complete ? "bg-emerald-100" : "bg-red-100"} title={title} subtitle={<>{formatTrDate(pending.item.tarih)} {formatTimeRange(pending.item.saat, pending.item.sure)} — <strong>{pending.item.kisiSayisi > 0 ? `${pending.item.kisiSayisi} kişi` : pending.item.not || pending.item.telefon}</strong></>} onCancel={onCancel}>
    <p className="mb-5 text-xs text-slate-500">{description}</p>
    <DialogActions onCancel={onCancel}>
      <Button size="sm" className={complete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={onConfirm}>
        {complete ? <><Check className="mr-1 h-3.5 w-3.5" />Geldi</> : noshow ? <><XCircle className="mr-1 h-3.5 w-3.5" />Gelmedi</> : <><Trash2 className="mr-1 h-3.5 w-3.5" />Sil</>}
      </Button>
    </DialogActions>
  </DialogShell>
}

function DialogShell({ icon, iconClass, title, subtitle, onCancel, children }: {
  icon: ReactNode
  iconClass: string
  title: string
  subtitle: ReactNode
  onCancel: () => void
  children: ReactNode
}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-start gap-3">
        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", iconClass)}>{icon}</div>
        <div className="flex-1"><h3 className="text-base font-semibold text-slate-900">{title}</h3><p className="mt-0.5 text-sm text-slate-500">{subtitle}</p></div>
        <button type="button" onClick={onCancel} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  </div>
}

function DialogActions({ onCancel, disabled = false, children }: { onCancel: () => void; disabled?: boolean; children: ReactNode }) {
  return <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={onCancel} disabled={disabled}>Vazgeç</Button>{children}</div>
}
