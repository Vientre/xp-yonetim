import type { DailyBalance, DayEntry } from "./types"

export const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
export const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function expenseTotalByMethod(entry: DayEntry | undefined, method: "nakit" | "banka"): number {
  if (!entry) return 0
  return entry.expenses
    .filter((expense) => (expense.paymentMethod ?? "nakit") === method)
    .reduce((sum, expense) => sum + (expense.amount || 0), 0)
}

export function formatDateShort(iso: string): string {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  return `${day}.${month}.${year}`
}

export function computeDailyBalances({
  entries,
  startBalance,
  startDate,
  year,
  month,
  daysCount,
  getInflow,
  getOutflow,
}: {
  entries: DayEntry[]
  startBalance: number
  startDate: string
  year: number
  month: number
  daysCount: number
  getInflow: (entry: DayEntry) => number
  getOutflow: (entry: DayEntry) => number
}): DailyBalance[] {
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry]))
  let balance = startBalance

  if (startDate) {
    entries
      .filter((entry) => entry.date >= startDate && entry.date < isoDate(year, month, 1))
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((entry) => { balance += getInflow(entry) - getOutflow(entry) })
  }

  return Array.from({ length: daysCount }, (_, index) => {
    const date = isoDate(year, month, index + 1)
    const isBeforeStart = Boolean(startDate && date < startDate)
    if (isBeforeStart) {
      return { date, isBeforeStart: true, startBalance: 0, inflow: 0, outflow: 0, endBalance: 0 }
    }
    const start = balance
    const entry = entryByDate.get(date)
    const inflow = entry ? getInflow(entry) : 0
    const outflow = entry ? getOutflow(entry) : 0
    balance += inflow - outflow
    return { date, isBeforeStart, startBalance: start, inflow, outflow, endBalance: balance }
  })
}

export function sumBalances(daily: DailyBalance[]) {
  return daily.reduce(
    (totals, day) => ({ inflow: totals.inflow + day.inflow, outflow: totals.outflow + day.outflow }),
    { inflow: 0, outflow: 0 }
  )
}
