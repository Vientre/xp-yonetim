export interface Expense {
  id: string
  categoryId: string
  category: { id: string; name: string; color: string }
  description: string
  amount: number
  paymentMethod?: "nakit" | "banka"
}

export interface DayEntry {
  id: string
  date: string
  businessId: string
  cashIncome: number
  cardIncome: number
  ticketIncome: number
  ticketCardIncome: number
  kasadanBankaya: number
  bankadanKasaya: number
  totalIncome: number
  totalExpense: number
  netAmount: number
  notes: string
  enteredBy: { name: string }
  expenses: Expense[]
}

export interface DailyBalance {
  date: string
  isBeforeStart: boolean
  startBalance: number
  inflow: number
  outflow: number
  endBalance: number
}

export interface BalanceTotals {
  inflow: number
  outflow: number
}
