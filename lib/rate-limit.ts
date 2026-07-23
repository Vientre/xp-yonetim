export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export class InMemoryRateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000
  ) {
    if (maxAttempts < 1 || windowMs < 1) {
      throw new Error("Rate limit değerleri pozitif olmalıdır")
    }
  }

  check(key: string): RateLimitResult {
    const timestamps = this.activeAttempts(key)
    if (timestamps.length < this.maxAttempts) {
      return {
        allowed: true,
        remaining: this.maxAttempts - timestamps.length,
        retryAfterSeconds: 0,
      }
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((timestamps[0] + this.windowMs - this.now()) / 1000)
      ),
    }
  }

  record(key: string): RateLimitResult {
    const current = this.check(key)
    if (!current.allowed) return current

    if (!this.attempts.has(key) && this.attempts.size >= this.maxKeys) {
      const oldestKey = this.attempts.keys().next().value
      if (typeof oldestKey === "string") this.attempts.delete(oldestKey)
    }
    const timestamps = this.activeAttempts(key)
    timestamps.push(this.now())
    this.attempts.set(key, timestamps)
    return this.check(key)
  }

  consume(key: string): RateLimitResult {
    const current = this.check(key)
    if (!current.allowed) return current
    this.record(key)
    return { ...current, remaining: current.remaining - 1 }
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }

  private activeAttempts(key: string): number[] {
    const cutoff = this.now() - this.windowMs
    const timestamps = (this.attempts.get(key) ?? []).filter((time) => time > cutoff)
    if (timestamps.length > 0) this.attempts.set(key, timestamps)
    else this.attempts.delete(key)
    return timestamps
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
}

export const loginFailureLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000)
export const aiAnalysisLimiter = new InMemoryRateLimiter(5, 10 * 60 * 1000)
