/**
 * Authentication actions used by the sign-in and sign-up screens.
 *
 * Supabase Auth is connected in T0.3/T0.5. Until then every action fails with
 * `auth_not_configured`, so the screens show a clear message instead of pretending to work.
 */
export function useAuth() {
  function notConfigured(): Promise<never> {
    return Promise.reject(new AuthServiceError('auth_not_configured'))
  }

  return {
    signIn: (credentials: Credentials) => {
      void credentials
      return notConfigured()
    },
    signUp: (credentials: Credentials) => {
      void credentials
      return notConfigured()
    },
    signInWithGoogle: () => notConfigured(),
  }
}
