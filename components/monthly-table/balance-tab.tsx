"use client"

import { Wallet } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import type { BalanceTotals, DailyBalance } from "./types"
import { DAY_NAMES, formatDateShort } from "./utils"

export function BalanceTab({
  title,
  color,
  startBalance,
  startDate,
  daily,
  totals,
  year,
  month,
}: {
  title: string
  color: "emerald" | "blue"
  startBalance: number
  startDate: string
  daily: DailyBalance[]
  totals: BalanceTotals
  year: number
  month: number
}) {
  const lastBalance = daily.length > 0 ? daily[daily.length - 1].endBalance : startBalance
  const accent = color === "emerald"
    ? { bgFaint: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", textDark: "text-emerald-900" }
    : { bgFaint: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", textDark: "text-blue-900" }

  if (!startDate) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <Wallet className="w-8 h-8 mx-auto text-amber-600 mb-2" />
        <p className="text-sm font-medium text-amber-900">Başlangıç bakiyesi tanımlanmamış</p>
        <p className="text-xs text-amber-700 mt-1">
          {title} hesabını görmek için <strong>Ayarlar → Kasa & Banka</strong> sekmesinden bu işletme için başlangıç bakiyesi ve tarih girin.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Özet kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={cn("rounded-xl p-3", accent.bgFaint)}>
          <p className={cn("text-xs font-medium", accent.text)}>Başlangıç Bakiyesi</p>
          <p className={cn("text-sm font-bold mt-0.5", accent.textDark)}>{formatCurrency(startBalance)}</p>
          <p className={cn("text-[10px] mt-0.5", accent.text)}>{formatDateShort(startDate)} itibarıyla</p>
        </div>
        <div className="rounded-xl p-3 bg-emerald-50">
          <p className="text-xs text-emerald-700 font-medium">Ay İçi Giriş</p>
          <p className="text-sm font-bold text-emerald-900 mt-0.5">+ {formatCurrency(totals.inflow)}</p>
        </div>
        <div className="rounded-xl p-3 bg-red-50">
          <p className="text-xs text-red-700 font-medium">Ay İçi Çıkış</p>
          <p className="text-sm font-bold text-red-900 mt-0.5">- {formatCurrency(totals.outflow)}</p>
        </div>
        <div className={cn("rounded-xl p-3", accent.bgFaint, "ring-2", accent.border)}>
          <p className={cn("text-xs font-medium", accent.text)}>Ay Sonu Bakiye</p>
          <p className={cn("text-base font-bold mt-0.5", accent.textDark)}>{formatCurrency(lastBalance)}</p>
        </div>
      </div>

      {/* Günlük tablo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Tarih</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-500 w-12 print:hidden">Gün</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Açılış</th>
                <th className="text-right px-4 py-3 font-semibold text-emerald-700">Giriş</th>
                <th className="text-right px-4 py-3 font-semibold text-red-700">Çıkış</th>
                <th className={cn("text-right px-4 py-3 font-bold border-l border-slate-200", accent.text)}>Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => {
                const date = new Date(d.date + "T00:00:00")
                const day = date.getDate()
                const dayName = DAY_NAMES[date.getDay()]
                const isWeekend = [0, 6].includes(date.getDay())
                const hasActivity = d.inflow > 0 || d.outflow > 0
                return (
                  <tr
                    key={d.date}
                    className={cn(
                      "border-b border-slate-100",
                      d.isBeforeStart ? "bg-slate-50/50 text-slate-400" : "",
                      hasActivity ? "hover:bg-slate-50" : ""
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {String(day).padStart(2, "0")}.{String(month + 1).padStart(2, "0")}.{year}
                    </td>
                    <td className={cn("px-3 py-2.5 text-xs font-medium print:hidden", isWeekend ? "text-red-400" : "text-slate-400")}>
                      {dayName}
                    </td>
                    {d.isBeforeStart ? (
                      <td colSpan={4} className="px-4 py-2.5 text-center text-xs text-slate-400">
                        — Başlangıç tarihinden önce —
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                          {formatCurrency(d.startBalance)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">
                          {d.inflow > 0 ? `+ ${formatCurrency(d.inflow)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-600">
                          {d.outflow > 0 ? `- ${formatCurrency(d.outflow)}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-bold border-l border-slate-100", accent.textDark)}>
                          {formatCurrency(d.endBalance)}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
