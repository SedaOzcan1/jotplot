import { describe, expect, it } from 'vitest'
import {
  AuthServiceError,
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  safeRedirectPath,
  toAuthServiceError,
  validateCredentials,
} from '~/utils/auth'

describe('validateCredentials', () => {
  it('accepts a valid email and password', () => {
    expect(
      validateCredentials({ email: 'elif@example.com', password: 'secret12' }, 'login'),
    ).toEqual([])
  })

  it('requires both fields', () => {
    expect(validateCredentials({}, 'login')).toEqual([
      { name: 'email', message: 'E-posta adresini yaz.' },
      { name: 'password', message: 'Şifreni yaz.' },
    ])
  })

  it('treats a whitespace-only email as empty', () => {
    const errors = validateCredentials({ email: '   ', password: 'x' }, 'login')
    expect(errors).toContainEqual({ name: 'email', message: 'E-posta adresini yaz.' })
  })

  it('rejects a malformed email', () => {
    const errors = validateCredentials({ email: 'elif@example', password: 'secret12' }, 'login')
    expect(errors).toEqual([{ name: 'email', message: 'Geçerli bir e-posta adresi yaz.' }])
  })

  it('enforces the minimum password length only when registering', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    const values = { email: 'elif@example.com', password: short }

    expect(validateCredentials(values, 'login')).toEqual([])
    expect(validateCredentials(values, 'register')).toEqual([
      { name: 'password', message: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` },
    ])
    expect(
      validateCredentials({ ...values, password: 'a'.repeat(MIN_PASSWORD_LENGTH) }, 'register'),
    ).toEqual([])
  })
})

describe('authErrorMessage', () => {
  it('maps known auth error codes to Turkish messages', () => {
    expect(authErrorMessage(new AuthServiceError('invalid_credentials'))).toBe(
      'E-posta veya şifre hatalı.',
    )
    expect(authErrorMessage(new AuthServiceError('weak_password'))).toContain('Şifre çok zayıf')
    expect(authErrorMessage(new AuthServiceError('google_not_configured'))).toContain(
      'Google ile giriş yakında',
    )
  })

  it('falls back to a generic message for unknown codes and other errors', () => {
    const fallback = 'Bir sorun oluştu. Bağlantını kontrol edip tekrar dene.'
    expect(authErrorMessage(new AuthServiceError('something_new'))).toBe(fallback)
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toBe(fallback)
    expect(authErrorMessage(undefined)).toBe(fallback)
  })
})

describe('toAuthServiceError', () => {
  it('keeps the Supabase error code and uses unknown when there is none', () => {
    expect(toAuthServiceError({ code: 'invalid_credentials' }).code).toBe('invalid_credentials')
    expect(toAuthServiceError({}).code).toBe('unknown')
    expect(toAuthServiceError({ code: null }).code).toBe('unknown')
  })
})

describe('safeRedirectPath', () => {
  it('keeps same-site paths', () => {
    expect(safeRedirectPath('/board')).toBe('/board')
    expect(safeRedirectPath('/notes/new?x=1')).toBe('/notes/new?x=1')
  })

  it('falls back to the notes page for missing, external, or looping targets', () => {
    for (const value of [
      undefined,
      null,
      '',
      'board',
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
      '/login',
      '/login?next=/board',
    ]) {
      expect(safeRedirectPath(value)).toBe('/notes')
    }
  })
})
