// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-27',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: 'Jotplot',
      meta: [
        {
          name: 'description',
          content: 'Toplantı notlarını görevlere dönüştüren AI destekli not ve planlama asistanı.',
        },
      ],
    },
  },
  typescript: {
    strict: true,
  },
})
