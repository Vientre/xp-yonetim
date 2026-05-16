/**
 * Yedek API — Tüm Google Sheets sekmelerini ZIP olarak indirir
 *
 * GET /api/backup
 * Sadece admin erişebilir.
 * Çıktı: yedek-YYYY-MM-DD.zip — her sekme için 1 CSV dosyası içerir
 */

import { NextResponse } from "next/server"
import JSZip from "jszip"
import { getAuthUser } from "@/lib/auth-utils"
import { getAllRowsWithHeader } from "@/lib/sheets"
import { TABS } from "@/lib/constants"
import { toCsv } from "@/lib/csv"

export const runtime = "nodejs"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sadece yöneticiler yedek alabilir" }, { status: 403 })
  }

  const zip = new JSZip()
  const tabNames = Object.values(TABS)
  const results: Array<{ tab: string; rows: number; error?: string }> = []

  // Her sekme için CSV oluştur, ZIP'e ekle
  await Promise.all(
    tabNames.map(async (tab) => {
      try {
        const rows = await getAllRowsWithHeader(tab)
        const csv = toCsv(rows, ";")
        // UTF-8 BOM ekle — Excel'de Türkçe için
        zip.file(`${tab}.csv`, "﻿" + csv)
        results.push({ tab, rows: Math.max(0, rows.length - 1) })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Bilinmeyen hata"
        results.push({ tab, rows: 0, error: msg })
        // Sekme yoksa boş dosya ekle, devam et
        zip.file(`${tab}.csv`, `# Bu sekme okunamadı: ${msg}`)
      }
    })
  )

  // README dosyası — yedek meta bilgisi
  const meta = [
    `Yedek tarihi: ${new Date().toISOString()}`,
    `Alan: ${user.name} (${user.email})`,
    ``,
    `Sekmeler:`,
    ...results.map((r) =>
      r.error ? `  ⚠️ ${r.tab}: ${r.error}` : `  ✓ ${r.tab}: ${r.rows} kayıt`
    ),
    ``,
    `Not: CSV dosyaları UTF-8 BOM ile kaydedildi (Excel için).`,
    `Ayraç: ; (noktalı virgül)`,
  ].join("\n")
  zip.file("README.txt", "﻿" + meta)

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="yedek-${today}.zip"`,
      "Content-Length": String(buffer.length),
    },
  })
}
