import assert from "node:assert/strict"
import test from "node:test"
import { calculateEmployeeTotals, createEmptyRow } from "../components/attendance/utils"
import type { AttendanceEntry } from "../components/attendance/types"

function entry(employeeName: string, hours: number, tip: number): AttendanceEntry {
  return {
    id: `${employeeName}-${hours}`,
    date: "2026-07-24",
    employeeName,
    businessId: "business",
    business: { name: "İşletme" },
    hoursWorked: hours,
    mealAmount: 100,
    tipAmount: tip,
    deductionAmount: 25,
    mesai: 1,
    notes: "",
  }
}

test("personel puantaj toplamları çalışan bazında birleştirilir", () => {
  const totals = calculateEmployeeTotals([
    entry("Ayşe", 8, 50),
    entry("Ayşe", 6, 25),
    entry("Mehmet", 4, 0),
  ])

  assert.deepEqual(totals.Ayşe, {
    hours: 14,
    meal: 200,
    tip: 75,
    deduction: 50,
    mesai: 2,
  })
  assert.equal(totals.Mehmet.hours, 4)
})

test("yeni puantaj satırı güvenli varsayılanlarla oluşturulur", () => {
  const row = createEmptyRow()
  assert.equal(row.hoursWorked, 8)
  assert.equal(row.mealEnabled, false)
  assert.equal(row.tipAmount, 0)
  assert.equal(row.employeeName, "")
})
