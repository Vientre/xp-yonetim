export interface Employee {
  id: string
  name: string
  businessId: string
}

export interface AttendanceEntry {
  id: string
  date: string
  employeeName: string
  businessId: string
  business: { name: string }
  hoursWorked: number
  mealAmount: number
  tipAmount: number
  deductionAmount: number
  mesai: number
  notes: string
}

export interface EntryRow {
  employeeId: string
  employeeName: string
  hoursWorked: number
  mealEnabled: boolean
  mealAmount: number
  tipEnabled: boolean
  tipAmount: number
  deductionEnabled: boolean
  deductionAmount: number
  mesaiEnabled: boolean
  mesai: number
  notes: string
}

export interface EmployeeAttendanceTotal {
  hours: number
  meal: number
  tip: number
  deduction: number
  mesai: number
}
