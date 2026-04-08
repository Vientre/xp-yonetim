"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { formatDateTime, getLogActionName } from "@/lib/utils"

interface Log {
  id: string
  action: string
  entityType: string
  entityId?: string
  description?: string
  createdAt: string
  user: { name: string; email: string }
  business?: { name: string }
}

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  CREATE: "bg-blue-100 text-blue-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  RESTORE: "bg-purple-100 text-purple-700",
  EXPORT: "bg-orange-100 text-orange-700",
  APPROVE: "bg-emerald-100 text-emerald-700",
  REJECT: "bg-rose-100 text-rose-700",
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")

  async function fetchLogs() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "50" })
    if (entityType) params.set("entityType", entityType)
    try {
      const res = await fetch(`/api/logs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setLogs(json.logs)
        setTotal(json.total)
        setTotalPages(json.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, entityType])

  const entityTypes = [
    "DailyClosing", "ExpenseEntry", "MealOrder", "Employee", "AttendanceRecord",
    "User", "Business", "Settings"
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aktivite Logları</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Toplam {total} kayıt
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1 w-44">
              <p className="text-xs text-muted-foreground">Tür</p>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Tüm türler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Türler</SelectItem>
                  {entityTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Log Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Zaman</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Kullanıcı</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Aksiyon</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tür</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Açıklama</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İşletme</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground">
                        Log kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium">{log.user.name}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                              actionColors[log.action] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getLogActionName(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{log.entityType}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                          {log.description ?? "-"}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{log.business?.name ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Sayfa {page} / {totalPages} ({total} kayıt)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
