import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Business } from "./types"

interface ReportFiltersProps {
  businesses: Business[]
  businessId: string
  from: string
  to: string
  loading: boolean
  onBusinessChange: (value: string) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onPreset: (months: number) => void
  onRefresh: () => void
}

export function ReportFilters({
  businesses,
  businessId,
  from,
  to,
  loading,
  onBusinessChange,
  onFromChange,
  onToChange,
  onPreset,
  onRefresh,
}: ReportFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">İşletme</Label>
            <Select value={businessId} onValueChange={onBusinessChange}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Başlangıç</Label>
            <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bitiş</Label>
            <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} className="w-36" />
          </div>
          <div className="flex gap-2">
            {[
              { label: "Bu Ay", months: 1 },
              { label: "3 Ay", months: 3 },
              { label: "6 Ay", months: 6 },
            ].map((preset) => (
              <Button key={preset.months} variant="outline" size="sm" onClick={() => onPreset(preset.months)} className="text-xs">
                {preset.label}
              </Button>
            ))}
          </div>
          <Button onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Güncelle
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
