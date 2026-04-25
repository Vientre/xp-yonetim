import { requireAuth } from "@/lib/auth-utils"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  return (
    <DashboardShell
      userRole={user.role as any}
      userName={user.name ?? ""}
      userEmail={user.email ?? ""}
    >
      {children}
    </DashboardShell>
  )
}
