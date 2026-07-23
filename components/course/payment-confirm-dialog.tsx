import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PendingPaymentToggle } from "./types"

export function PaymentConfirmDialog({ pending, onConfirm, onCancel }: {
  pending: PendingPaymentToggle
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm animate-in rounded-2xl bg-white p-6 shadow-2xl duration-150 fade-in zoom-in-95">
        <div className="mb-4 flex items-start gap-3">
          <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", pending.newPaid ? "bg-emerald-100" : "bg-red-100")}>
            <AlertTriangle className={cn("h-5 w-5", pending.newPaid ? "text-emerald-600" : "text-red-600")} />
          </div>
          <div><h3 className="text-base font-semibold text-slate-900">Emin misiniz?</h3><p className="mt-0.5 text-sm text-slate-500"><strong>{pending.studentName}</strong> — <strong>{pending.monthLabel}</strong></p></div>
          <button type="button" onClick={onCancel} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-5 text-sm text-slate-600">{pending.newPaid ? "Bu ay ödeme yapıldı olarak işaretlenecek." : "Bu ay ödeme ödenmedi olarak geri alınacak."}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>İptal</Button>
          <Button size="sm" className={pending.newPaid ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={onConfirm}>{pending.newPaid ? "✓ Ödendi Yap" : "✗ Geri Al"}</Button>
        </div>
      </div>
    </div>
  )
}
