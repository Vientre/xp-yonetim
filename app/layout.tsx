import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "XP Yönetim Sistemi",
  description: "Çok işletmeli muhasebe ve personel yönetim sistemi",
  keywords: ["muhasebe", "işletme yönetimi", "personel", "puantaj"],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
