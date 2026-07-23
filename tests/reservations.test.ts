import assert from "node:assert/strict"
import test from "node:test"
import {
  computePhoneStats,
  endOfWeekIso,
  formatTimeRange,
  normalizePhone,
  startOfWeekIso,
  timesOverlap,
} from "../components/reservations/utils"
import type { Reservation } from "../components/reservations/types"

function reservation(id: string, phone: string, status: Reservation["durum"]): Reservation {
  return {
    id,
    tarih: "2026-07-24",
    gun: "Cuma",
    saat: "10:00",
    not: "",
    telefon: phone,
    kisiSayisi: 2,
    sure: 30,
    ekleyenId: "",
    ekleyenAd: "",
    olusturmaTarihi: "",
    silindi: false,
    silenId: "",
    silenAd: "",
    silmeTarihi: "",
    durum: status,
    musteriNotu: "",
  }
}

test("rezervasyon çakışması 15 dakikalık hazırlık payını içerir", () => {
  assert.equal(timesOverlap("10:00", 30, "10:40", 30), true)
  assert.equal(timesOverlap("10:00", 30, "10:45", 30), false)
  assert.equal(formatTimeRange("10:00", 30), "10:00-10:45")
})

test("hafta aralığı pazartesi-pazar hesaplanır", () => {
  assert.equal(startOfWeekIso("2026-07-24"), "2026-07-20")
  assert.equal(endOfWeekIso("2026-07-24"), "2026-07-26")
})

test("telefon geçmişi farklı Türkiye telefon yazımlarını eşleştirir", () => {
  const items = [
    reservation("1", "+90 532 111 22 33", "geldi"),
    reservation("2", "05321112233", "gelmedi"),
    reservation("3", "532 111 22 33", "iptal"),
  ]
  assert.equal(normalizePhone("+90 (532) 111 22 33"), "5321112233")
  assert.deepEqual(computePhoneStats(items, "0532 111 22 33"), {
    total: 3,
    geldi: 1,
    gelmedi: 1,
    iptal: 1,
  })
})
