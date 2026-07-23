# XP Yönetim Sistemi

Google Sheets veri kaynağı kullanan, çok işletmeli operasyon ve muhasebe yönetim paneli.

## Özellikler

- Günlük nakit, kart, bilet, gider ve kasa/banka transfer kaydı
- Dashboard, aylık tablo, rapor ve CSV/ZIP yedekleme
- Personel, puantaj, yemek siparişi ve maaş bordrosu
- Kurs öğrenci/ödeme/gider takibi
- LaserTag rezervasyonları ve müşteri geçmişi
- Admin, manager ve staff rolleriyle işletme bazlı erişim
- WhatsApp ve Telegram bildirimleri
- Anthropic Claude ile aylık finans analizi
- Vercel Cron ile rezervasyon özeti ve hatırlatmalar

## Teknoloji

- Next.js 16, React 19 ve TypeScript
- Tailwind CSS 4, Radix UI ve Recharts
- Auth.js / NextAuth 5
- Google Sheets API
- Zod, AI SDK ve Anthropic

## Hızlı başlangıç

Gereksinimler:

- Node.js 20 veya üzeri
- Bir Google Cloud service account
- Google Sheets API etkin bir Google Cloud projesi
- Uygulamaya veri kaynağı olacak bir Google Sheet

Bağımlılıkları yükleyin:

```bash
npm ci
```

`.env.example` dosyasını `.env.local` olarak kopyalayıp gerekli değerleri doldurun. Ardından:

```bash
npm run dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

Ayrıntılı kurulum için [KURULUM.md](./KURULUM.md), Sheet sekmeleri için
[GOOGLE_SHEETS_KURULUM.md](./GOOGLE_SHEETS_KURULUM.md) dosyasını kullanın.

## Komutlar

```bash
npm run dev     # Geliştirme sunucusu
npm run build   # Üretim derlemesi ve TypeScript kontrolü
npm run start   # Üretim sunucusu
npm run lint    # ESLint kontrolü
npm test        # Otomatik birim testleri
npm run check   # Lint + test + TypeScript kontrolü
```

Uygulama PostgreSQL veya Prisma kullanmaz. Kalıcı veriler Google Sheets üzerinde tutulur.

## Ana dizinler

```text
app/                 Sayfalar ve API route handler'ları
components/          Ortak arayüz ve layout bileşenleri
lib/sheets.ts        Google Sheets veri erişimi
lib/auth.ts          Credentials tabanlı kimlik doğrulama
lib/auth-utils.ts    Rol ve işletme erişim kontrolleri
lib/constants.ts     İşletmeler, kategoriler ve Sheet sekme adları
vercel.json          Zamanlanmış Vercel Cron görevleri
```

## Dağıtım

Vercel projesine `.env.example` içindeki gerekli değişkenleri ekleyin. Google Sheet'i
service account e-posta adresiyle `Editor` yetkisinde paylaşın. Cron uçlarını korumak
için üretimde `CRON_SECRET` tanımlayın.

## Güvenlik sınırları

- Başarısız girişler IP + e-posta ve e-posta bazında 15 dakikada 5 denemeyle sınırlıdır.
- Aylık AI analizi kullanıcı başına 10 dakikada 5 istekle sınırlıdır.
- Bu sınırlar uygulama instance'ının belleğinde tutulur. Tek instance için etkilidir;
  birden fazla Vercel instance'ında tam dağıtık koruma gerektiğinde Redis tabanlı bir
  limiter kullanılmalıdır.
