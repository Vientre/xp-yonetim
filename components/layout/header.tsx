"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Settings, Bell, Menu } from "lucide-react"
import { getRoleName } from "@/lib/utils"
import type { Role } from "@/lib/constants"

interface HeaderProps {
  userName: string
  userEmail: string
  userRole: Role | string
  onMenuClick?: () => void
}

export function Header({ userName, userEmail, userRole, onMenuClick }: HeaderProps) {
  const router = useRouter()

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 gap-4">
      {/* Hamburger — only on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-gray-500"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Bildirimler - placeholder */}
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Kullanıcı menüsü */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight">{userName}</p>
                <p className="text-xs text-muted-foreground leading-tight">{getRoleName(userRole)}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground font-normal">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Ayarlar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
