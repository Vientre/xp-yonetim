import type { CourseMonth } from "./types"

export const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

export function formatCourseDate(iso: string) {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  return `${day}.${month}.${year}`
}

export function todayISO() {
  return new Date().toISOString().split("T")[0]
}

export function getMonthRange(startYear: number, startMonth: number, count: number): CourseMonth[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startYear, startMonth + index, 1)
    const year = date.getFullYear()
    const month = date.getMonth()
    return {
      year,
      month,
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${TR_MONTHS[month]} ${year}`,
    }
  })
}
