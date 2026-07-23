# Google Sheets Kurulum Kılavuzu

Uygulama kalıcı verilerini tek bir Google Sheet dosyasındaki sekmelerde tutar. Sekme
adları ve kolon sıraları uygulama koduyla eşleşmek zorundadır.

## 1. Google Cloud hazırlığı

1. [Google Cloud Console](https://console.cloud.google.com) üzerinde bir proje oluşturun.
2. `APIs & Services → Library` alanından Google Sheets API'yi etkinleştirin.
3. `APIs & Services → Credentials` alanından bir service account oluşturun.
4. Service account içinde `Keys → Add key → Create new key → JSON` yolunu izleyin.
5. İndirilen JSON dosyasını güvenli bir yerde tutun; repoya eklemeyin.

## 2. Google Sheet oluşturma

1. Google Sheets üzerinde yeni bir dosya oluşturun.
2. URL'deki `/d/` ile `/edit` arasındaki değeri `GOOGLE_SHEET_ID` olarak kullanın.
3. Sheet'i JSON dosyasındaki `client_email` adresiyle paylaşın.
4. Service account'a `Editor` yetkisi verin.

## 3. Sekmeler ve kolonlar

Her sekmenin ilk satırı başlık, veriler ikinci satırdan itibaren olmalıdır. Aşağıdaki
adları ve sıraları aynen kullanın.

### `Kullanicilar`

```text
id | email | passwordHash | name | role | businesses
```

### `GunlukGelir`

```text
id | tarih | isletme | nakit | kart | biletNakit | toplamGelir | toplamGider | net | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi | biletKart | kasadanBankaya | bankadanKasaya
```

### `Giderler`

```text
id | gelirKayitId | kategoriId | kategoriAdi | aciklama | tutar | odemeTipi
```

### `Yemek`

```text
id | tarih | isletme | adet | fiyat | toplamTutar | girenKisiId | girenKisiAdi | olusturmaTarihi
```

### `Puantaj`

```text
id | tarih | personelAdi | isletme | saat | yemek | tip | kesinti | notlar | girenKisiId | girenKisiAdi | olusturmaTarihi | mesai
```

### `Ayarlar`

```text
anahtar | deger
```

Önerilen başlangıç değerleri:

```text
yemekFiyati | 50
saatlikUcret | 100
uyariLimiti | 10000
```

### `Personeller`

```text
id | ad | isletmeId | olusturmaTarihi | saatlikUcret | mesaiCarpani
```

`saatlikUcret` değeri `0` ise `Ayarlar` sekmesindeki ortak `saatlikUcret` kullanılır.

### `MaasOdemeleri`

```text
id | haftaBaslangic | haftaBitis | personelAdi | isletme | tutar | odemeYontemi | not | odemeTarihi | kaydedenId | kaydedenAd | haftalikNet | saatlikUcret | normalSaat | mesaiSaat
```

Bu sekme ilk maaş ödemesinde uygulama tarafından otomatik oluşturulabilir. Elle
oluşturulacaksa kolon sırasını değiştirmeyin.

### `KursOgrenci`

```text
id | ad | aylikUcret | olusturmaTarihi | sinif
```

### `KursOdeme`

```text
id | ogrenciId | ay | odendi | tarih
```

`ay` alanı `YYYY-MM`, `odendi` alanı `true` veya `false` olmalıdır.

### `KursGider`

```text
id | tarih | detay | tutar | olusturmaTarihi
```

### `Rezervasyonlar`

```text
id | tarih | gun | saat | not | telefon | ekleyenId | ekleyenAd | olusturmaTarihi | silindi | silenId | silenAd | silmeTarihi | durum | kisiSayisi | sure | musteriNotu
```

`durum` boş, `geldi`, `gelmedi` veya `iptal`; `sure` 30, 45 veya 60 olmalıdır.

### `Hatirlatmalar`

```text
id | aktif | tip | isletme | baslik
```

`aktif` alanı `true` veya `false`, `tip` alanı `gunluk` veya `aylik` olmalıdır.

## 4. İlk admin kullanıcısını oluşturma

Güçlü bir şifre için bcrypt hash üretin:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 10).then(console.log)" "guclu-sifreniz"
```

`Kullanicilar` sekmesine aşağıdaki yapıda bir satır ekleyin:

```text
1 | admin@sirket.com | ÜRETİLEN_HASH | Yönetici | admin | TUM
```

Roller:

- `admin`: tüm yönetim özellikleri
- `manager`: izin verilen işletmelerde operasyon yönetimi
- `staff`: günlük kayıt ve rezervasyon gibi sınırlı özellikler

`businesses` değerleri:

- `TUM`: bütün işletmeler
- `kim-sahne`
- `xp-vr`
- `xp-racing`
- `xp-laser`
- Birden çok erişim için: `xp-racing,xp-vr`

## 5. Ortam değişkenleri

Service account JSON dosyasındaki değerleri `.env.local` içine aktarın:

```env
GOOGLE_SHEET_ID="sheet-id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@proje.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Özel anahtardaki `\n` karakterlerini koruyun. JSON anahtar dosyasını veya gerçek
ortam değişkenlerini Git'e eklemeyin.

## 6. Kontrol

Uygulamayı başlatın:

```bash
npm run dev
```

Admin hesabıyla giriş yaptıktan sonra:

1. `/settings` sayfasının ayarları okuyabildiğini,
2. `/daily-entry` üzerinden test kaydı oluşturulabildiğini,
3. Kaydın ilgili Sheet sekmelerine yazıldığını,
4. `/settings` üzerinden ZIP yedeği alınabildiğini

kontrol edin.
