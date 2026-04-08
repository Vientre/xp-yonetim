"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/constants"
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  Building2,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Günlük Kayıt",
    href: "/daily-entry",
    icon: ClipboardList,
    roles: ["admin", "manager", "staff"],
  },
  {
    title: "Yemek Siparişi",
    href: "/meal-orders",
    icon: UtensilsCrossed,
    roles: ["admin", "manager"],
  },
  {
    title: "Puantaj",
    href: "/attendance",
    icon: CalendarCheck,
    roles: ["admin", "manager"],
  },
  {
    title: "Maaş Bordrosu",
    href: "/payroll",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    title: "Raporlar",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    title: "Kullanıcılar",
    href: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Ayarlar",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
]

interface SidebarProps {
  userRole: Role | string
  userName: string
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole as Role))

  const roleLabel =
    userRole === "admin" ? "Yönetici" : userRole === "manager" ? "Müdür" : "Personel"

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm leading-tight truncate">XP Yönetim</p>
            <p className="text-xs text-slate-400 truncate">Sistemi</p>
          </div>
        )}
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="flex-shrink-0 w-5 h-5" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Alt kullanıcı bilgisi */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 truncate">{userName}</p>
          <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
        </div>
      )}

      {/* Collapse butonu */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 text-white hover:bg-slate-600 flex items-center justify-center"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </aside>
  )
}
