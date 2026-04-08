import { Card, CardContent } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  isCurrency?: boolean
  trend?: number
  icon?: React.ReactNode
  color?: "default" | "green" | "red" | "blue" | "orange"
  className?: string
}

const colorMap = {
  default: "bg-slate-100 text-slate-600",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-600",
  blue: "bg-blue-100 text-blue-600",
  orange: "bg-orange-100 text-orange-600",
}

export function StatCard({
  title,
  value,
  subtitle,
  isCurrency = false,
  trend,
  icon,
  color = "default",
  className,
}: StatCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(typeof value === "string" ? parseFloat(value) : value)
    : String(value)

  const TrendIcon = trend === undefined ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor = trend === undefined ? "text-gray-400" : trend > 0 ? "text-green-500" : "text-red-500"

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 truncate">{displayValue}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn("p-2.5 rounded-lg ml-3 flex-shrink-0", colorMap[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
