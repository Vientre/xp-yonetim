"use client"

import { Trash2 } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import type { CourseMonth, CoursePayment, CourseStudent } from "./types"
import { formatCourseDate as formatDate } from "./utils"

export function CourseStudentTable({ loading, students, filteredStudents, months, toggling, deleting, selectedClass, totalCollected, totalMissing, onRequestToggle, onDeleteStudent }: {
  loading: boolean
  students: CourseStudent[]
  filteredStudents: CourseStudent[]
  months: CourseMonth[]
  toggling: string | null
  deleting: string | null
  selectedClass: string
  totalCollected: number
  totalMissing: number
  onRequestToggle: (student: CourseStudent, month: CourseMonth, payment: CoursePayment | undefined) => void
  onDeleteStudent: (student: CourseStudent) => void
}) {
  const filtered = filteredStudents
  const selectedSinif = selectedClass
  const requestToggle = onRequestToggle
  const deleteStudent = onDeleteStudent
  return (
<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
  {loading ? (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Yükleniyor…</div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-slate-500 font-semibold w-8">#</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Ad Soyad</th>
            <th className="text-center px-3 py-3 text-slate-600 font-semibold">Sınıf</th>
            <th className="text-right px-4 py-3 text-slate-600 font-semibold">Aylık Ücret</th>
            {months.map((mo) => (
              <th key={mo.key} className="text-center px-4 py-3 text-slate-600 font-semibold min-w-[130px]">
                {mo.label}
              </th>
            ))}
            <th className="text-right px-4 py-3 text-emerald-700 font-semibold">Ödenen</th>
            <th className="text-right px-4 py-3 text-red-700 font-semibold">Borç</th>
            <th className="px-3 py-3 print:hidden w-8" />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={months.length + 6} className="text-center py-12 text-slate-400 text-sm italic">
                {students.length === 0 ? "Henüz öğrenci eklenmedi." : "Sonuç bulunamadı."}
              </td>
            </tr>
          ) : (
            filtered.map((student, idx) => {
              const paidCount = months.filter((mo) => student.payments[mo.key]?.paid).length
              const totalPaid = paidCount * student.monthlyFee
              const totalDebt = (months.length - paidCount) * student.monthlyFee
              return (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                  <td className="px-3 py-3 text-center">
                    {student.sinif ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                        {student.sinif}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatCurrency(student.monthlyFee)}</td>

                  {months.map((mo) => {
                    const payment = student.payments[mo.key]
                    const paid = payment?.paid ?? false
                    const payDate = payment?.date ?? ""
                    const toggleKey = `${student.id}-${mo.key}`
                    const isToggling = toggling === toggleKey
                    return (
                      <td key={mo.key} className="px-4 py-3 text-center">
                        <button
                          onClick={() => requestToggle(student, mo, payment)}
                          disabled={isToggling}
                          title={paid ? `Ödeme tarihi: ${formatDate(payDate)} — Geri almak için tıkla` : "Ödendi olarak işaretle"}
                          className={cn(
                            "inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-w-[100px]",
                            paid
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200",
                            isToggling && "opacity-50 cursor-wait"
                          )}
                        >
                          <span>{isToggling ? "…" : paid ? "✓ Ödendi" : "✗ Ödenmedi"}</span>
                          {paid && payDate && (
                            <span className="text-[10px] font-normal opacity-70 mt-0.5">
                              {formatDate(payDate)}
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}

                  <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                    {totalPaid > 0 ? formatCurrency(totalPaid) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600 tabular-nums">
                    {totalDebt > 0 ? formatCurrency(totalDebt) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 print:hidden">
                    <button
                      onClick={() => deleteStudent(student)}
                      disabled={deleting === student.id}
                      className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>

        {filtered.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">
                TOPLAM ({filtered.length} öğrenci{selectedSinif ? ` · ${selectedSinif}` : ""})
              </td>
              {months.map((mo) => {
                const paidCount = filtered.filter((s) => s.payments[mo.key]?.paid).length
                return (
                  <td key={mo.key} className="px-4 py-3 text-center">
                    <span className="text-xs text-slate-500">{paidCount}/{filtered.length} ödedi</span>
                  </td>
                )
              })}
              <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(totalCollected)}</td>
              <td className="px-4 py-3 text-right font-bold text-red-700 tabular-nums">{formatCurrency(totalMissing)}</td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )}
</div>
  )
}
