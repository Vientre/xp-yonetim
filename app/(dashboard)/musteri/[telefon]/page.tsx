"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, Phone, CalendarClock, Users, CheckCircle2, XCircle, Trash2,
  AlertCircle, StickyNote, Plus, Star, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Durum = "" | "geldi" | "gelmedi" | "iptal"

type Reservation = {
  id: string
  tarih: string
  gun: string
  saat: string
  not: string
  telefon: string
  kisiSayisi: number
  sure: number
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenAd: string
  silmeTarihi: string
  durum: Durum
  musteriNotu: string
}

type Profile = {
  telefon: string
  phoneVariations: string[]
  stats: {
    total: number
    geldi: number
    gelmedi: number
    iptal: number
    bekleyen: number
    geldiOrani: number | null
    gelmeOrani: number | null
    totalKisi: number
    firstDate: string
    lastDate: string
  }
  notes: Array<{ tarih: string; olusturmaTarihi: string; not: string }>
  usedNotes: string[]
  reservations: Reservation[]
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

function formatSaatRange(saat: string, sure: number) {
  if (!saat) return ""
  if (!sure || sure <= 0) return saat
  const end = addMinutes(saat, sure + 15)
  return end ? `${saat}-${end}` : saat
}

function formatSure(min: number) {
  if (min === 30) return "yarım saat"
  if (min === 60) return "1 saat"
  if (min > 0) return `${min} dk`
  return ""
}

function formatPhoneNice(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "")
  if (digits.length === 10) {
    // 5XX XXX XX XX
    return `0${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,8)} ${digits.slice(8,10)}`
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0,4)} ${digits.slice(4,7)} ${digits.slice(7,9)} ${digits.slice(9,11)}`
  }
  return raw
}

// Müşteri tipi/segmenti
function getCustomerTag(stats: Profile["stats"]) {
  if (stats.total >= 10 && (stats.geldiOrani ?? 0) >= 80) {
    return { label: "VIP Müşteri", color: "purple", icon: Star }
  }
  if (stats.gelmeOrani !== null && stats.gelmeOrani >= 50) {
    return { label: "Riskli Müşteri", color: "red", icon: AlertTriangle }
  }
  if (stats.total >= 5) {
    return { label: "Düzenli Müşteri", color: "blue", icon: CheckCircle2 }
  }
  return null
}

export default function MusteriProfilPage({ params }: { params: Promise<{ telefon: string }> }) {
  const { telefon } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/musteri/${encodeURIComponent(telefon)}`)
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error ?? "Veri alınamadı")
        }
        const data: Profile = await r.json()
        if (!cancelled) setProfile(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [telefon])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-3" />
          <p className="text-base font-medium text-slate-900">{error ?? "Müşteri bulunamadı"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>
        </CardContent>
      </Card>
    )
  }

  const niceTelefon = profile.phoneVariations[0] ?? formatPhoneNice(profile.telefon)
  const waPhone = profile.telefon.length === 10 ? "90" + profile.telefon : profile.telefon
  const tag = getCustomerTag(profile.stats)
  const TagIcon = tag?.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Phone className="h-6 w-6 text-blue-600" />
              {niceTelefon}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {tag && TagIcon && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  tag.color === "purple" && "bg-purple-100 text-purple-700",
                  tag.color === "red" && "bg-red-100 text-red-700",
                  tag.color === "blue" && "bg-blue-100 text-blue-700",
                )}>
                  <TagIcon className="h-3 w-3" />
                  {tag.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                İlk rezervasyon: {formatTrDate(profile.stats.firstDate)} · Son: {formatTrDate(profile.stats.lastDate)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          <Link
            href={`/rezervasyonlar?telefon=${encodeURIComponent(profile.telefon)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni Rezervasyon
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Toplam Rezervasyon" value={profile.stats.total} sub={`${profile.stats.totalKisi} kişi`} color="blue" />
        <StatCard
          label="Geldi"
          value={profile.stats.geldi}
          sub={profile.stats.geldiOrani !== null ? `%${profile.stats.geldiOrani}` : "—"}
          color="emerald"
          icon={CheckCircle2}
        />
        <StatCard
          label="Gelmedi"
          value={profile.stats.gelmedi}
          sub={profile.stats.gelmeOrani !== null ? `%${profile.stats.gelmeOrani}` : "—"}
          color="red"
          icon={XCircle}
        />
        <StatCard label="İptal" value={profile.stats.iptal} sub={`${profile.stats.bekleyen} bekleyen`} color="amber" icon={Trash2} />
      </div>

      {/* Risk uyarısı */}
      {profile.stats.gelmeOrani !== null && profile.stats.gelmeOrani >= 50 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-900">
            <strong>Dikkat:</strong> Bu müşterinin gelmeme oranı %{profile.stats.gelmeOrani}.
            Yeni rezervasyon alırken teyit araması yapmanız önerilir.
          </p>
        </div>
      )}

      {/* Müşteri Notları */}
      {profile.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-600" />
              Müşteri Notları ({profile.notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {profile.notes.map((n, i) => (
                <li key={i} className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
                  <p className="text-slate-700">{n.not}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {formatTrDate(n.tarih)} tarihli rezervasyon · eklendi: {formatDateTime(n.olusturmaTarihi)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Geçmiş Rezervasyonlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            Rezervasyon Geçmişi ({profile.reservations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tarih</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Saat</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Kişi · Süre</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Durum</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Not</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ekleyen</th>
                </tr>
              </thead>
              <tbody>
                {profile.reservations.map((r) => {
                  const isGeldi = r.durum === "geldi"
                  const isGelmedi = r.durum === "gelmedi"
                  return (
                    <tr key={r.id} className={cn(
                      "border-b last:border-0",
                      isGeldi && "bg-emerald-50/50",
                      isGelmedi && "bg-red-50/50",
                    )}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{formatTrDate(r.tarih)}</p>
                        <p className="text-xs text-muted-foreground">{r.gun}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-800">
                        {formatSaatRange(r.saat, r.sure)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {r.kisiSayisi > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {r.kisiSayisi} kişi · {formatSure(r.sure)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <DurumBadge durum={r.durum} silindi={r.silindi} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 max-w-xs truncate">
                        {r.not || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        <p>{r.ekleyenAd || "-"}</p>
                        <p className="text-muted-foreground">{formatDateTime(r.olusturmaTarihi)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string
  value: number
  sub?: string
  color: "blue" | "emerald" | "red" | "amber"
  icon?: typeof CheckCircle2
}) {
  const c = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", muted: "text-blue-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", muted: "text-emerald-700" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", muted: "text-red-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", muted: "text-amber-700" },
  }[color]
  return (
    <div className={cn("rounded-lg border px-4 py-3", c.bg, c.border)}>
      <div className="flex items-center justify-between mb-1">
        <p className={cn("text-xs font-medium", c.muted)}>{label}</p>
        {Icon && <Icon className={cn("h-3.5 w-3.5", c.muted)} />}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", c.text)}>{value}</p>
      {sub && <p className={cn("text-xs mt-0.5", c.muted)}>{sub}</p>}
    </div>
  )
}

function DurumBadge({ durum, silindi }: { durum: Durum; silindi: boolean }) {
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
  if (durum === "iptal" || silindi) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
        <Trash2 className="h-3 w-3" />
        İptal
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
      Bekliyor
    </span>
  )
}
