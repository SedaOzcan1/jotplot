export type AuthMode = 'login' | 'register'

export interface Credentials {
  email: string
  password: string
}

export interface CredentialsError {
  name: keyof Credentials
  message: string
}

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCredentials(
  values: Partial<Credentials>,
  mode: AuthMode,
): CredentialsError[] {
  const errors: CredentialsError[] = []
  const email = values.email?.trim() ?? ''
  const password = values.password ?? ''

  if (!email) {
    errors.push({ name: 'email', message: 'E-posta adresini yaz.' })
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ name: 'email', message: 'Geçerli bir e-posta adresi yaz.' })
  }

  if (!password) {
    errors.push({ name: 'password', message: 'Şifreni yaz.' })
  } else if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
    errors.push({
      name: 'password',
      message: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`,
    })
  }

  return errors
}

/** Error with a machine-readable code, matching Supabase Auth error codes where they exist. */
export class AuthServiceError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'AuthServiceError'
  }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    'Google ile giriş yakında eklenecek. Şimdilik e-posta ve şifreyle devam edebilirsin.',
  invalid_credentials: 'E-posta veya şifre hatalı.',
  email_not_confirmed:
    'E-posta adresin henüz doğrulanmadı. Gelen kutundaki doğrulama bağlantısına tıkla.',
  user_already_exists: 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.',
  email_exists: 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.',
  weak_password: 'Şifre çok zayıf. Daha uzun ve tahmin edilmesi zor bir şifre seç.',
  over_request_rate_limit: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
  over_email_send_rate_limit: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
}

/** Wraps an error returned by Supabase Auth; errors without a code (such as network failures) become `unknown`. */
export function toAuthServiceError(error: { code?: string | null }): AuthServiceError {
  return new AuthServiceError(error.code || 'unknown')
}

const FALLBACK_AUTH_ERROR = 'Bir sorun oluştu. Bağlantını kontrol edip tekrar dene.'

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthServiceError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? FALLBACK_AUTH_ERROR
  }
  return FALLBACK_AUTH_ERROR
}

/**
 * Returns a same-site path to continue to after sign-in. Anything that is not a plain
 * absolute path (for example `//evil.example` or `https://...`) falls back to the notes page.
 */
export function safeRedirectPath(path: unknown, fallback = '/notes'): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback
  if (path.includes('\\') || path === '/login' || path.startsWith('/login?')) return fallback
  return path
}
