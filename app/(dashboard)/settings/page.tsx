"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings, Save, Plus, Trash2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Category { id: string; name: string; color: string; isActive: boolean; isDefault: boolean }
interface Business {
  id: string; name: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("#6366f1")

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/expense-categories").then((r) => r.json()),
      fetch("/api/businesses").then((r) => r.json()),
    ]).then(([s, c, b]) => {
      setSettings(s)
      setCategories(c)
      setBusinesses(b)
    }).finally(() => setFetching(false))
  }, [])

  async function saveSettings() {
    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success("Ayarlar kaydedildi")
      else toast.error("Kaydedilemedi")
    } finally {
      setLoading(false)
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const res = await fetch("/api/expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, color: newCatColor }),
    })
    if (res.ok) {
      toast.success("Kategori eklendi")
      setNewCatName("")
      fetch("/api/expense-categories").then((r) => r.json()).then(setCategories)
    }
  }

  if (fetching) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sistem parametrelerini yönetin</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="categories">Gider Kategorileri</TabsTrigger>
          <TabsTrigger value="businesses">İşletmeler</TabsTrigger>
        </TabsList>

        {/* Genel Ayarlar */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Sistem Parametreleri
              </CardTitle>
              <CardDescription>Uygulama genelinde geçerli ayarlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yemek */}
                <div className="space-y-1.5">
                  <Label>Yemek Birim Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.yemekFiyati ?? "50"}
                    onChange={(e) => setSettings((s: any) => ({ ...s, yemekFiyati: e.target.value }))}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">Yemek siparişinde varsayılan birim fiyat</p>
                </div>

                {/* Saatlik Ücret */}
                <div className="space-y-1.5">
                  <Label>Varsayılan Saatlik Ücret (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.saatlikUcret ?? "100"}
                    onChange={(e) => setSettings((s: any) => ({ ...s, saatlikUcret: e.target.value }))}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">Puantaj raporlarında referans saatlik ücret</p>
                </div>

                {/* Yüksek Tutar Uyarı */}
                <div className="space-y-1.5">
                  <Label>Yüksek Tutar Uyarı Limiti (₺)</Label>
                  <Input
                    type="number"
                    value={settings.uyariLimiti ?? "10000"}
                    onChange={(e) => setSettings((s: any) => ({ ...s, uyariLimiti: e.target.value }))}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">Bu tutarın üzerinde uyarı göster</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                {[
                  {
                    key: "require_day_close",
                    label: "Gün Sonu Kapanış Zorunlu",
                    desc: "Personelin günü kapatması zorunlu olsun",
                  },
                  {
                    key: "allow_edit_old_records",
                    label: "Eski Kayıt Düzenlemeye İzin Ver",
                    desc: "Personel geçmiş kayıtlarını düzenleyebilsin",
                  },
                  {
                    key: "require_manager_approval",
                    label: "Müdür Onayı Gereksin",
                    desc: "Personel kayıtları müdür onayına gitsin",
                  },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{setting.label}</p>
                      <p className="text-xs text-muted-foreground">{setting.desc}</p>
                    </div>
                    <Switch
                      checked={settings[setting.key] === "true"}
                      onCheckedChange={(v) =>
                        setSettings((s: any) => ({ ...s, [setting.key]: String(v) }))
                      }
                    />
                  </div>
                ))}
              </div>

              <Button onClick={saveSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gider Kategorileri */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gider Kategorileri</CardTitle>
              <CardDescription>{categories.length} kategori mevcut</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Yeni Kategori */}
              <div className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Yeni Kategori Adı</Label>
                  <Input
                    placeholder="Örn: Sigorta"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Renk</Label>
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="h-9 w-16 rounded border cursor-pointer"
                  />
                </div>
                <Button onClick={addCategory}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ekle
                </Button>
              </div>

              {/* Kategori Listesi */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2.5 border rounded-lg bg-white"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm flex-1 truncate">{cat.name}</span>
                    {cat.isDefault && (
                      <Badge variant="secondary" className="text-xs">Varsayılan</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* İşletmeler */}
        <TabsContent value="businesses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                İşletme Listesi
              </CardTitle>
              <CardDescription>{businesses.length} işletme kayıtlı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {businesses.map((biz) => (
                  <div key={biz.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <p className="font-medium text-sm">{biz.name}</p>
                    <Badge variant="outline" className="text-xs font-mono">{biz.id}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                İşletmeler sabit tanımlıdır. Değiştirmek için <code className="bg-gray-100 px-1 rounded">lib/constants.ts</code> dosyasını düzenleyin.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
