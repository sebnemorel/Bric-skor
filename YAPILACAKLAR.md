# Yapılacaklar

## Sıradaki

_Ana plan tamamlandı 🎉 Sıradaki işler aşağıdaki "İyileştirmeler" ve "Sonra" bölümlerinde._

## İyileştirmeler (ana plan bitince)

- [ ] **Turnuva arşivi / takvim**: geçmiş turnuvalar silinmesin, liste halinde görünsün
- [ ] **Herkese açık sonuç sayfası**: uygulama kurmadan linkle açılan, sadece okunan sıralama
- [ ] **Oyuncu arama ve oyuncu sayfası**: bir oyuncunun tüm turnuvalardaki sonuçları

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

## Notlar

- Push'tan sonra Vercel'de yeni kurulum görünmezse: `git commit --allow-empty -m "Vercel'i tetikle"` + `git push`.

- "Diğer telefonlarla paylaş" kapalı kurulan turnuvalar sadece o telefonda kalır.
- Supabase ücretsiz planda 1 hafta kullanılmayan proje uyutulur; panelden tek tıkla uyandırılır.
- Kulüpte gerçek turnuvada paralel deneme yap, hataları ve eksikleri buraya ekle.

## Tamamlananlar

- [x] Puan hesaplama motoru + skor hesaplayıcı
- [x] Turnuva kurulumu (Mitchell / skip Mitchell)
- [x] Masa ekranı ve skor girişi
- [x] Matchpoint ve sıralama
- [x] Canlı yayın: https://bric-skor-akdeniz.vercel.app
- [x] Oyuncu isimleri ve kategoriler: hakem girer, çiftler düzeltebilir; sıralamada isim, kategori ve kategori filtresi
- [x] "Yeni sürüm hazır · Yenile" şeridi: telefondaki uygulama eski sürümde kalmaz
- [x] Uygulama adı "Briç Skor Akdeniz" oldu (kulübün kullandığı bricskor.com ile karışmasın)
- [x] PWA (Chrome'da kurulabilir, internetsiz çalışır)
- [x] Çoklu cihaz (Supabase): 6 haneli kod / linkle katılma, ortak skorlar, canlı güncelleme, internetsizken bekletme
- [x] "Masam" modu: masa seçici, otomatik tur geçişi, tur sonu hareket talimatı (boardlar / D-B nereye)
- [x] Her tarayıcıda kurulum: "Telefona kur" banner'ı (Chrome/Edge'de tek dokunuş, diğerlerinde tarayıcıya özel talimat + "Chrome'da aç")
