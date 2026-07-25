import type { AttendanceEntry, EmployeeAttendanceTotal, EntryRow } from "./types"

export function createEmptyRow(): EntryRow {
  return {
    employeeId: "",
    employeeName: "",
    hoursWorked: 8,
    mealEnabled: false,
    mealAmount: 0,
    tipEnabled: false,
    tipAmount: 0,
    deductionEnabled: false,
    deductionAmount: 0,
    mesaiEnabled: false,
    mesai: 0,
    repairEnabled: false,
    repairAmount: 0,
    notes: "",
  }
}

export function calculateEmployeeTotals(entries: AttendanceEntry[]): Record<string, EmployeeAttendanceTotal> {
  return entries.reduce<Record<string, EmployeeAttendanceTotal>>((totals, entry) => {
    const current = totals[entry.employeeName] ?? { hours: 0, meal: 0, tip: 0, deduction: 0, mesai: 0, repair: 0 }
    current.hours += entry.hoursWorked
    current.meal += entry.mealAmount
    current.tip += entry.tipAmount
    current.deduction += entry.deductionAmount
    current.mesai += entry.mesai
    current.repair += entry.repairAmount
    totals[entry.employeeName] = current
    return totals
  }, {})
}
