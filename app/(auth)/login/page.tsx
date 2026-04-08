"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema } from "@/lib/validations"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2, Lock, Mail } from "lucide-react"
import { toast } from "sonner"

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("E-posta veya şifre hatalı")
        return
      }

      toast.success("Giriş başarılı")
      router.push(callbackUrl)
      router.refresh()
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyin")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Başlık */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">XP Yönetim Sistemi</h1>
          <p className="text-sm text-gray-500 mt-1">Çok işletmeli yönetim paneli</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Giriş Yap</CardTitle>
            <CardDescription>Kullanıcı adı ve şifrenizle giriş yapın</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@sirket.com"
                    className="pl-9"
                    autoComplete="email"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>

            {/* Demo bilgi */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Hesaplar</p>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <DemoAccount
                  role="Yönetici"
                  email="admin@xpmanagement.com"
                  password="admin123"
                  color="bg-purple-100 text-purple-700"
                />
                <DemoAccount
                  role="Müdür"
                  email="mudur@xpmanagement.com"
                  password="manager123"
                  color="bg-blue-100 text-blue-700"
                />
                <DemoAccount
                  role="Personel"
                  email="personel1@xpmanagement.com"
                  password="staff123"
                  color="bg-green-100 text-green-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DemoAccount({
  role,
  email,
  password,
  color,
}: {
  role: string
  email: string
  password: string
  color: string
}) {
  return (
    <div className={`rounded-md px-3 py-2 ${color}`}>
      <span className="font-semibold">{role}:</span> {email} / {password}
    </div>
  )
}
