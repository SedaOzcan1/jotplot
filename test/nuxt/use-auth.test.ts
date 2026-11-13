import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  },
}))

mockNuxtImport('useSupabaseClient', () => () => ({ auth }))

const credentials = { email: 'elif@example.com', password: 'secret123' }

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs in with email and password', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })

    await useAuth().signIn(credentials)

    expect(auth.signInWithPassword).toHaveBeenCalledWith(credentials)
  })

  it('turns a Supabase error into an AuthServiceError with its code', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials' } })

    await expect(useAuth().signIn(credentials)).rejects.toMatchObject({
      name: 'AuthServiceError',
      code: 'invalid_credentials',
    })
  })

  it('signs up with a confirmation link back to /confirm', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })

    const result = await useAuth().signUp(credentials)

    expect(result).toEqual({ needsEmailConfirmation: false })
    const [args] = auth.signUp.mock.calls[0]!
    expect(args).toMatchObject(credentials)
    expect(new URL(args.options.emailRedirectTo).pathname).toBe('/confirm')
  })

  it('reports when sign-up needs email confirmation', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })

    await expect(useAuth().signUp(credentials)).resolves.toEqual({ needsEmailConfirmation: true })
  })

  it('signs out only this browser', async () => {
    auth.signOut.mockResolvedValue({ error: null })

    await useAuth().signOut()

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('starts Google sign-in with a return link to /confirm', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })

    await useAuth().signInWithGoogle()

    const [args] = auth.signInWithOAuth.mock.calls[0]!
    expect(args.provider).toBe('google')
    expect(new URL(args.options.redirectTo).pathname).toBe('/confirm')
  })

  it('turns a Google sign-in error into an AuthServiceError', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: { code: 'validation_failed' } })

    await expect(useAuth().signInWithGoogle()).rejects.toMatchObject({
      name: 'AuthServiceError',
      code: 'validation_failed',
    })
  })
})
