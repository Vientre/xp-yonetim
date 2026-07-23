export interface CoursePayment {
  paid: boolean
  date: string
}

export interface CourseStudent {
  id: string
  name: string
  monthlyFee: number
  createdAt: string
  sinif: string
  payments: Record<string, CoursePayment>
}

export interface CourseExpense {
  id: string
  tarih: string
  detay: string
  tutar: number
  olusturmaTarihi: string
}

export interface PendingPaymentToggle {
  studentId: string
  studentName: string
  month: string
  monthLabel: string
  current: CoursePayment | undefined
  newPaid: boolean
}

export interface CourseMonth {
  year: number
  month: number
  key: string
  label: string
}
