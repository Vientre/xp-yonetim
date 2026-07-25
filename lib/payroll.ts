export type PaymentStatus = "bekliyor" | "kismi" | "odendi"

export type PayCalculation = {
  basePay: number
  overtimePay: number
  netPay: number
  paidAmount: number
  remainingAmount: number
  status: PaymentStatus
}

export function addIsoDays(isoDate: string, amount: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function isMondayIso(isoDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    && new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 1
}

export function isCompletedPayrollWeek(weekStart: string, today: string): boolean {
  return isMondayIso(weekStart) && addIsoDays(weekStart, 6) < today
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculatePay(input: {
  hours: number
  overtimeHours: number
  hourlyRate: number
  overtimeMultiplier: number
  meal: number
  tip: number
  deduction: number
  paidAmount: number
}): PayCalculation {
  const basePay = roundMoney(input.hours * input.hourlyRate)
  const overtimePay = roundMoney(
    input.overtimeHours * input.hourlyRate * input.overtimeMultiplier
  )
  const netPay = roundMoney(
    basePay + overtimePay + input.meal + input.tip - input.deduction
  )
  const paidAmount = roundMoney(Math.max(0, input.paidAmount))
  const remainingAmount = roundMoney(Math.max(0, netPay - paidAmount))
  const status: PaymentStatus =
    paidAmount <= 0 ? "bekliyor" : remainingAmount > 0 ? "kismi" : "odendi"

  return { basePay, overtimePay, netPay, paidAmount, remainingAmount, status }
}
