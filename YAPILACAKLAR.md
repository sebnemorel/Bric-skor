# Yapılacaklar

## Sıradaki

- [ ] **5. aşama: Çoklu cihaz**
  - Her masa kendi telefonundan skor girsin, sonuçlar ortak veritabanında (Supabase) toplansın.
  - Turnuva kodu ile masaya katılma, canlı sıralama.
  - Aynı boarda iki kişi aynı anda girerse ne olacağı.

- [ ] **Tarayıcılarda yükleme kısmına detaylı bakılacak**
  - Her tarayıcıda "Telefona kur" akışını gerçek telefonda tek tek dene:
    Chrome, telefonun kendi tarayıcısı (Xiaomi/Huawei/Honor vb.), Samsung Internet, Firefox, Opera, iPhone Safari.
  - Menüdeki seçeneklerin gerçek adlarını kontrol et ve talimatları birebir onlara göre düzelt
    (ör. Chrome'da "Uygulamayı yükle"; telefonun kendi tarayıcısında ⊞ menüsü → satırı kaydır → "Ana Ekrana Ekle").
  - "Chrome'da aç ve kur" butonu: Chrome yüklü değilse ne oluyor? Play Store'a yönlendirmeli mi?
  - Telefonun kendi tarayıcısından "Ana Ekrana Ekle" ile eklenen simge tam ekran mı açılıyor, yoksa tarayıcı içinde mi?
  - Kurulumdan sonra banner gerçekten kayboluyor mu, kontrol et.
  - Kalıcı çözüm: Play Store sürümü (aşağıda).

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
- [x] Her tarayıcıda kurulum: "Telefona kur" banner'ı (Chrome/Edge'de tek dokunuş, diğerlerinde tarayıcıya özel talimat + "Chrome'da aç")
