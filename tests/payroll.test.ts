import test from "node:test"
import assert from "node:assert/strict"
import {
  addIsoDays,
  calculatePay,
  isCompletedPayrollWeek,
  isMondayIso,
  roundMoney,
} from "@/lib/payroll"

test("hafta Pazartesi-Pazar ve ödeme tarihi sonraki Pazartesidir", () => {
  assert.equal(isMondayIso("2026-07-20"), true)
  assert.equal(isMondayIso("2026-07-21"), false)
  assert.equal(addIsoDays("2026-07-20", 6), "2026-07-26")
  assert.equal(addIsoDays("2026-07-26", 1), "2026-07-27")
})

test("ay ve yıl sınırlarında tarih hesabı bozulmaz", () => {
  assert.equal(addIsoDays("2026-12-28", 6), "2027-01-03")
  assert.equal(addIsoDays("2027-01-03", 1), "2027-01-04")
})

test("normal ücret, mesai, tip ve kesinti doğru hesaplanır", () => {
  const result = calculatePay({
    hours: 40,
    overtimeHours: 3,
    hourlyRate: 125,
    overtimeMultiplier: 2,
    tip: 250,
    deduction: 100,
    paidAmount: 0,
  })

  assert.deepEqual(result, {
    basePay: 5000,
    overtimePay: 750,
    netPay: 5900,
    paidAmount: 0,
    remainingAmount: 5900,
    status: "bekliyor",
  })
})

test("kısmi ve tam ödeme durumları doğru belirlenir", () => {
  const input = {
    hours: 10,
    overtimeHours: 0,
    hourlyRate: 100,
    overtimeMultiplier: 2,
    tip: 0,
    deduction: 0,
  }

  assert.equal(calculatePay({ ...input, paidAmount: 400 }).status, "kismi")
  assert.equal(calculatePay({ ...input, paidAmount: 1000 }).status, "odendi")
  assert.equal(calculatePay({ ...input, paidAmount: 1200 }).remainingAmount, 0)
})

test("yalnızca tamamlanmış haftalar ödenebilir", () => {
  assert.equal(isCompletedPayrollWeek("2026-07-13", "2026-07-20"), true)
  assert.equal(isCompletedPayrollWeek("2026-07-20", "2026-07-24"), false)
  assert.equal(isCompletedPayrollWeek("2026-07-20", "2026-07-27"), true)
})

test("para değerleri kuruşa yuvarlanır", () => {
  assert.equal(roundMoney(10.005), 10.01)
  assert.equal(roundMoney(1.004), 1)
})
