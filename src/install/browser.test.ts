import { describe, expect, it } from 'vitest'
import { detectBrowser, installGuide } from './browser'

// Gerçek tarayıcı kimliklerinden örnekler
const UA = {
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  miui:
    'Mozilla/5.0 (Linux; U; Android 13; tr-tr; 2201117TG Build/TKQ1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.10.1-gn',
  huawei:
    'Mozilla/5.0 (Linux; Android 12; HarmonyOS; NOH-NX9; HMSCore 6.13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4 Mobile Safari/537.36',
  opera:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 OPR/85.0.0.0',
  webview:
    'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}

describe('tarayıcı algılama', () => {
  it.each([
    ['iosSafari', 'ios-safari'],
    ['iosChrome', 'ios-other'],
    ['chromeAndroid', 'chrome-android'],
    ['samsung', 'samsung'],
    ['firefox', 'firefox-android'],
    ['miui', 'miui'],
    ['huawei', 'huawei'],
    ['opera', 'opera'],
    ['webview', 'other-android'],
    ['desktop', 'desktop'],
  ] as const)('%s → %s', (key, expected) => {
    expect(detectBrowser(UA[key])).toBe(expected)
  })
})

describe('kurulum talimatı', () => {
  it('telefon tarayıcılarının hepsinde talimat var', () => {
    for (const key of Object.keys(UA) as (keyof typeof UA)[]) {
      if (key === 'desktop') continue
      const g = installGuide(detectBrowser(UA[key]))
      expect(g).not.toBeNull()
      expect(g!.steps.length).toBeGreaterThan(0)
    }
  })

  it('bilgisayarda talimat gösterilmez', () => {
    expect(installGuide('desktop')).toBeNull()
  })

  it('telefonun kendi tarayıcısında Chrome önerilir', () => {
    expect(installGuide('miui')!.suggestChrome).toBe(true)
    expect(installGuide('ios-safari')!.suggestChrome).toBe(false)
  })
})
