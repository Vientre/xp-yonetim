import { BUSINESSES } from "@/lib/constants"
import type { Role } from "@/lib/constants"

type AccessSubject = {
  role: Role
  businesses: string[]
}

export function canAccessBusiness(subject: AccessSubject, businessId: string): boolean {
  return subject.role === "admin"
    || subject.businesses.includes("TUM")
    || subject.businesses.includes(businessId)
}

export function accessibleBusinessIds(subject: AccessSubject): string[] {
  if (subject.role === "admin" || subject.businesses.includes("TUM")) {
    return BUSINESSES.map((business) => business.id)
  }

  const validIds = new Set<string>(BUSINESSES.map((business) => business.id))
  return [...new Set(subject.businesses)].filter((businessId) => validIds.has(businessId))
}
