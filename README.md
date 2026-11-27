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

- [x] Kontrat puanı hesaplama (kontr/rekontr, vulnerability, işlemler, batma cezaları)
- [x] Board numarasından dağıtıcı ve vulnerability
- [x] Mobil uyumlu skor hesaplayıcı ekranı
- [x] Turnuva kurulumu: Sabit masalar (çiftler yerinde, her masa aynı boardları oynar), Howell (4 çift), Mitchell / skip Mitchell (5+ çift)
- [x] Masa ekranı ve skor girişi (pas, düzeltme, silme; skorlar cihazda saklanır)
- [x] Matchpoint hesaplama, K-G / D-B sıralaması ve board detayları
- [x] Oyuncu isimleri ve kategoriler (Açık, Karışık, Kadın, Senyör, Genç), kategoriye göre sıralama
- [ ] IMP hesaplama
- [x] "Masam" modu: masadaki telefon sadece kendi masasını görür, turlar arası hareket talimatı verir
- [x] Kulüp arşivi: hakem turnuvayı bitirir, skorlar kilitlenir, Arşiv sekmesinde herkes sonuçları görür
- [x] Hakem şifresi: telefon değişse de yönetici yetkisi (turnuvayı silme) geri alınır; 10 yanlış denemede kilit
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
2. SQL Editor'de sırayla `supabase/schema.sql`, `02_pairs.sql`, `03_howell.sql`, `04_movement.sql`, `05_admin_pin.sql` ve `06_archive.sql` dosyalarını çalıştır.
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
    movement.ts        # Sabit masalar, Howell ve Mitchell hareketleri (kim, hangi masada, hangi boardları oynar)
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
    Archive.tsx        # kulüp arşivi (biten turnuvalar)
    ui.tsx             # küçük ortak parçalar
  tr.ts                # Türkçe sayı ekleri (Masa 2'ye, Masa 3'ten)
  App.tsx              # sekmeler
```

## Teknolojiler

React, TypeScript, Vite, Tailwind CSS, Vitest, vite-plugin-pwa (Workbox), Supabase (Postgres + Realtime), Vercel

## Kulüp yöneticisi parolası

Arşivdeki herhangi bir turnuvayı silebilmek için bir yönetici parolası kullanılır.
Parola bu depoda **yoktur**. Sadece Supabase SQL Editor'de, aşağıdaki komutla ayarlanır
(`PAROLAN` yerine kendi parolanı yaz). Veritabanında bcrypt ile şifrelenmiş olarak tutulur:

```sql
insert into public.app_admin (id, master_hash)
values (1, extensions.crypt('PAROLAN', extensions.gen_salt('bf')))
on conflict (id) do update set master_hash = excluded.master_hash, failures = 0;
```

10 yanlış denemeden sonra yönetici girişi kilitlenir. Kilidi açmak için:
`update public.app_admin set failures = 0 where id = 1;`

## Skor onayı (Bridgemate mantığı)

Skor girilince telefon rakip çifte verilir; rakip kontrat, oynayan, yeşil/kırmızı, sonuç ve puanı
kontrol edip **Onayla**'ya basar. Onaylı skoru oyuncular değiştiremez (sunucu da engeller).
Turnuva açıkken sadece hakem, bittikten sonra sadece kulüp yöneticisi parolasıyla (Arşiv → Skorları düzelt)
değiştirilebilir. Yeşil/kırmızı seçilmezse herkes yeşil sayılır.

## Güvenlik sorusu

Yönetici değişiklikleri (turnuva silme, skor düzeltme) kaydedilmeden önce güvenlik sorusu sorulur
("Hakemin ilk evcil hayvanının adı nedir?"). Büyük/küçük harf önemsizdir. Cevap bu depoda **yoktur**;
`09_security_question.sql` çalıştırıldıktan sonra Supabase SQL Editor'de şu komutla ayarlanır
(`CEVAP` yerine cevabı yaz):

```sql
update public.app_admin
set answer_hash = extensions.crypt(public.norm_answer('CEVAP'), extensions.gen_salt('bf')), failures = 0
where id = 1;
```

## Hakem paneli (bilgisayar)

`/hakem` adresinde açılır (ör. `https://bric-skor-akdeniz.vercel.app/hakem`). Kulüp hakem şifresiyle girilir.

- **Oyuncular:** master point numarası, ad soyad, kategori. Tek tek ya da Excel'den yapıştırarak toplu eklenir.
- **Turnuva:** hareket, çift ve board sayısı; çiftler numarayla seçilir, çift kategorisi otomatik hesaplanır.
- **Masa QR'ları:** her masa telefonu kendi QR'ını okutunca doğrudan o turnuvaya ve masaya bağlanır.

Kulüp hakem şifresi bu depoda **yoktur**. `10_players_td.sql` çalıştırıldıktan sonra Supabase SQL Editor'de ayarlanır
(`SIFRE` yerine şifreyi yaz). Kulüp yöneticisi parolası da hakem paneline girer.

```sql
update public.app_admin
set td_hash = extensions.crypt('SIFRE', extensions.gen_salt('bf')), td_failures = 0
where id = 1;
```
