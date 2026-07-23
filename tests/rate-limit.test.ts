import test from "node:test"
import assert from "node:assert/strict"
import { getClientIp, InMemoryRateLimiter } from "@/lib/rate-limit"

test("izin verilen istek sayısından sonra anahtar bloke edilir", () => {
  let now = 1_000
  const limiter = new InMemoryRateLimiter(2, 10_000, () => now)

  assert.deepEqual(limiter.consume("user-1"), {
    allowed: true,
    remaining: 1,
    retryAfterSeconds: 0,
  })
  assert.equal(limiter.consume("user-1").allowed, true)

  const blocked = limiter.consume("user-1")
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.remaining, 0)
  assert.equal(blocked.retryAfterSeconds, 10)

  now += 10_001
  assert.equal(limiter.consume("user-1").allowed, true)
})

test("anahtarlar birbirinden bağımsızdır ve reset kilidi kaldırır", () => {
  const limiter = new InMemoryRateLimiter(1, 60_000, () => 5_000)
  limiter.consume("a")
  assert.equal(limiter.check("a").allowed, false)
  assert.equal(limiter.check("b").allowed, true)
  limiter.reset("a")
  assert.equal(limiter.check("a").allowed, true)
})

test("istemci IP adresinde ilk forwarded değer kullanılır", () => {
  const forwardedRequest = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  })
  const realIpRequest = new Request("https://example.test", {
    headers: { "x-real-ip": "198.51.100.8" },
  })

  assert.equal(getClientIp(forwardedRequest), "203.0.113.10")
  assert.equal(getClientIp(realIpRequest), "198.51.100.8")
})
