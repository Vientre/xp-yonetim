# XP Yönetim Sistemi — Kurulum

## 1. Gereksinimler

- Node.js 20 veya üzeri
- npm
- Google Sheets API etkin bir Google Cloud projesi
- JSON anahtarı oluşturulmuş bir service account
- Boş veya mevcut bir Google Sheet

PostgreSQL, Prisma veya yerel bir veritabanı gerekmez.

## 2. Projeyi hazırlama

```bash
npm ci
```

## 3. Google Sheets'i hazırlama

[GOOGLE_SHEETS_KURULUM.md](./GOOGLE_SHEETS_KURULUM.md) içindeki adımlarla:

1. Google Sheets API'yi etkinleştirin.
2. Bir service account ve JSON anahtarı oluşturun.
3. Google Sheet'i service account e-posta adresiyle `Editor` olarak paylaşın.
4. Gerekli sekmeleri ve başlık satırlarını oluşturun.
5. En az bir admin kullanıcı ekleyin.

## 4. Ortam değişkenleri

`.env.example` dosyasını `.env.local` adıyla kopyalayın:

```bash
cp .env.example .env.local
```

Zorunlu değerler:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="en-az-32-karakter-rastgele-bir-deger"
GOOGLE_SHEET_ID="google-sheet-id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@proje.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Rastgele bir secret üretmek için:

```bash
openssl rand -base64 32
```

`GOOGLE_PRIVATE_KEY` değerindeki `\n` karakterlerini koruyun ve anahtarı Git'e
eklemeyin.

Opsiyonel entegrasyonlar `.env.example` içinde açıklanmıştır:

- Anthropic aylık analiz
- WhatsApp CallMeBot bildirimleri
- Telegram bildirimleri
- Vercel Cron koruması

## 5. İlk kullanıcı

Bir bcrypt hash üretin:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 10).then(console.log)" "guclu-sifreniz"
```

Çıktıyı `Kullanicilar` sekmesine ekleyin:

```text
id | email | passwordHash | name | role | businesses
1 | admin@sirket.com | ÜRETİLEN_HASH | Yönetici | admin | TUM
```

Üretimde örnek veya varsayılan şifre kullanmayın.

## 6. Çalıştırma

```bash
npm run dev
```

Tarayıcıdan [http://localhost:3000/login](http://localhost:3000/login) adresini açın.

Üretim kontrolü:

```bash
npm run check
npm run build
npm run start
```

## 7. Vercel dağıtımı

1. Repoyu Vercel projesine bağlayın.
2. `.env.example` içindeki zorunlu değerleri Vercel Environment Variables alanına ekleyin.
3. `CRON_SECRET` için güçlü ve rastgele bir değer tanımlayın.
4. Service account e-postasının Google Sheet üzerinde `Editor` olduğunu doğrulayın.
5. Deploy sonrası `/login` ve kritik kayıt akışlarını kontrol edin.

[vercel.json](./vercel.json) iki görevi zamanlar:

- `0 6 * * *`: günlük rezervasyon özeti
- `0 16 * * *`: günlük hatırlatmalar

Vercel cron ifadeleri UTC kullanır. Türkiye sabit UTC+3 olduğundan bunlar sırasıyla
09:00 ve 19:00 İstanbul saatidir.

## 8. Sorun giderme

- `GOOGLE_SHEET_ID ortam değişkeni ayarlanmamış`: `.env.local` değerini kontrol edin.
- Sheet erişim hatası: Sheet'in service account e-postasıyla paylaşıldığını doğrulayın.
- Sekme bulunamadı: Sekme adlarının harf harfine kurulum rehberiyle aynı olduğunu kontrol edin.
- Giriş başarısız: Kullanıcı e-postasını, bcrypt hash'ini ve rol değerini kontrol edin.
- Cron `401/503`: `CRON_SECRET` değerinin Vercel'de tanımlı olduğunu kontrol edin.
