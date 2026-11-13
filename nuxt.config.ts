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
    // Signed-out visitors are sent to /login; the page they asked for is restored after sign-in.
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/register'],
      saveRedirectToCookie: true,
    },
    // Generated from the local database with `npm run db:types`.
    types: '~/types/database.types.ts',
  },
  typescript: {
    strict: true,
  },
})
