export interface Business {
  id: string
  name: string
}

export interface BizDetail {
  id: string
  name: string
  income: { nakit: number; kart: number; bilet: number; total: number }
  expense: {
    total: number
    byCategory: { name: string; color: string; total: number }[]
  }
  net: number
  dailyRows: {
    date: string
    nakit: number
    kart: number
    bilet: number
    gelir: number
    gider: number
  }[]
}

export interface BizDetailResponse {
  businesses: BizDetail[]
  grand: {
    gelir: number
    gider: number
    net: number
    nakit: number
    kart: number
    bilet: number
  }
  from: string
  to: string
}

export interface IncomeEntry {
  id: string
  date: string
  business: Business
  cashIncome: number
  cardIncome: number
  ticketIncome: number
  totalIncome: number
  totalExpense: number
  netAmount: number
}

export interface IncomeResponse {
  data: IncomeEntry[]
  summary: { totalIncome: number; totalExpense: number; netAmount: number }
}

export interface PayrollEntry {
  name: string
  days: number
  totalHours: number
  totalMeal: number
  totalTip: number
  totalDeduction: number
  totalPay: number
}

export interface PayrollResponse {
  summary: PayrollEntry[]
  saatlikUcret: number
}

export interface MealEntry {
  id: string
  date: string
  business: Business
  count: number
  totalCost: number
}

export interface MealResponse {
  data: MealEntry[]
  summary: { totalQty: number; totalPrice: number; orderCount: number }
}

export interface TrendPoint {
  date: string
  income: number
  expense: number
}

export interface BusinessPoint {
  name: string
  income: number
  expense: number
  net: number
}
