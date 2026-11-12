import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ModeSwitch from '~/components/ModeSwitch.vue'

describe('ModeSwitch', () => {
  it('selects employee mode and keeps student mode disabled for the MVP', async () => {
    const wrapper = await mountSuspended(ModeSwitch)
    const [work, student] = wrapper.findAll('button')

    expect(work!.text()).toContain('Çalışan')
    expect(work!.attributes('aria-pressed')).toBe('true')
    expect(student!.text()).toContain('Öğrenci')
    expect(student!.text()).toContain('yakında')
    expect(student!.attributes('disabled')).toBeDefined()
    expect(student!.attributes('aria-pressed')).toBe('false')
  })

  it('stays in employee mode when the disabled student option is clicked', async () => {
    const wrapper = await mountSuspended(ModeSwitch)
    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
  })
})
