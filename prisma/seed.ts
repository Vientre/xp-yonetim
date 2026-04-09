import { PrismaClient, UserRole, SalaryType } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/xp_management"
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seed başlıyor...")

  // ─── İŞLETMELER ─────────────────────────────────────────────────────────────
  const businesses = await Promise.all([
    prisma.business.upsert({
      where: { slug: "xp-racing" },
      update: {},
      create: {
        name: "XP Racing",
        slug: "xp-racing",
        description: "Yarış simülatörü merkezi",
        sortOrder: 1,
      },
    }),
    prisma.business.upsert({
      where: { slug: "xp-vr-station" },
      update: {},
      create: {
        name: "XP VR Station",
        slug: "xp-vr-station",
        description: "Sanal gerçeklik deneyim merkezi",
        sortOrder: 2,
      },
    }),
    prisma.business.upsert({
      where: { slug: "xp-laser-tag" },
      update: {},
      create: {
        name: "XP Laser Tag",
        slug: "xp-laser-tag",
        description: "Lazer tag oyun alanı",
        sortOrder: 3,
      },
    }),
    prisma.business.upsert({
      where: { slug: "kim-sahne" },
      update: {},
      create: {
        name: "Kim Sahne",
        slug: "kim-sahne",
        description: "Sahne ve etkinlik merkezi",
        sortOrder: 4,
      },
    }),
  ])

  console.log(`✅ ${businesses.length} işletme oluşturuldu`)

  // ─── GİDER KATEGORİLERİ ──────────────────────────────────────────────────────
  const categories = [
    { name: "Fatura", slug: "fatura", color: "#f97316", isDefault: true },
    { name: "Maaş", slug: "maas", color: "#8b5cf6", isDefault: true },
    { name: "Yemek", slug: "yemek", color: "#10b981", isDefault: true },
    { name: "Tip", slug: "tip", color: "#f59e0b", isDefault: true },
    { name: "Alışveriş", slug: "alisveris", color: "#3b82f6", isDefault: true },
    { name: "Kredi", slug: "kredi", color: "#ef4444", isDefault: true },
    { name: "Muhasebe", slug: "muhasebe", color: "#6366f1", isDefault: true },
    { name: "Reklam", slug: "reklam", color: "#ec4899", isDefault: true },
    { name: "Temizlik", slug: "temizlik", color: "#14b8a6", isDefault: true },
    { name: "Teknik Servis", slug: "teknik-servis", color: "#f97316", isDefault: true },
    { name: "Malzeme", slug: "malzeme", color: "#84cc16", isDefault: true },
    { name: "Kira", slug: "kira", color: "#dc2626", isDefault: true },
    { name: "Ulaşım", slug: "ulasim", color: "#0ea5e9", isDefault: true },
    { name: "Vergi", slug: "vergi", color: "#7c3aed", isDefault: true },
    { name: "Kargo", slug: "kargo", color: "#d97706", isDefault: true },
    { name: "Diğer", slug: "diger", color: "#6b7280", isDefault: true },
  ]

  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }

  console.log(`✅ ${categories.length} gider kategorisi oluşturuldu`)

  // ─── KULLANICILAR ─────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12)
  const managerHash = await bcrypt.hash("manager123", 12)
  const staffHash = await bcrypt.hash("staff123", 12)

  // Yönetici
  const admin = await prisma.user.upsert({
    where: { email: "admin@xpmanagement.com" },
    update: {},
    create: {
      name: "Sistem Yöneticisi",
      email: "admin@xpmanagement.com",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  })

  // Müdür - tüm işletmelere erişim
  const manager = await prisma.user.upsert({
    where: { email: "mudur@xpmanagement.com" },
    update: {},
    create: {
      name: "Ahmet Müdür",
      email: "mudur@xpmanagement.com",
      passwordHash: managerHash,
      role: UserRole.MANAGER,
    },
  })

  // Müdür işletme erişimleri
  for (const business of businesses) {
    await prisma.userBusinessAccess.upsert({
      where: {
        userId_businessId: { userId: manager.id, businessId: business.id },
      },
      update: {},
      create: { userId: manager.id, businessId: business.id },
    })
  }

  // Personel 1 - sadece XP Racing
  const staff1 = await prisma.user.upsert({
    where: { email: "personel1@xpmanagement.com" },
    update: {},
    create: {
      name: "Ayşe Personel",
      email: "personel1@xpmanagement.com",
      passwordHash: staffHash,
      role: UserRole.STAFF,
    },
  })

  await prisma.userBusinessAccess.upsert({
    where: {
      userId_businessId: { userId: staff1.id, businessId: businesses[0].id },
    },
    update: {},
    create: { userId: staff1.id, businessId: businesses[0].id },
  })

  // Personel 2 - XP VR ve Kim Sahne
  const staff2 = await prisma.user.upsert({
    where: { email: "personel2@xpmanagement.com" },
    update: {},
    create: {
      name: "Mehmet Personel",
      email: "personel2@xpmanagement.com",
      passwordHash: staffHash,
      role: UserRole.STAFF,
    },
  })

  await Promise.all([
    prisma.userBusinessAccess.upsert({
      where: {
        userId_businessId: { userId: staff2.id, businessId: businesses[1].id },
      },
      update: {},
      create: { userId: staff2.id, businessId: businesses[1].id },
    }),
    prisma.userBusinessAccess.upsert({
      where: {
        userId_businessId: { userId: staff2.id, businessId: businesses[3].id },
      },
      update: {},
      create: { userId: staff2.id, businessId: businesses[3].id },
    }),
  ])

  console.log(`✅ 4 kullanıcı oluşturuldu`)

  // ─── ÇALIŞANLAR ──────────────────────────────────────────────────────────────
  const employeeData = [
    {
      name: "Ali Yılmaz",
      phone: "0532 111 1111",
      salaryType: SalaryType.DAILY,
      currentSalary: 600,
      dailyMealRate: 75,
      defaultTipEnabled: true,
      businessSlugs: ["xp-racing", "xp-vr-station"],
    },
    {
      name: "Fatma Kaya",
      phone: "0533 222 2222",
      salaryType: SalaryType.MONTHLY,
      currentSalary: 18000,
      dailyMealRate: 75,
      defaultTipEnabled: false,
      businessSlugs: ["xp-laser-tag"],
    },
    {
      name: "Mustafa Demir",
      phone: "0534 333 3333",
      salaryType: SalaryType.HOURLY,
      currentSalary: 100,
      dailyMealRate: 75,
      defaultTipEnabled: true,
      businessSlugs: ["kim-sahne", "xp-racing"],
    },
    {
      name: "Zeynep Çelik",
      phone: "0535 444 4444",
      salaryType: SalaryType.DAILY,
      currentSalary: 650,
      dailyMealRate: 75,
      defaultTipEnabled: false,
      businessSlugs: ["xp-vr-station", "kim-sahne"],
    },
  ]

  for (const emp of employeeData) {
    const employee = await prisma.employee.upsert({
      where: {
        // Telefon ile unique değil, isimle + telefon ile upsert
        id: (await prisma.employee.findFirst({ where: { name: emp.name } }))?.id ?? "new-" + emp.name,
      },
      update: {},
      create: {
        name: emp.name,
        phone: emp.phone,
        salaryType: emp.salaryType,
        currentSalary: emp.currentSalary,
        dailyMealRate: emp.dailyMealRate,
        defaultTipEnabled: emp.defaultTipEnabled,
        startDate: new Date("2024-01-01"),
      },
    })

    // İşletme atamaları
    for (const slug of emp.businessSlugs) {
      const biz = businesses.find((b) => b.slug === slug)
      if (biz) {
        await prisma.employeeBusinessAssignment.upsert({
          where: {
            employeeId_businessId: { employeeId: employee.id, businessId: biz.id },
          },
          update: {},
          create: {
            employeeId: employee.id,
            businessId: biz.id,
            isPrimary: emp.businessSlugs.indexOf(slug) === 0,
          },
        })
      }
    }

    // Maaş geçmişi
    await prisma.salaryHistory.upsert({
      where: {
        id: (await prisma.salaryHistory.findFirst({ where: { employeeId: employee.id } }))?.id ?? "new",
      },
      update: {},
      create: {
        employeeId: employee.id,
        salaryType: emp.salaryType,
        amount: emp.currentSalary,
        effectiveDate: new Date("2024-01-01"),
        notes: "Başlangıç maaşı",
      },
    })
  }

  console.log(`✅ ${employeeData.length} çalışan oluşturuldu`)

  // ─── SİSTEM AYARLARI ─────────────────────────────────────────────────────────
  const settings = [
    { key: "meal_unit_price", value: "75", label: "Yemek Birim Fiyatı (₺)", group: "meal" },
    { key: "currency", value: "TRY", label: "Para Birimi", group: "general" },
    { key: "require_day_close", value: "false", label: "Gün Sonu Kapanış Zorunlu", group: "closing" },
    { key: "allow_edit_old_records", value: "false", label: "Eski Kayıt Düzenleme İzni", group: "permissions" },
    { key: "require_manager_approval", value: "false", label: "Müdür Onayı Zorunlu", group: "permissions" },
    { key: "high_amount_warning", value: "10000", label: "Yüksek Tutar Uyarı Limiti (₺)", group: "validation" },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log(`✅ ${settings.length} sistem ayarı oluşturuldu`)

  // ─── ÖRNEK VERİ ───────────────────────────────────────────────────────────────
  const expenseCategories = await prisma.expenseCategory.findMany()
  const catMap = Object.fromEntries(expenseCategories.map((c) => [c.slug, c.id]))

  // Son 7 gün için örnek kapanış verileri
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    for (const business of businesses) {
      const existing = await prisma.dailyClosing.findUnique({
        where: { businessId_date: { businessId: business.id, date } },
      })

      if (existing) continue

      const cashIncome = Math.floor(Math.random() * 3000) + 500
      const cardIncome = Math.floor(Math.random() * 5000) + 1000
      const ticketIncome = Math.floor(Math.random() * 1000)
      const totalIncome = cashIncome + cardIncome + ticketIncome

      const closing = await prisma.dailyClosing.create({
        data: {
          businessId: business.id,
          date,
          status: "CLOSED",
          cashIncome,
          cardIncome,
          ticketIncome,
          totalIncome,
          totalExpense: 0,
          netAmount: 0,
          enteredById: admin.id,
        },
      })

      // 2-4 gider kalemi
      const expenseCount = Math.floor(Math.random() * 3) + 2
      const expenseSlugs = ["fatura", "maas", "yemek", "malzeme", "temizlik"]
      let totalExpense = 0

      for (let j = 0; j < expenseCount; j++) {
        const slug = expenseSlugs[Math.floor(Math.random() * expenseSlugs.length)]
        const amount = Math.floor(Math.random() * 500) + 100
        totalExpense += amount

        if (catMap[slug]) {
          await prisma.expenseEntry.create({
            data: {
              dailyClosingId: closing.id,
              categoryId: catMap[slug],
              amount,
              description: `${business.name} - ${new Date(date).toLocaleDateString("tr-TR")}`,
            },
          })
        }
      }

      // Toplamları güncelle
      await prisma.dailyClosing.update({
        where: { id: closing.id },
        data: {
          totalExpense,
          netAmount: totalIncome - totalExpense,
        },
      })
    }
  }

  console.log(`✅ 7 günlük örnek veri oluşturuldu`)

  // ─── YEMEK SİPARİŞİ ÖRNEKLERİ ────────────────────────────────────────────────
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    for (const business of businesses.slice(0, 3)) {
      const qty = Math.floor(Math.random() * 5) + 1
      await prisma.mealOrder.create({
        data: {
          businessId: business.id,
          date,
          quantity: qty,
          unitPrice: 75,
          totalPrice: qty * 75,
          enteredById: manager.id,
        },
      })
    }
  }

  console.log(`✅ Yemek siparişi örnekleri oluşturuldu`)

  console.log("\n🎉 Seed tamamlandı!\n")
  console.log("Demo Kullanıcılar:")
  console.log("  👑 Yönetici:  admin@xpmanagement.com    / admin123")
  console.log("  👔 Müdür:     mudur@xpmanagement.com   / manager123")
  console.log("  👤 Personel:  personel1@xpmanagement.com / staff123")
  console.log("  👤 Personel:  personel2@xpmanagement.com / staff123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
