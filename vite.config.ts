import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: telefona "uygulama" olarak kurulabilmesi ve internetsiz çalışması için
    VitePWA({
      registerType: 'prompt', // yeni sürüm inince kullanıcıya "Yenile" şeridi gösterilir (UpdatePrompt.tsx)
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Briç Skor Akdeniz',
        short_name: 'Briç Skor', // ana ekranda simgenin altında görünen kısa ad
        description: 'Duplicate briç turnuvaları için skor giriş sistemi',
        lang: 'tr',
        start_url: '/',
        display: 'standalone', // tarayıcı çubuğu olmadan açılır
        orientation: 'portrait',
        background_color: '#ecfdf5',
        theme_color: '#047857',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // tüm site dosyalarını telefona kaydet → internet yokken de açılır
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
})
