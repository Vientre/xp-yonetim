"use client"

import type { FormEventHandler } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { PhoneStats, Reservation, ReservationDuration, ReservationFormState } from "./types"
import { DURATION_OPTIONS, formatDuration, formatTimeRange, formatTrDate } from "./utils"

interface ReservationFormProps {
  editing: boolean
  form: ReservationFormState
  submitting: boolean
  phoneInfo: PhoneStats | null
  noshowWarning: { rate: number; text: string } | null
  dateReservations: Reservation[]
  conflicts: Reservation[]
  onChange: (form: ReservationFormState) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

export function ReservationForm({
  editing,
  form,
  submitting,
  phoneInfo,
  noshowWarning,
  dateReservations,
  conflicts,
  onChange,
  onSubmit,
  onCancel,
}: ReservationFormProps) {
  const update = <K extends keyof ReservationFormState>(key: K, value: ReservationFormState[K]) => {
    onChange({ ...form, [key]: value })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{editing ? "Rezervasyonu Düzenle" : "Yeni Rezervasyon"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Tarih *"><Input type="date" value={form.tarih} onChange={(event) => update("tarih", event.target.value)} required /></FormField>
          <FormField label="Saat *"><Input type="time" value={form.saat} onChange={(event) => update("saat", event.target.value)} required /></FormField>
          <FormField label="Kişi sayısı *"><Input type="number" min={1} value={form.kisiSayisi} onChange={(event) => update("kisiSayisi", event.target.value)} placeholder="örn. 4" required /></FormField>
          <FormField label="Süre *">
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.sure} onChange={(event) => update("sure", Number(event.target.value) as ReservationDuration)}>
              {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FormField>
          <FormField label="Telefon *">
            <Input value={form.telefon} onChange={(event) => update("telefon", event.target.value)} placeholder="05xx ..." required />
            {phoneInfo && phoneInfo.total > 0 && <CustomerHistory info={phoneInfo} />}
            {noshowWarning && (
              <div className="mt-1.5 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-900">
                <span className="text-base leading-none">🚨</span><p className="flex-1 font-semibold">Bu müşterinin {noshowWarning.text}</p>
              </div>
            )}
          </FormField>
          <FormField label="Not"><Input value={form.not} onChange={(event) => update("not", event.target.value)} placeholder="(opsiyonel)" /></FormField>

          {form.tarih && dateReservations.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-slate-700">📅 {formatTrDate(form.tarih)} tarihindeki diğer rezervasyonlar ({dateReservations.length}):</p>
              <ul className="space-y-1">
                {dateReservations.map((reservation) => {
                  const conflict = conflicts.some((item) => item.id === reservation.id)
                  return (
                    <li key={reservation.id} className={cn("flex items-center gap-2 rounded px-2 py-1 text-xs", conflict ? "border border-red-300 bg-red-100 text-red-900" : "text-slate-600")}>
                      {conflict && <span>⚠️</span>}
                      <span className="font-mono font-medium">{formatTimeRange(reservation.saat, reservation.sure)}</span>
                      <span>·</span><span>{reservation.kisiSayisi} kişi</span><span>·</span><span>{formatDuration(reservation.sure)}</span>
                      {reservation.telefon && <><span>·</span><span className="opacity-75">{reservation.telefon}</span></>}
                      {reservation.durum === "geldi" && <span className="ml-auto text-emerald-700">✓ geldi</span>}
                      {reservation.durum === "gelmedi" && <span className="ml-auto text-red-700">✗ gelmedi</span>}
                    </li>
                  )
                })}
              </ul>
              {conflicts.length > 0 && <p className="mt-1.5 text-xs font-medium text-red-700">⚠️ Seçtiğiniz {formatTimeRange(form.saat, form.sure)} aralığı yukarıdaki kırmızı kayıt(lar) ile çakışıyor.</p>}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 sm:col-span-2 lg:col-span-3">
            <p className="text-xs text-muted-foreground">
              {form.saat && Number.isFinite(Number.parseInt(form.kisiSayisi, 10))
                ? <>Önizleme: <span className="font-mono font-medium text-slate-700">{formatTimeRange(form.saat, form.sure)}</span> {form.kisiSayisi || "?"} kişi · {formatDuration(form.sure)}</>
                : "* zorunlu alanlar"}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>İptal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs text-muted-foreground">{label}</label>{children}</div>
}

function CustomerHistory({ info }: { info: PhoneStats }) {
  return (
    <div className="mt-1 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
      <span className="text-base leading-none">🔁</span>
      <div className="flex-1">
        <p className="font-medium">Bu müşteri {info.total + 1}. defa kayıt yaptırıyor</p>
        <p className="text-amber-700">
          {info.geldi > 0 && <>✓ {info.geldi} kez geldi</>}
          {info.geldi > 0 && (info.gelmedi > 0 || info.iptal > 0) && " · "}
          {info.gelmedi > 0 && <>✗ {info.gelmedi} kez gelmedi</>}
          {info.gelmedi > 0 && info.iptal > 0 && " · "}
          {info.iptal > 0 && <>🗑️ {info.iptal} kez iptal</>}
          {info.geldi === 0 && info.gelmedi === 0 && info.iptal === 0 && <>Geçmiş kaydı var, durumu henüz işaretlenmemiş</>}
        </p>
      </div>
    </div>
  )
}
