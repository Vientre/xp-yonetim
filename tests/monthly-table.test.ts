import assert from "node:assert/strict"
import test from "node:test"
import { computeDailyBalances, sumBalances } from "../components/monthly-table/utils"
import type { DayEntry } from "../components/monthly-table/types"

function entry(date: string, inflow: number, outflow: number): DayEntry {
  return {
    id: date,
    date,
    businessId: "business",
    cashIncome: inflow,
    cardIncome: 0,
    ticketIncome: 0,
    ticketCardIncome: 0,
    kasadanBankaya: 0,
    bankadanKasaya: 0,
    totalIncome: inflow,
    totalExpense: outflow,
    netAmount: inflow - outflow,
    notes: "",
    enteredBy: { name: "Test" },
    expenses: [],
  }
}

test("aylık bakiye önceki aydaki hareketleri açılış bakiyesine uygular", () => {
  const daily = computeDailyBalances({
    entries: [
      entry("2026-06-30", 200, 50),
      entry("2026-07-01", 100, 25),
      entry("2026-07-02", 0, 40),
    ],
    startBalance: 1000,
    startDate: "2026-06-30",
    year: 2026,
    month: 6,
    daysCount: 2,
    getInflow: (item) => item.totalIncome,
    getOutflow: (item) => item.totalExpense,
  })

  assert.deepEqual(daily[0], {
    date: "2026-07-01",
    isBeforeStart: false,
    startBalance: 1150,
    inflow: 100,
    outflow: 25,
    endBalance: 1225,
  })
  assert.equal(daily[1].endBalance, 1185)
  assert.deepEqual(sumBalances(daily), { inflow: 100, outflow: 65 })
})

test("başlangıç tarihinden önceki günler bakiye hareketi üretmez", () => {
  const daily = computeDailyBalances({
    entries: [entry("2026-07-01", 500, 0)],
    startBalance: 750,
    startDate: "2026-07-02",
    year: 2026,
    month: 6,
    daysCount: 2,
    getInflow: (item) => item.totalIncome,
    getOutflow: (item) => item.totalExpense,
  })

  assert.deepEqual(daily[0], {
    date: "2026-07-01",
    isBeforeStart: true,
    startBalance: 0,
    inflow: 0,
    outflow: 0,
    endBalance: 0,
  })
  assert.equal(daily[1].startBalance, 750)
})
