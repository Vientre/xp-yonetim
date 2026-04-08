# XP Yönetim Sistemi - Kurulum Rehberi

## Gereksinimler
- Node.js 18+
- PostgreSQL 14+

## 1. Veritabanı Hazırlama

PostgreSQL'de veritabanı oluşturun:
```sql
CREATE DATABASE xp_management;
```

## 2. Ortam Değişkenleri

`.env` dosyasını düzenleyin:
```
DATABASE_URL="postgresql://postgres:SIFRENIZ@localhost:5432/xp_management"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="guclu-bir-secret-en-az-32-karakter"
```

## 3. Veritabanı Migration

```bash
# Tabloları oluştur
npm run db:push

# Demo verileri yükle
npm run db:seed
```

## 4. Uygulamayı Başlat

```bash
npm run dev
```

Tarayıcıda http://localhost:3000 adresini açın.

---

## Demo Hesaplar

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Yönetici | admin@xpmanagement.com | admin123 |
| Müdür | mudur@xpmanagement.com | manager123 |
| Personel | personel1@xpmanagement.com | staff123 |
| Personel | personel2@xpmanagement.com | staff123 |

---

## Modüller

- **Dashboard** — Tüm roller için özet istatistikler ve grafikler
- **Günlük Kayıt** — Nakit/kart/bilet gelir ve gider girişi
- **Yemek Siparişi** — Müdür/Yönetici için günlük yemek siparişi
- **Puantaj** — Personel devam takibi ve ödeme hesaplama
- **Çalışanlar** — Personel kartları ve maaş yönetimi
- **Raporlar** — Gelir-gider, personel ödemesi, yemek özeti (CSV export)
- **Kullanıcılar** — Kullanıcı ve yetki yönetimi (Yönetici)
- **Loglar** — Tüm işlem logları (Yönetici)
- **Ayarlar** — Sistem parametreleri (Yönetici)

## Faydalı Komutlar

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Üretim build
npm run db:push      # Schema'yı DB'ye uygula
npm run db:seed      # Demo veri yükle
npm run db:studio    # Prisma Studio (veritabanı görüntüleyici)
npm run db:reset     # DB'yi sıfırla ve yeniden seed et
```
