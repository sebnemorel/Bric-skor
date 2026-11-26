# Yapılacaklar

## Sıradaki

- [ ] **Her tarayıcıda telefona kurulabilsin**
  - Sorun: "Uygulamayı yükle" seçeneği sadece Chrome'da (ve birkaç tarayıcıda) çıkıyor.
    Telefonun kendi tarayıcısında (Xiaomi, Huawei, Honor vb.), Samsung Internet'te,
    Firefox'ta ve iPhone Safari'de bu seçenek yok ya da farklı yerde.
  - Çözüm fikri: uygulamanın içine bir **"Telefona kur"** butonu koymak.
    - Tarayıcı destekliyorsa (`beforeinstallprompt`) tek dokunuşla kurulum penceresini açsın.
    - Desteklemiyorsa hangi tarayıcıda olunduğunu algılayıp adım adım talimat göstersin
      (ör. Safari: Paylaş → Ana Ekrana Ekle; Samsung: ☰ → Sayfayı ekle → Ana ekran).
    - Uygulama zaten kuruluysa (standalone modda açıldıysa) buton görünmesin.
  - Uzun vadeli kesin çözüm: Android uygulaması (aşağıda) ile Play Store'dan kurulum.

- [ ] **5. aşama: Çoklu cihaz**
  - Her masa kendi telefonundan skor girsin, sonuçlar ortak veritabanında (Supabase) toplansın.
  - Turnuva kodu ile masaya katılma, canlı sıralama.
  - Aynı boarda iki kişi aynı anda girerse ne olacağı.

## Sonra

- [ ] Android uygulaması (Capacitor ile Play Store)
- [ ] IMP hesaplama (takım turnuvaları için)
- [ ] Howell hareketi (az çiftli akşamlar, 4-8 çift)
- [ ] Sonuçları dışa aktarma: PDF / Excel / WhatsApp'ta paylaşma
- [ ] Çift isimleri ("K-G 3" yerine "Ayşe – Mehmet")

## Notlar

- Skorlar şu an sadece girildiği cihazda saklanıyor; başka telefon göremez (5. aşamada çözülecek).
- Kulüpte gerçek turnuvada paralel deneme yap, hataları ve eksikleri buraya ekle.

## Tamamlananlar

- [x] Puan hesaplama motoru + skor hesaplayıcı
- [x] Turnuva kurulumu (Mitchell / skip Mitchell)
- [x] Masa ekranı ve skor girişi
- [x] Matchpoint ve sıralama
- [x] Canlı yayın: https://bric-skor-akdeniz.vercel.app
- [x] PWA (Chrome'da kurulabilir, internetsiz çalışır)
