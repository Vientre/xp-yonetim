"use client"

import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESSES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { MONTH_NAMES } from "./utils"

interface MonthlyTableHeaderProps {
  year: number
  month: number
  businessId: string
  businessName?: string
  exportDisabled: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
  onBusinessChange: (id: string) => void
  onExport: () => void
}

export function MonthlyTableHeader({
  year,
  month,
  businessId,
  businessName,
  exportDisabled,
  onPreviousMonth,
  onNextMonth,
  onBusinessChange,
  onExport,
}: MonthlyTableHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Aylık Tablo</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={exportDisabled} className="gap-2"><Download className="h-4 w-4" />Excel İndir</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />Yazdır / PDF</Button>
        </div>
      </div>
      <div className="mb-4 hidden text-center print:block">
        <h1 className="text-xl font-bold">{businessName}</h1>
        <p className="text-sm text-slate-600">{MONTH_NAMES[month]} {year} — Aylık Tablo</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
          <button type="button" onClick={onPreviousMonth} className="rounded p-1 transition-colors hover:bg-slate-100"><ChevronLeft className="h-4 w-4 text-slate-600" /></button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-slate-800">{MONTH_NAMES[month]} {year}</span>
          <button type="button" onClick={onNextMonth} className="rounded p-1 transition-colors hover:bg-slate-100"><ChevronRight className="h-4 w-4 text-slate-600" /></button>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {BUSINESSES.map((business) => (
            <button type="button" key={business.id} onClick={() => onBusinessChange(business.id)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-all", businessId === business.id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700")}>{business.name}</button>
          ))}
        </div>
      </div>
    </>
  )
}
