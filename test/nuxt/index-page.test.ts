import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

describe('index page', () => {
  it('shows the product name and the Turkish placeholder message', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.get('h1').text()).toBe('Jotplot')
    expect(wrapper.text()).toContain(
      'Toplantı notlarını görevlere dönüştüren asistanın hazırlanıyor.',
    )
  })

  it('renders the coming-soon button as disabled', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const button = wrapper.get('button')

    expect(button.text()).toBe('Yakında')
    expect(button.attributes('disabled')).toBeDefined()
  })
})
