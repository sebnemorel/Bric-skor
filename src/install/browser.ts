// Hangi tarayıcıda olduğumuzu bulup, uygulamanın o tarayıcıda nasıl kurulacağını söyler.
// Chrome (Android) ve Edge kendi "Yükle" penceresini açabildiği için (beforeinstallprompt)
// onlarda talimata gerek kalmaz; diğerlerinde adım adım yol gösteririz.

export type Browser =
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

export function detectBrowser(ua: string): Browser {
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS) {
    // iPhone'daki diğer tarayıcılar kimliklerine kendi adlarını ekler
    return /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA/i.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (!/Android/i.test(ua)) return 'desktop'

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
}

export function installGuide(browser: Browser): InstallGuide | null {
  switch (browser) {
    case 'ios-safari':
      return {
        title: 'iPhone / iPad (Safari)',
        steps: [
          'Alttaki Paylaş butonuna dokun (yukarı ok olan kare).',
          'Listeyi aşağı kaydır ve "Ana Ekrana Ekle"yi seç.',
          'Sağ üstte "Ekle"ye dokun.',
        ],
        suggestChrome: false,
      }
    case 'ios-other':
      return {
        title: 'iPhone / iPad',
        steps: [
          'Adres çubuğundaki ya da menüdeki Paylaş butonuna dokun.',
          '"Ana Ekrana Ekle"yi seç ve "Ekle"ye dokun.',
          'Bu seçenek yoksa siteyi Safari\'de aç ve orada aynı adımları yap.',
        ],
        suggestChrome: false,
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
