import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Para formatlama
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0)
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Sayı formatlama (para birimi olmadan)
export function formatNumber(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0)
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Tarih formatlama
export function formatDate(date: Date | string | null | undefined, fmt = "dd.MM.yyyy"): string {
  if (!date) return "-"
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, fmt, { locale: tr })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "dd.MM.yyyy HH:mm", { locale: tr })
}

// Bugünün tarihi (sadece tarih, saat yok)
export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Tarih aralığı hesapla
export function getDateRange(period: "today" | "week" | "month" | "year"): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  let from = new Date(now)
  from.setHours(0, 0, 0, 0)

  switch (period) {
    case "today":
      break
    case "week":
      from.setDate(now.getDate() - 6)
      break
    case "month":
      from.setDate(1)
      break
    case "year":
      from.setMonth(0, 1)
      break
  }

  return { from, to }
}

// Decimal'i number'a çevir (Prisma Decimal tipi için)
export function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0
  return typeof val === "object" ? parseFloat(val.toString()) : Number(val)
}

// Slug oluştur
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Rol Türkçe adı
export function getRoleName(role: string): string {
  const roles: Record<string, string> = {
    ADMIN: "Yönetici",
    MANAGER: "Müdür",
    STAFF: "Personel",
  }
  return roles[role] ?? role
}

// Maaş tipi Türkçe adı
export function getSalaryTypeName(type: string): string {
  const types: Record<string, string> = {
    MONTHLY: "Aylık Maaş",
    HOURLY: "Saatlik Ücret",
    DAILY: "Günlük Ücret",
  }
  return types[type] ?? type
}

// Vardiya tipi Türkçe adı
export function getShiftTypeName(type: string): string {
  const types: Record<string, string> = {
    NORMAL: "Normal Mesai",
    HALF_DAY: "Yarım Gün",
    FULL_DAY: "Tam Gün",
    CUSTOM: "Özel",
  }
  return types[type] ?? type
}

// Log aksiyon Türkçe adı
export function getLogActionName(action: string): string {
  const actions: Record<string, string> = {
    LOGIN: "Giriş",
    LOGOUT: "Çıkış",
    CREATE: "Oluşturdu",
    UPDATE: "Güncelledi",
    DELETE: "Sildi",
    RESTORE: "Geri Yükledi",
    EXPORT: "Export Aldı",
    APPROVE: "Onayladı",
    REJECT: "Reddetti",
  }
  return actions[action] ?? action
}

// Büyük sayı kısalt (1500 -> 1.5K)
export function abbreviateNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M"
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K"
  return num.toFixed(0)
}

// Yüzde hesapla
export function calcPercent(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}
