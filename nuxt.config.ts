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
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/icon', '@vite-pwa/nuxt'],
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
        { name: 'theme-color', content: '#007AFF' },
        { name: 'apple-mobile-web-app-title', content: 'LifeOS' },
      ],
      link: [
        // ssr:false 下 @vite-pwa/nuxt 不自动注入 manifest link（依赖 NuxtPwaManifest 组件），
        // 此处显式声明，确保浏览器发现 manifest 实现 PWA 可安装。
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', rel: 'stylesheet' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.svg' }
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
      'import.meta.env.NUXT_PUBLIC_COUCHDB_PREFIX': JSON.stringify(process.env.NUXT_PUBLIC_COUCHDB_PREFIX || ''),
    }
  },
  // ssr:false 下 nitro 动态渲染 HTML，无静态 index.html，导致 PWA 断网时 SW 无 HTML 可回退。
  // 预渲染 '/' 生成静态 SPA shell，供 Workbox 预缓存，实现离线首屏。
  nitro: {
    prerender: {
      routes: ['/']
    }
  },
  pwa: {
    // generateSW：由 Workbox 自动生成 Service Worker，无需手写 SW 脚本
    strategies: 'generateSW',
    // autoUpdate：新版本 SW 自动激活并刷新，无需弹窗确认
    registerType: 'autoUpdate',
    manifest: {
      name: 'LifeOS',
      short_name: 'LifeOS',
      description: '个人信息操作系统 — 笔记、记账与待办的本地优先工作空间',
      theme_color: '#007AFF',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'any',
      scope: '/',
      start_url: '/',
      lang: 'zh-CN',
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    },
    workbox: {
      // SPA 离线导航回退：必须对应预缓存中的静态 HTML（nitro.prerender 生成的 index.html）。
      // 注意：用 'index.html'（预缓存中的实际文件名），而非 '/'（路由），否则预缓存命中失败导致断网白屏。
      navigateFallback: 'index.html',
      // /api/* 请求不回退为 HTML，离线时让其正常失败
      navigateFallbackDenylist: [/^\/api\//],
      // 预缓存构建产物（含 SVG 图标）
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      // nitro.prerender 生成的 index.html 时序晚于 vite-plugin-pwa 的 glob 扫描，
      // globPatterns 扫不到，这里显式补充进预缓存清单，供离线导航回退使用。
      // revision 随每次构建变化，确保新 SPA shell（含新 _nuxt hash）被重新缓存。
      additionalManifestEntries: [{ url: 'index.html', revision: String(Date.now()) }],
      // 放宽默认 2MB 限制，避免 pdfjs/xlsx 等大 chunk 被跳过
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        // Google Fonts CSS（项目 app.head 引用 Inter 字体）
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-css',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // Google Fonts 字体文件
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // 注意：CouchDB 同步（跨域 runtimeConfig.public.couchdbUrl）不配置 runtimeCaching，
        // generateSW 不会拦截跨域同步请求，直通网络。
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },
})
