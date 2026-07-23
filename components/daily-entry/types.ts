export interface Business {
  id: string
  name: string
}

export interface ExpenseCategory {
  id: string
  name: string
  color: string
}

export interface DailyClosing {
  id: string
  date: string
  businessId: string
  business: { name: string }
  totalIncome: number
  totalExpense: number
  netAmount: number
  status: string
  cashIncome: number
  cardIncome: number
  ticketIncome: number
  ticketCardIncome: number
  kasadanBankaya: number
  bankadanKasaya: number
  notes: string
  expenses: Array<{
    id: string
    categoryId: string
    category: { name: string; color: string }
    amount: number
    description: string
    paymentMethod?: string
  }>
}
