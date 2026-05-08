// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/icon'],
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
    public: {
      apiBase: '/api',
      couchdbUrl: process.env.NUXT_PUBLIC_COUCHDB_URL || '',
      couchdbUsername: process.env.NUXT_PUBLIC_COUCHDB_USERNAME || '',
      couchdbPassword: process.env.NUXT_PUBLIC_COUCHDB_PASSWORD || '',
      couchdbPrefix: process.env.NUXT_PUBLIC_COUCHDB_PREFIX || 'lifeos-',
    }
  },
  vite: {
    define: {
      'import.meta.env.NUXT_PUBLIC_COUCHDB_URL': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_URL || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_USERNAME': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_USERNAME || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_PASSWORD': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_PASSWORD || ''),
      'import.meta.env.NUXT_PUBLIC_COUCHDB_PREFIX': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_PREFIX || 'lifeos-'),
    }
  }
})
