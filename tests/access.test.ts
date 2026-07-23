import test from "node:test"
import assert from "node:assert/strict"
import { accessibleBusinessIds, canAccessBusiness } from "@/lib/access"
import { BUSINESSES } from "@/lib/constants"

test("admin bütün işletmelere erişebilir", () => {
  const user = { role: "admin" as const, businesses: [] }
  assert.equal(canAccessBusiness(user, "xp-racing"), true)
  assert.deepEqual(accessibleBusinessIds(user), BUSINESSES.map((business) => business.id))
})

test("TUM yetkisi bütün işletmelere erişim verir", () => {
  const user = { role: "manager" as const, businesses: ["TUM"] }
  assert.equal(canAccessBusiness(user, "kim-sahne"), true)
  assert.equal(accessibleBusinessIds(user).length, BUSINESSES.length)
})

test("sınırlı kullanıcı yalnızca atanmış işletmelere erişebilir", () => {
  const user = { role: "staff" as const, businesses: ["xp-racing", "xp-vr"] }
  assert.equal(canAccessBusiness(user, "xp-racing"), true)
  assert.equal(canAccessBusiness(user, "xp-laser"), false)
  assert.deepEqual(accessibleBusinessIds(user), ["xp-racing", "xp-vr"])
})

test("bilinmeyen ve tekrarlı işletme kimlikleri sonuçtan temizlenir", () => {
  const user = {
    role: "manager" as const,
    businesses: ["xp-vr", "bilinmeyen", "xp-vr"],
  }
  assert.deepEqual(accessibleBusinessIds(user), ["xp-vr"])
})
