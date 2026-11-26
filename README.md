# Briç Skor Akdeniz

Duplicate briç turnuvaları için açık kaynak, telefondan kullanılabilen skor giriş sistemi.
Pahalı skor cihazlarına ücretsiz bir alternatif olması hedefleniyor.

**Canlı demo:** https://bric-skor-akdeniz.vercel.app

### Telefona kurmak
- **Android (Chrome):** Siteyi aç → ⋮ menü → *Uygulamayı yükle* / *Ana ekrana ekle*
- **iPhone (Safari):** Siteyi aç → Paylaş → *Ana Ekrana Ekle*

Uygulamadaki **"Telefona kur"** butonu, kullandığın tarayıcıya göre yol gösterir.
Kurulduktan sonra internet olmadan da çalışır.

## Özellikler

- [x] Kontrat puanı hesaplama (kontr/rekontr, vulnerability, şlemler, batma cezaları)
- [x] Board numarasından dağıtıcı ve vulnerability
- [x] Mobil uyumlu skor hesaplayıcı ekranı
- [x] Turnuva kurulumu (Mitchell / skip Mitchell hareketi, tek çift sayısında oturan çift)
- [x] Masa ekranı ve skor girişi (pas, düzeltme, silme; skorlar cihazda saklanır)
- [x] Matchpoint hesaplama, K-G / D-B sıralaması ve board detayları
- [x] Oyuncu isimleri ve kategoriler (Açık, Karışık, Kadın, Senyör, Genç), kategoriye göre sıralama
- [ ] IMP hesaplama
- [x] "Masam" modu: masadaki telefon sadece kendi masasını görür, turlar arası hareket talimatı verir
- [x] Çoklu cihaz: 6 haneli turnuva kodu, her masa kendi telefonundan girer, canlı sıralama, internetsizken bekletme (Supabase)
- [x] PWA (telefona kurulabilir, internetsiz çalışır, yeni sürüm çıkınca "Yenile" şeridi)
- [x] Her tarayıcı için kurulum yardımı (Safari, Samsung Internet, Firefox, telefonun kendi tarayıcısı)
- [ ] Android uygulaması (Play Store)

## Çalıştırma

```bash
npm install
npm run dev     # geliştirme sunucusu
npm test        # puan hesaplama testleri
npm run build   # yayın için derleme
```

## Çoklu cihaz kurulumu (Supabase)

1. [supabase.com](https://supabase.com)'da ücretsiz bir proje aç.
2. SQL Editor'de sırayla `supabase/schema.sql` ve `supabase/02_pairs.sql` dosyalarını çalıştır.
3. `.env.example` dosyasını `.env.local` adıyla kopyala, Project URL ve publishable key'i yaz.
4. Vercel'de aynı iki değişkeni (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) Environment Variables'a ekle.

Bu değişkenler yoksa uygulama "sadece bu telefon" modunda çalışmaya devam eder.

## Proje yapısı

```
src/
  scoring/
    score.ts           # puan hesaplama motoru
    score.test.ts
  tournament/
    movement.ts        # Mitchell hareketi (kim, hangi masada, hangi boardları oynar)
    movement.test.ts
    results.ts         # masa sonuçlarının kaydı
    results.test.ts
    pairs.ts           # çift isimleri ve kategoriler
    pairs.test.ts
    myTable.ts         # "Masam" modu: şu anki tur, tur sonu hareket
    myTable.test.ts
    standings.ts       # matchpoint ve sıralama
    standings.test.ts
    storage.ts         # turnuvayı tarayıcıya kaydetme
  cloud/
    api.ts             # Supabase istekleri (turnuva kur/katıl/sil, skor gönder, canlı dinle)
    sync.ts            # satır dönüşümü, bekleyen değişikliklerin birleştirilmesi
    sync.test.ts
    useCloudSync.ts    # turnuvayı canlı tutan React kancası
  install/
    browser.ts         # tarayıcı algılama ve kurulum talimatları
    InstallBanner.tsx  # "Telefona kur" banner'ı
    UpdatePrompt.tsx   # "Yeni sürüm hazır · Yenile" şeridi
  components/
    ContractForm.tsx   # kontrat / deklaran / sonuç seçimi (ortak)
    Calculator.tsx     # skor hesaplayıcı ekranı
    Tournament.tsx     # kurulum, tur tablosu, masa ve skor girişi
    Standings.tsx      # sıralama ve board detayları
    MyTable.tsx        # masa seçici ve "Masam" ekranı
    Pairs.tsx          # çiftler listesi ve isim düzenleme
    ui.tsx             # küçük ortak parçalar
  tr.ts                # Türkçe sayı ekleri (Masa 2'ye, Masa 3'ten)
  App.tsx              # sekmeler
```

## Teknolojiler

React, TypeScript, Vite, Tailwind CSS, Vitest, vite-plugin-pwa (Workbox), Supabase (Postgres + Realtime), Vercel
