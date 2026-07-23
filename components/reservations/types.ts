export type ReservationStatus = "" | "geldi" | "gelmedi" | "iptal"
export type ReservationDuration = 30 | 45 | 60

export interface Reservation {
  id: string
  tarih: string
  gun: string
  saat: string
  not: string
  telefon: string
  kisiSayisi: number
  sure: number
  ekleyenId: string
  ekleyenAd: string
  olusturmaTarihi: string
  silindi: boolean
  silenId: string
  silenAd: string
  silmeTarihi: string
  durum: ReservationStatus
  musteriNotu: string
}

export interface CurrentUser {
  id: string
  name: string
  role: "admin" | "manager" | "staff"
}

export type PendingReservationAction = {
  item: Reservation
  type: "delete" | "complete" | "noshow"
}

export type PendingHardDelete =
  | { kind: "single"; item: Reservation }
  | { kind: "date"; tarih: string; gun: string; count: number }
  | { kind: "week"; tarih: string; weekStart: string; weekEnd: string; count: number }
  | { kind: "month"; tarih: string; yearMonth: string; count: number }

export interface ReservationFormState {
  tarih: string
  saat: string
  kisiSayisi: string
  sure: ReservationDuration
  telefon: string
  not: string
}

export interface PhoneStats {
  total: number
  geldi: number
  gelmedi: number
  iptal: number
}
