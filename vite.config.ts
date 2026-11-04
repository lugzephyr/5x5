import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // Must come before react()
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: {
        // The icon's own black behind it, so launchers that crop it to a circle show no white edge
        preset: {
          ...preset,
          maskable: {
            ...preset.maskable,
            resizeOptions: { fit: 'contain', background: '#0a0a0a' },
          },
          apple: { ...preset.apple, resizeOptions: { fit: 'contain', background: '#0a0a0a' } },
        },
      },
      // Hand-written in public/: the plugin always adds a theme_color, which Android uses for the
      // installed app's navigation bar and which can't follow the device's light/dark setting
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
