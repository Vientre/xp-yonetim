# Google Sheets Kurulum Kılavuzu

## ADIM 1 — Google Cloud Console

1. https://console.cloud.google.com adresine gidin
2. Yeni bir proje oluşturun (örn: "xp-muhasebe")
3. Sol menüden **APIs & Services → Enable APIs** seçin
4. **Google Sheets API** arayın ve etkinleştirin
5. **APIs & Services → Credentials** → **Create Credentials → Service Account** seçin
6. Service account adı girin (örn: "xp-muhasebe-sa")
7. Oluşturulan service account'a tıklayın → **Keys** sekmesi → **Add Key → JSON** seçin
8. JSON dosyası indirilir (bunu güvende tutun!)

## ADIM 2 — Google Sheet Oluştur

1. https://sheets.google.com adresinde yeni bir sheet oluşturun
2. Sheet adı: "XP Muhasebe" (istediğiniz ad)
3. URL'den Sheet ID'yi kopyalayın:
   `https://docs.google.com/spreadsheets/d/` **BU_KISIM** `/edit`

## ADIM 3 — Sheet'i Service Account ile Paylaş

1. Google Sheet'i açın → **Share** butonuna tıklayın
2. JSON dosyasındaki `client_email` değerini yapıştırın
3. **Editor** izni verin → **Share**

## ADIM 4 — Tab (Sayfa) Oluştur

Sheet'te aşağıdaki sekmeleri oluşturun (tam bu isimlerle):

### Tab 1: `Kullanicilar`
Sütun başlıklarını A1'den itibaren girin:
```
id | email | passwordHash | name | role | businesses
```

### Tab 2: `GunlukGelir`
```
id | tarih | isletme | nakit | kart | bilet | toplamGelir | toplamGider | net | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi
```

### Tab 3: `Giderler`
```
id | gelirKayitId | kategoriId | kategoriAdi | aciklama | tutar
```

### Tab 4: `Yemek`
```
id | tarih | isletme | adet | fiyat | toplamTutar | girenKisiId | girenKisiAdi | olusturmaTarihi
```

### Tab 5: `Puantaj`
```
id | tarih | personelAdi | isletme | durum | girenKisiId | girenKisiAdi | olusturmaTarihi
```

### Tab 6: `Ayarlar`
```
anahtar | deger
```
İlk veri satırına ekleyin:
```
yemekFiyati | 50
```

## ADIM 5 — Kullanıcı Ekle (Şifre Hash'i Üret)

Terminal'de şu komutu çalıştırın:
```bash
node -e "const bcrypt = require('bcryptjs'); Promise.all(['admin123','manager123','staff123'].map(p => bcrypt.hash(p,10))).then(h => h.forEach((h,i) => console.log(['admin123','manager123','staff123'][i], '->', h)))"
```

Çıktıdaki hash değerlerini `Kullanicilar` tabına ekleyin:

| id | email | passwordHash | name | role | businesses |
|---|---|---|---|---|---|
| 1 | admin@sirket.com | $2b$10$... | Yönetici | admin | TUM |
| 2 | mudur@sirket.com | $2b$10$... | Müdür | manager | TUM |
| 3 | personel@sirket.com | $2b$10$... | Personel | staff | xp-racing |

**businesses değerleri:**
- `TUM` → tüm işletmelere erişim
- `kim-sahne` → sadece Kim Sahne
- `xp-vr` → sadece XP VR
- `xp-racing` → sadece XP Racing
- `xp-laser` → sadece XP Laser
- `xp-racing,xp-vr` → birden fazla (virgülle ayır)

## ADIM 6 — .env.local Dosyasını Doldur

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gizli-anahtar-buraya-uzun-rastgele-yaz

GOOGLE_SHEET_ID=buraya-sheet-id-yapistir
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@proje.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nJSON_DOSYASINDAKI_KEY\n-----END RSA PRIVATE KEY-----\n"
```

**ÖNEMLI:** JSON dosyasındaki `private_key` değerini kopyalarken:
- Başındaki ve sonundaki `"` işaretlerini dahil etme
- `\n` karakterleri olduğu gibi kalmalı

## ADIM 7 — Uygulamayı Başlat

```bash
npm run dev
```

Tarayıcıda http://localhost:3000 adresini açın.
Login sayfasında e-posta ve şifrenizle girin.
