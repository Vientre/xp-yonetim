import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "XP Yönetim Sistemi",
  description: "Çok işletmeli muhasebe ve personel yönetim sistemi",
  keywords: ["muhasebe", "işletme yönetimi", "personel", "puantaj"],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
