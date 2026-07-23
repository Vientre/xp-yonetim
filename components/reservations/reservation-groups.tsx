"use client"

import { CalendarClock, Check, CheckCircle2, Clock, Pencil, Phone, RotateCcw, StickyNote, Trash, Trash2, Users, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Reservation, ReservationStatus as Durum } from "./types"
import { formatDateTime, formatDuration as formatSure, formatTimeRange as formatSaatRange, formatTrDate, groupByDate, normalizePhone } from "./utils"

export function SummaryCard({
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

export function ReservationGroups({
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
