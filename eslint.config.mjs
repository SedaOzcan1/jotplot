// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier writes void elements as <input />; accept that instead of fighting it.
    'vue/html-self-closing': ['warn', { html: { void: 'always' } }],
  },
})
