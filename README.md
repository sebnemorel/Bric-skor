# Briç Skor

Duplicate briç turnuvaları için açık kaynak, telefondan kullanılabilen skor giriş sistemi.
Pahalı skor cihazlarına ücretsiz bir alternatif olması hedefleniyor.

## Özellikler

- [x] Kontrat puanı hesaplama (kontr/rekontr, vulnerability, şlemler, batma cezaları)
- [x] Board numarasından dağıtıcı ve vulnerability
- [x] Mobil uyumlu skor hesaplayıcı ekranı
- [x] Turnuva kurulumu (Mitchell / skip Mitchell hareketi, tek çift sayısında oturan çift)
- [ ] Masa ekranı ve skor girişi
- [ ] Matchpoint / IMP hesaplama ve sıralama
- [ ] Çoklu cihaz (gerçek zamanlı senkronizasyon)
- [ ] PWA ve Android uygulaması

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
    storage.ts         # turnuvayı tarayıcıya kaydetme
  components/
    Calculator.tsx     # skor hesaplayıcı ekranı
    Tournament.tsx     # turnuva kurulumu ve tur tablosu
  App.tsx              # sekmeler
```

## Teknolojiler

React, TypeScript, Vite, Tailwind CSS, Vitest
