import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CredentialsForm from '~/components/CredentialsForm.vue'

describe('CredentialsForm', () => {
  it('shows field errors and keeps the typed email when validation fails', async () => {
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'register' } })

    await wrapper.find('input[type="email"]').setValue('elif@example.com')
    await wrapper.find('input[type="password"]').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Şifre en az 8 karakter olmalı.')
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'elif@example.com',
    )
  })

  it('explains that sign-in is not ready yet without clearing the form', async () => {
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })

    await wrapper.find('input[type="email"]').setValue('elif@example.com')
    await wrapper.find('input[type="password"]').setValue('secret12')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Giriş henüz hazır değil')
    expect((wrapper.find('input[type="password"]').element as HTMLInputElement).value).toBe(
      'secret12',
    )
  })

  it('toggles password visibility with an accessible button', async () => {
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })
    const toggle = wrapper.find('button[aria-label="Şifreyi göster"]')

    await toggle.trigger('click')

    expect(wrapper.find('button[aria-label="Şifreyi gizle"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.find('input[autocomplete="current-password"]').attributes('type')).toBe('text')
  })
})
