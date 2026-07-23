import type {
  PhoneStats,
  Reservation,
  ReservationDuration,
  ReservationFormState,
} from "./types"

export const DURATION_OPTIONS: { value: ReservationDuration; label: string }[] = [
  { value: 30, label: "30 dk (yarım saat)" },
  { value: 45, label: "45 dk" },
  { value: 60, label: "60 dk (1 saat)" },
]

const TR_MONTHS_LONG = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

export function todayISO() {
  return new Date().toISOString().split("T")[0]
}

export function isoOffset(days: number, base?: string): string {
  const date = new Date((base ?? todayISO()) + "T00:00:00Z")
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function reservationMinutes(time: string): number {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return -1
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export function timesOverlap(timeA: string, durationA: number, timeB: string, durationB: number): boolean {
  const startA = reservationMinutes(timeA)
  const startB = reservationMinutes(timeB)
  if (startA < 0 || startB < 0) return false
  return startA < startB + (durationB || 0) + 15 && startB < startA + (durationA || 0) + 15
}

export function formatTrDate(iso: string) {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  return `${day}.${month}.${year}`
}

export function formatDateTime(iso: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function addMinutes(time: string, minutes: number): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return ""
  const [hours, currentMinutes] = time.split(":").map(Number)
  const total = hours * 60 + currentMinutes + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(((total % 60) + 60) % 60).padStart(2, "0")}`
}

export function formatTimeRange(time: string, duration: number): string {
  if (!time || !duration || duration <= 0) return time
  const end = addMinutes(time, duration + 15)
  return end ? `${time}-${end}` : time
}

export function formatDuration(minutes: number): string {
  if (minutes === 30) return "yarım saat"
  if (minutes === 60) return "1 saat"
  return minutes > 0 ? `${minutes} dk` : ""
}

export function startOfWeekIso(iso: string): string {
  const date = new Date(iso + "T00:00:00Z")
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1))
  return date.toISOString().slice(0, 10)
}

export function endOfWeekIso(iso: string): string {
  const date = new Date(startOfWeekIso(iso) + "T00:00:00Z")
  date.setUTCDate(date.getUTCDate() + 6)
  return date.toISOString().slice(0, 10)
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number)
  return year && month ? `${TR_MONTHS_LONG[month - 1]} ${year}` : yearMonth
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const [, startMonth, startDay] = weekStart.split("-").map(Number)
  const [, endMonth, endDay] = weekEnd.split("-").map(Number)
  if (startMonth === endMonth) return `${startDay}-${endDay} ${TR_MONTHS_LONG[startMonth - 1]}`
  return `${startDay} ${TR_MONTHS_LONG[startMonth - 1]} - ${endDay} ${TR_MONTHS_LONG[endMonth - 1]}`
}

export function normalizePhone(value: string): string {
  return (value ?? "").replace(/\D/g, "").slice(-10)
}

export function computePhoneStats(items: Reservation[], phone: string, excludeId?: string): PhoneStats | null {
  const normalized = normalizePhone(phone)
  if (normalized.length < 7) return null
  const matches = items.filter((item) => item.id !== excludeId && normalizePhone(item.telefon) === normalized)
  return {
    total: matches.length,
    geldi: matches.filter((item) => item.durum === "geldi").length,
    gelmedi: matches.filter((item) => item.durum === "gelmedi").length,
    iptal: matches.filter((item) => item.durum === "iptal").length,
  }
}

export function groupByDate(items: Reservation[]) {
  return items.reduce<{ tarih: string; gun: string; items: Reservation[] }[]>((groups, item) => {
    const last = groups.at(-1)
    if (last?.tarih === item.tarih) last.items.push(item)
    else groups.push({ tarih: item.tarih, gun: item.gun, items: [item] })
    return groups
  }, [])
}

export function createEmptyForm(): ReservationFormState {
  return { tarih: todayISO(), saat: "", kisiSayisi: "", sure: 30, telefon: "", not: "" }
}
