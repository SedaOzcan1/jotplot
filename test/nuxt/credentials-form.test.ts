import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CredentialsForm from '~/components/CredentialsForm.vue'

const { authMock } = vi.hoisted(() => ({
  authMock: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  },
}))

mockNuxtImport('useAuth', () => () => authMock)

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  email: string,
  password: string,
) {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('input[type="password"]').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('CredentialsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows field errors, keeps the typed email, and does not call the server', async () => {
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'register' } })

    await fillAndSubmit(wrapper, 'elif@example.com', 'short')

    expect(wrapper.text()).toContain('Şifre en az 8 karakter olmalı.')
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'elif@example.com',
    )
    expect(authMock.signUp).not.toHaveBeenCalled()
  })

  it('signs in with the trimmed email', async () => {
    authMock.signIn.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })

    await fillAndSubmit(wrapper, '  elif@example.com ', 'secret12')

    expect(authMock.signIn).toHaveBeenCalledWith({
      email: 'elif@example.com',
      password: 'secret12',
    })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows a Turkish error for wrong credentials and keeps the form filled', async () => {
    authMock.signIn.mockRejectedValue(new AuthServiceError('invalid_credentials'))
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })

    await fillAndSubmit(wrapper, 'elif@example.com', 'wrong-pass')

    expect(wrapper.find('[role="alert"]').text()).toContain('E-posta veya şifre hatalı.')
    expect((wrapper.find('input[type="password"]').element as HTMLInputElement).value).toBe(
      'wrong-pass',
    )
  })

  it('asks the user to check their email when sign-up needs confirmation', async () => {
    authMock.signUp.mockResolvedValue({ needsEmailConfirmation: true })
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'register' } })

    await fillAndSubmit(wrapper, 'elif@example.com', 'secret123')

    const status = wrapper.find('[role="status"]')
    expect(status.text()).toContain('E-postanı kontrol et')
    expect(status.text()).toContain('elif@example.com')
  })

  it('explains that Google sign-in is coming later', async () => {
    authMock.signInWithGoogle.mockRejectedValue(new AuthServiceError('google_not_configured'))
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })

    const google = wrapper.findAll('button').find((b) => b.text().includes('Google ile devam et'))
    await google!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Google ile giriş yakında')
  })

  it('toggles password visibility with an accessible button', async () => {
    const wrapper = await mountSuspended(CredentialsForm, { props: { mode: 'login' } })

    await wrapper.find('button[aria-label="Şifreyi göster"]').trigger('click')

    expect(wrapper.find('button[aria-label="Şifreyi gizle"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.find('input[autocomplete="current-password"]').attributes('type')).toBe('text')
  })
})
