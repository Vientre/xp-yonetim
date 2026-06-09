import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { getAuthUser } from "@/lib/auth-utils"

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body = await req.json()
  const { businessName, monthLabel, totals, expenseCategories, daysWithEntry, daysInMonth } = body

  if (!businessName || !monthLabel) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY tanımlanmamış" }, { status: 503 })
  }

  const anthropic = createAnthropic({ apiKey })

  const catLines = (expenseCategories as { name: string; total: number }[])
    .map((c) => `  - ${c.name}: ${c.total.toLocaleString("tr-TR")} ₺`)
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
  } catch (err: any) {
    console.error("Analiz hatası:", err?.message)
    return NextResponse.json({ error: "Analiz oluşturulamadı" }, { status: 500 })
  }
}
