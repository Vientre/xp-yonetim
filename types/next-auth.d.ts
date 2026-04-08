import type { Role } from "@/lib/constants"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      businesses: string[] // ["TUM"] or ["xp-racing", "xp-vr"]
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: Role
    businesses: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    businesses: string[]
  }
}
