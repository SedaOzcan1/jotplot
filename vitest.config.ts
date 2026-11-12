import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { domEnvironment: 'happy-dom' },
    },
    include: ['test/nuxt/**/*.test.ts', 'test/unit/**/*.test.ts'],
  },
})
