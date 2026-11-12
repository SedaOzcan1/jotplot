import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EmptyState from '~/components/EmptyState.vue'

const base = { icon: 'i-lucide-inbox', title: 'Henüz notun yok', description: 'Açıklama' }

describe('EmptyState', () => {
  it('renders the title, description, and action link', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { ...base, actionLabel: 'İlk notunu oluştur', actionTo: '/notes/new' },
    })

    expect(wrapper.get('h2').text()).toBe('Henüz notun yok')
    expect(wrapper.text()).toContain('Açıklama')
    const link = wrapper.get('a')
    expect(link.text()).toBe('İlk notunu oluştur')
    expect(link.attributes('href')).toBe('/notes/new')
  })

  it('omits the action when no label or target is given', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: base })

    expect(wrapper.find('a').exists()).toBe(false)
  })
})
