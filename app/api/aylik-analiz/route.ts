import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth-utils"
import { aiAnalysisLimiter } from "@/lib/rate-limit"

const finiteNumber = z.number().finite().min(-1_000_000_000).max(1_000_000_000)

const analysisSchema = z.object({
  businessName: z.string().trim().min(1).max(100),
  monthLabel: z.string().trim().min(1).max(50),
  totals: z.object({
    income: finiteNumber,
    expense: finiteNumber,
    net: finiteNumber,
    cash: finiteNumber,
    card: finiteNumber,
    avgIncome: finiteNumber,
  }),
  expenseCategories: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    total: finiteNumber,
  })).max(50),
  daysWithEntry: z.number().int().min(0).max(31),
  daysInMonth: z.number().int().min(28).max(31),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const parsed = analysisSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz analiz verisi" }, { status: 400 })
  }
  const {
    businessName,
    monthLabel,
    totals,
    expenseCategories,
    daysWithEntry,
    daysInMonth,
  } = parsed.data

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY tanımlanmamış" }, { status: 503 })
  }

  const limit = aiAnalysisLimiter.consume(`ai-analysis:${user.id}`)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla analiz isteği. Lütfen daha sonra tekrar deneyin." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    )
  }

  const anthropic = createAnthropic({ apiKey })
  const catLines = expenseCategories
    .map((category) => `  - ${category.name}: ${category.total.toLocaleString("tr-TR")} ₺`)
    .join("\n")

  const prompt = `Sen bir işletme finans danışmanısın. Aşağıdaki aylık verilere bakarak kısa, net ve pratik bir Türkçe analiz yaz.

İşletme: ${businessName}
Dönem: ${monthLabel}
Kayıt Günü: ${daysWithEntry} / ${daysInMonth} gün

Finansal Özet:
  - Toplam Gelir: ${totals.income.toLocaleString("tr-TR")} ₺
  - Toplam Gider: ${totals.expense.toLocaleString("tr-TR")} ₺
  - Net Kâr/Zarar: ${totals.net.toLocaleString("tr-TR")} ₺
  - Nakit: ${totals.cash.toLocaleString("tr-TR")} ₺
  - Kart: ${totals.card.toLocaleString("tr-TR")} ₺
  - Günlük Ort. Gelir: ${totals.avgIncome.toLocaleString("tr-TR")} ₺

Gider Kalemleri:
${catLines || "  Gider kaydı yok"}

Lütfen şunları yaz:
1. Bu ayın genel performansını 1-2 cümleyle özetle (kârlı mı, zararlı mı, neden)
2. En dikkat çekici gider kalemini belirt
3. Varsa olumlu bir nokta söyle
4. 1 somut öneri ver (kısa, uygulanabilir)

Yanıt 4-6 cümleyi geçmesin. Sadece sade Türkçe metin yaz, başlık veya madde işareti kullanma.`

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4.5"),
      prompt,
      maxOutputTokens: 400,
    })
    return NextResponse.json({ analysis: text })
  } catch (error: unknown) {
    console.error("Analiz hatası:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Analiz oluşturulamadı" }, { status: 500 })
  }
}
