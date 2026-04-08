"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit, Trash2, Mail } from "lucide-react"
import { toast } from "sonner"
import { BUSINESSES } from "@/lib/constants"

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  businesses: string[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  manager: "Müdür",
  staff: "Personel",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("staff")
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((data) => {
      setUsers(Array.isArray(data) ? data : [])
    }).finally(() => setFetching(false))
  }, [])

  function openNew() {
    setEditingUser(null)
    setName(""); setEmail(""); setPassword(""); setRole("staff"); setSelectedBizIds([])
    setShowForm(true)
  }

  function openEdit(user: UserRow) {
    setEditingUser(user)
    setName(user.name); setEmail(user.email); setPassword(""); setRole(user.role)
    setSelectedBizIds(user.businesses.includes("TUM") ? [] : user.businesses)
    setShowForm(true)
  }

  function toggleBiz(bizId: string) {
    setSelectedBizIds((prev) =>
      prev.includes(bizId) ? prev.filter((id) => id !== bizId) : [...prev, bizId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { toast.error("Ad ve e-posta zorunlu"); return }
    if (!editingUser && !password) { toast.error("Şifre zorunlu"); return }

    setLoading(true)
    try {
      const body: any = { name, email, role, businesses: role === "admin" ? [] : selectedBizIds }
      if (password) body.password = password

      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.status === 409) { toast.error("Bu e-posta zaten kullanılıyor"); return }
      if (!res.ok) { toast.error(data.error || "Kaydedilemedi"); return }

      toast.success(editingUser ? "Kullanıcı güncellendi" : "Kullanıcı oluşturuldu")
      setShowForm(false)
      fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : []))
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Kullanıcı silindi")
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } else {
      toast.error("Silinemedi")
    }
  }

  if (fetching) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} kayıtlı kullanıcı</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteUser(user.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {user.role === "admin" ? (
                  <Badge variant="outline" className="text-xs">Tüm İşletmeler</Badge>
                ) : user.businesses.includes("TUM") ? (
                  <Badge variant="outline" className="text-xs">Tüm İşletmeler</Badge>
                ) : user.businesses.length > 0 ? (
                  user.businesses.map((bizId) => {
                    const biz = BUSINESSES.find((b) => b.id === bizId)
                    return <Badge key={bizId} variant="outline" className="text-xs">{biz?.name ?? bizId}</Badge>
                  })
                ) : (
                  <span className="text-xs text-muted-foreground">İşletme atanmamış</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-3 text-center py-10">Kullanıcı yok</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Ad Soyad *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{editingUser ? "Yeni Şifre (boş bırakırsa değişmez)" : "Şifre *"}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Yönetici</SelectItem>
                  <SelectItem value="manager">Müdür</SelectItem>
                  <SelectItem value="staff">Personel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role !== "admin" && (
              <div className="space-y-1.5">
                <Label>İşletme Erişimi</Label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESSES.map((biz) => (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => toggleBiz(biz.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedBizIds.includes(biz.id)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      {biz.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Hiç seçmezsen tüm işletmelere erişir</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>İptal</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
