# Briç Skor

Duplicate briç turnuvaları için açık kaynak, telefondan kullanılabilen skor giriş sistemi.
Pahalı skor cihazlarına ücretsiz bir alternatif olması hedefleniyor.

**Canlı demo:** https://bric-skor-akdeniz.vercel.app

### Telefona kurmak
- **Android (Chrome):** Siteyi aç → ⋮ menü → *Uygulamayı yükle* / *Ana ekrana ekle*
- **iPhone (Safari):** Siteyi aç → Paylaş → *Ana Ekrana Ekle*

Kurulduktan sonra internet olmadan da çalışır.

## Özellikler

- [x] Kontrat puanı hesaplama (kontr/rekontr, vulnerability, şlemler, batma cezaları)
- [x] Board numarasından dağıtıcı ve vulnerability
- [x] Mobil uyumlu skor hesaplayıcı ekranı
- [x] Turnuva kurulumu (Mitchell / skip Mitchell hareketi, tek çift sayısında oturan çift)
- [x] Masa ekranı ve skor girişi (pas, düzeltme, silme; skorlar cihazda saklanır)
- [x] Matchpoint hesaplama, K-G / D-B sıralaması ve board detayları
- [ ] IMP hesaplama
- [ ] Çoklu cihaz (gerçek zamanlı senkronizasyon)
- [x] PWA (telefona kurulabilir, internetsiz çalışır)
- [ ] Android uygulaması (Play Store)

## Çalıştırma

```bash
npm install
npm run dev     # geliştirme sunucusu
npm test        # puan hesaplama testleri
npm run build   # yayın için derleme
```

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
    standings.ts       # matchpoint ve sıralama
    standings.test.ts
    storage.ts         # turnuvayı tarayıcıya kaydetme
  components/
    ContractForm.tsx   # kontrat / deklaran / sonuç seçimi (ortak)
    Calculator.tsx     # skor hesaplayıcı ekranı
    Tournament.tsx     # kurulum, tur tablosu, masa ve skor girişi
    Standings.tsx      # sıralama ve board detayları
    ui.tsx             # küçük ortak parçalar
  App.tsx              # sekmeler
```

## Teknolojiler

React, TypeScript, Vite, Tailwind CSS, Vitest, vite-plugin-pwa (Workbox), Vercel
