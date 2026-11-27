// Hangi tarayıcıda olduğumuzu bulup, uygulamanın o tarayıcıda nasıl kurulacağını söyler.
// Chrome (Android) ve Edge kendi "Yükle" penceresini açabildiği için (beforeinstallprompt)
// onlarda talimata gerek kalmaz; diğerlerinde adım adım yol gösteririz.

export type Browser =
  | 'ios-inapp' // iPhone'da WhatsApp/Instagram/GitHub gibi bir uygulamanın içindeki tarayıcı
  | 'android-inapp' // Android'de bir uygulamanın içindeki tarayıcı
  | 'ios-safari'
  | 'ios-other' // iPhone'da Chrome, Firefox vb.
  | 'samsung'
  | 'firefox-android'
  | 'miui' // Xiaomi
  | 'huawei'
  | 'opera'
  | 'chrome-android'
  | 'other-android'
  | 'desktop'

// Kimliğine kendi adını ekleyen uygulamalar (Instagram, Facebook, LINE, WhatsApp, GitHub, Twitter/X...)
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|GitHub|Twitter|LinkedInApp|Snapchat|MicroMessenger|TikTok|musical_ly|Telegram/i

export function detectBrowser(ua: string): Browser {
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS) {
    // Uygulama içi tarayıcılar ya kendi adını ekler ya da "Safari/" kısmı olmaz.
    // (WhatsApp/GitHub'ın Safari penceresi kendini tam Safari gibi gösterir; onu ayırt edemeyiz,
    // bu yüzden Safari talimatı da "önce Safari'de aç" uyarısıyla başlar.)
    if (IN_APP.test(ua) || !/Safari\//.test(ua)) return 'ios-inapp'
    // iPhone'daki diğer tarayıcılar kimliklerine kendi adlarını ekler
    return /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA/i.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (!/Android/i.test(ua)) return 'desktop'
  if (IN_APP.test(ua) || /; wv\)/.test(ua)) return 'android-inapp'

  // Sıra önemli: bu tarayıcıların çoğu kimliğinde "Chrome" da yazar
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/Firefox/i.test(ua)) return 'firefox-android'
  if (/MiuiBrowser|XiaoMi/i.test(ua)) return 'miui'
  if (/HuaweiBrowser|HONOR|HMSCore/i.test(ua)) return 'huawei'
  if (/OPR\/|Opera/i.test(ua)) return 'opera'
  if (/Chrome\/\d+/i.test(ua) && !/wv\)|Version\/\d/i.test(ua)) return 'chrome-android'
  return 'other-android'
}

export interface InstallGuide {
  title: string
  steps: string[]
  suggestChrome: boolean // talimat güvenilir değilse Chrome'da açmayı öner
  /** Adımlardan önce gösterilecek uyarı (ör. "önce Safari'de aç") */
  note?: string
  /** "Linki kopyala" butonu göster (başka tarayıcıya yapıştırmak için) */
  copyLink?: boolean
}

export function installGuide(browser: Browser): InstallGuide | null {
  switch (browser) {
    case 'ios-inapp':
      return {
        title: 'iPhone: önce Safari\'de aç',
        note: 'Bu sayfa başka bir uygulamanın (WhatsApp, GitHub, Instagram...) içinde açılmış. Buradan kurulamaz; önce Safari\'de açman gerekiyor.',
        steps: [
          'Ekranın köşesindeki pusula simgesine ya da ••• menüsündeki "Safari\'de aç"a dokun.',
          'O seçenek yoksa aşağıdaki "Linki kopyala"ya dokun, Safari\'yi aç ve linki adres çubuğuna yapıştır.',
          'Safari\'de sayfa açılınca buradaki "Kur" butonuna tekrar dokun.',
        ],
        suggestChrome: false,
        copyLink: true,
      }
    case 'ios-safari':
      return {
        title: 'iPhone / iPad (Safari)',
        note: 'Sayfayı WhatsApp ya da GitHub içinden açtıysan bu adımlar çıkmaz: önce pusula simgesiyle Safari\'de aç.',
        steps: [
          'Adres çubuğunun yanındaki ••• (üç nokta) düğmesine, sonra "Paylaş"a dokun. Eski iPhone\'larda Paylaş düğmesi (yukarı ok olan kare) doğrudan altta durur.',
          'Listeyi aşağı kaydır ve "Ana Ekrana Ekle"yi seç.',
          '"Web Uygulaması Olarak Aç" açık kalsın; sağ üstte "Ekle"ye dokun.',
        ],
        suggestChrome: false,
        copyLink: true,
      }
    case 'ios-other':
      return {
        title: 'iPhone / iPad',
        steps: [
          'Adres çubuğunun sağındaki Paylaş düğmesine (yukarı ok olan kare) dokun.',
          '"Ana Ekrana Ekle"yi seç ve "Ekle"ye dokun.',
          'Bu seçenek yoksa "Linki kopyala"ya dokun, linki Safari\'de aç ve orada kur.',
        ],
        suggestChrome: false,
        copyLink: true,
      }
    case 'android-inapp':
      return {
        title: 'Uygulama içi tarayıcı',
        note: 'Bu sayfa başka bir uygulamanın (WhatsApp, GitHub, Instagram...) içinde açılmış. Buradan kurulamaz; Chrome\'da açman gerekiyor.',
        steps: [
          'Yukarıdaki "Chrome\'da aç ve kur"a dokun.',
          'Chrome açılınca çıkan "Telefona kur" butonuna dokun.',
          'Chrome açılmazsa menüden (⋮) "Tarayıcıda aç"ı seç ya da linki kopyalayıp Chrome\'a yapıştır.',
        ],
        suggestChrome: true,
      }
    case 'samsung':
      return {
        title: 'Samsung Internet',
        steps: [
          'Alttaki ☰ menüsüne dokun.',
          '"Sayfayı ekle" (veya "Ekle") seçeneğine dokun.',
          '"Ana ekran"ı seç ve "Ekle"ye dokun.',
        ],
        suggestChrome: false,
      }
    case 'firefox-android':
      return {
        title: 'Firefox',
        steps: [
          'Sağ üstteki (veya alttaki) ⋮ menüsüne dokun.',
          '"Yükle" ya da "Ana ekrana ekle"yi seç.',
          'Açılan pencerede "Ekle"ye dokun.',
        ],
        suggestChrome: false,
      }
    case 'opera':
      return {
        title: 'Opera',
        steps: ['⋮ menüsüne dokun.', '"Ana ekrana ekle"yi seç ve onayla.'],
        suggestChrome: false,
      }
    case 'miui':
    case 'huawei':
    case 'other-android':
      return {
        title: 'Telefonun kendi tarayıcısı',  // tek dokunuşla kurulumu desteklemiyor
        steps: [
          'Tarayıcının menüsünü aç: sağ üstte ⋮ yoksa sağ altta ⊞ ya da ☰ simgesine dokun.',
          'Menüde "Ana Ekrana Ekle" seçeneğini bul. Simgeler yan yana diziliyse satırı sola kaydırman gerekebilir.',
          'Açılan pencerede "Ekle"ye dokun.',
        ],
        suggestChrome: true,
      }
    case 'chrome-android':
      // Normalde Chrome kendi yükleme penceresini açar; açmazsa elle yol:
      return {
        title: 'Chrome',
        steps: [
          'Sağ üstteki ⋮ menüsüne dokun.',
          '"Uygulamayı yükle" seçeneğine dokun (bazı sürümlerde "Ana ekrana ekle" yazar).',
          'Açılan pencerede "Yükle"ye dokun.',
        ],
        suggestChrome: false,
      }
    case 'desktop':
      return null // bilgisayarda talimat göstermiyoruz
  }
}

/** Uygulama zaten kurulu olarak (tam ekran) mı açıldı? */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari'ye özel
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}
