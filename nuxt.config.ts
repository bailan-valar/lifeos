// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

// Vite plugin to polyfill 'self' with 'globalThis' for pouchdb-browser (client-side)
function selfPolyfillPlugin() {
  return {
    name: 'self-polyfill',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Check if this is a pouchdb file
      const pouchPattern = /[\\/]node_modules[\\/](pouchdb-browser|pouchdb-find|pouchdb-replication)[\\/]/
      if (pouchPattern.test(id)) {
        // Replace 'self' with 'globalThis' using word boundary to avoid obj.self
        const transformed = code.replace(/\bself\b/g, 'globalThis')
        if (transformed !== code) {
          return {
            code: transformed,
            map: null
          }
        }
      }
    }
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/icon'],
  icon: {
    // 使用本地图标集，避免 CDN 加载延迟
    clientBundle: {
      include: ['solar'],
      scan: true,
    },
  },
  ssr: false,
  app: {
    head: {
      title: 'LifeOS',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', rel: 'stylesheet' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: '',
    jwtSecret: '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    public: {
      apiBase: '/api',
      couchdbUrl: process.env.NUXT_PUBLIC_COUCHDB_URL || '',
      couchdbUsername: process.env.NUXT_PUBLIC_COUCHDB_USERNAME || '',
      couchdbPassword: process.env.NUXT_PUBLIC_COUCHDB_PASSWORD || '',
      couchdbPrefix: process.env.NUXT_PUBLIC_COUCHDB_PREFIX || 'lifeos-',
    }
  },
  vite: {
    plugins: [selfPolyfillPlugin],
    server: {
      // HMR 配置会自动适配本地开发，无需手动指定
      // 生产环境部署时通过环境变量覆盖
      allowedHosts: ['company-dev.capdien.site'],
    },
    define: {
      'import.meta.env.NUXT_PUBLIC_COUCHDB_URL': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_URL || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_USERNAME': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_USERNAME || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_PASSWORD': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_PASSWORD || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_PREFIX': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_PREFIX || 'lifeos-'),
    }
  }
})
