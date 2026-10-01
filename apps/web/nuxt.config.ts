import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  routeRules: {
    '/studio/**': { ssr: false },
  },
  i18n: {
    // Runtime config is frozen once the server starts, so this cannot be
    // derived from CAIRN_PUBLIC_URL in code. compose.yml sets
    // NUXT_PUBLIC_I18N_BASE_URL from it instead.
    baseUrl: 'http://localhost:3000',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh-CN.json' },
    ],
  },
  typescript: {
    strict: true,
  },
})
