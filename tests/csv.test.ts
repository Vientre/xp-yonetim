import test from "node:test"
import assert from "node:assert/strict"
import { toCsv } from "@/lib/csv"

test("CSV ayraç, tırnak ve satır sonlarını güvenli biçimde escape eder", () => {
  const csv = toCsv([
    ["ad", "not"],
    ["Ali; Veli", 'Dedi ki "tamam"'],
    ["Ayşe", "iki\nsatır"],
  ])

  assert.equal(
    csv,
    'ad;not\r\n"Ali; Veli";"Dedi ki ""tamam"""\r\nAyşe;"iki\nsatır"'
  )
})

test("null ve undefined hücreler boş yazılır", () => {
  assert.equal(toCsv([[null, undefined, 0]]), ";;0")
})
