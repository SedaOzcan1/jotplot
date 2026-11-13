// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-27',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  // Light theme only until dark mode is designed (open decision in docs/PRODUCT.md).
  ui: { colorMode: false },
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
  // Reads SUPABASE_URL and SUPABASE_KEY (publishable/anon key only) from the environment.
  supabase: {
    // Route protection is added in T0.5 together with working sign-in.
    redirect: false,
    // Generated from the local database with `npm run db:types`.
    types: '~/types/database.types.ts',
  },
  typescript: {
    strict: true,
  },
})
