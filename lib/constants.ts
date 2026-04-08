// Hardcoded businesses - 4 fixed companies
export const BUSINESSES = [
  { id: "kim-sahne", name: "Kim Sahne" },
  { id: "xp-vr", name: "XP VR" },
  { id: "xp-racing", name: "XP Racing" },
  { id: "xp-laser", name: "XP Laser" },
] as const

export type BusinessId = (typeof BUSINESSES)[number]["id"]

export function getBusinessName(id: string): string {
  return BUSINESSES.find((b) => b.id === id)?.name ?? id
}

// Hardcoded expense categories
export const EXPENSE_CATEGORIES = [
  { id: "kira", name: "Kira", color: "#ef4444" },
  { id: "elektrik", name: "Elektrik", color: "#f97316" },
  { id: "su", name: "Su", color: "#3b82f6" },
  { id: "dogalgaz", name: "Doğalgaz", color: "#eab308" },
  { id: "personel", name: "Personel", color: "#8b5cf6" },
  { id: "malzeme", name: "Malzeme/Sarf", color: "#06b6d4" },
  { id: "bakim", name: "Bakım/Onarım", color: "#84cc16" },
  { id: "pazarlama", name: "Pazarlama", color: "#ec4899" },
  { id: "vergi-sgk", name: "Vergi/SGK", color: "#6b7280" },
  { id: "diger", name: "Diğer", color: "#94a3b8" },
] as const

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"]

export function getCategoryById(id: string) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)
}

// Role definitions
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Google Sheets tab names
export const TABS = {
  USERS: "Kullanicilar",
  DAILY_INCOME: "GunlukGelir",
  EXPENSES: "Giderler",
  MEALS: "Yemek",
  ATTENDANCE: "Puantaj",
  SETTINGS: "Ayarlar",
} as const
