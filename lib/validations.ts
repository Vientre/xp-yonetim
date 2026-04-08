import { z } from "zod"

// Para alanı validasyonu - negatif olamaz
const moneyField = (label = "Tutar") =>
  z
    .string()
    .or(z.number())
    .transform((v) => String(v))
    .refine((v) => !isNaN(parseFloat(v)), { message: `${label} geçerli bir sayı olmalıdır` })
    .refine((v) => parseFloat(v) >= 0, { message: `${label} negatif olamaz` })

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
})

// ─── DAILY CLOSING ───────────────────────────────────────────────────────────

export const dailyClosingSchema = z.object({
  businessId: z.string().min(1, "İşletme seçin"),
  date: z.string().min(1, "Tarih girin"),
  cashIncome: moneyField("Nakit Gelir"),
  cardIncome: moneyField("Kart Gelir"),
  ticketIncome: moneyField("Bilet Gelir"),
  notes: z.string().optional(),
})

export const expenseEntrySchema = z.object({
  categoryId: z.string().min(1, "Kategori seçin"),
  amount: moneyField("Gider Tutarı"),
  description: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "TICKET", "MIXED"]).default("CASH"),
})

export type DailyClosingInput = z.infer<typeof dailyClosingSchema>
export type ExpenseEntryInput = z.infer<typeof expenseEntrySchema>

// ─── MEAL ORDER ──────────────────────────────────────────────────────────────

export const mealOrderSchema = z.object({
  businessId: z.string().min(1, "İşletme seçin"),
  date: z.string().min(1, "Tarih girin"),
  quantity: z.number().int().min(1, "Adet en az 1 olmalıdır"),
  unitPrice: moneyField("Birim Fiyat"),
  description: z.string().optional(),
})

export type MealOrderInput = z.infer<typeof mealOrderSchema>

// ─── EMPLOYEE ────────────────────────────────────────────────────────────────

export const employeeSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
  email: z.string().email("Geçerli e-posta").optional().or(z.literal("")),
  nationalId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  salaryType: z.enum(["MONTHLY", "HOURLY", "DAILY"]),
  currentSalary: moneyField("Maaş"),
  dailyMealRate: moneyField("Günlük Yemek Ücreti"),
  defaultTipEnabled: z.boolean().default(false),
  businessIds: z.array(z.string()).min(1, "En az bir işletme seçin"),
})

export type EmployeeInput = z.infer<typeof employeeSchema>

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

export const attendanceSchema = z.object({
  employeeId: z.string().min(1, "Personel seçin"),
  businessId: z.string().min(1, "İşletme seçin"),
  date: z.string().min(1, "Tarih girin"),
  shiftType: z.enum(["NORMAL", "HALF_DAY", "FULL_DAY", "CUSTOM"]),
  hoursWorked: z
    .number()
    .min(0, "Saat negatif olamaz")
    .max(24, "24 saatten fazla olamaz")
    .optional()
    .nullable(),
  salaryType: z.enum(["MONTHLY", "HOURLY", "DAILY"]),
  dailyRate: z.number().min(0).optional().nullable(),
  hourlyRate: z.number().min(0).optional().nullable(),
  mealIncluded: z.boolean().default(false),
  mealAmount: z.number().min(0).optional().nullable(),
  tipIncluded: z.boolean().default(false),
  tipAmount: z.number().min(0).optional().nullable(),
  bonusAmount: z.number().min(0).optional().nullable(),
  deductionAmount: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
})

export type AttendanceInput = z.infer<typeof attendanceSchema>

// ─── USER ────────────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter"),
  email: z.string().email("Geçerli e-posta"),
  password: z.string().min(6, "Şifre en az 6 karakter"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  phone: z.string().optional(),
  businessIds: z.array(z.string()),
})

export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .extend({
    password: z.string().min(6).optional().or(z.literal("")),
    isActive: z.boolean(),
  })

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

// ─── BUSINESS ────────────────────────────────────────────────────────────────

export const businessSchema = z.object({
  name: z.string().min(2, "İşletme adı en az 2 karakter"),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  taxNumber: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export type BusinessInput = z.infer<typeof businessSchema>

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export const settingsSchema = z.object({
  mealUnitPrice: z.number().min(0),
  currency: z.string().default("TRY"),
  requireDayClose: z.boolean().default(false),
  allowEditOldRecords: z.boolean().default(false),
  requireManagerApproval: z.boolean().default(false),
  highAmountWarningThreshold: z.number().min(0).default(10000),
})

export type SettingsInput = z.infer<typeof settingsSchema>
