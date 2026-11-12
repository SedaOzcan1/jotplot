export interface SignUpResult {
  /** True when Supabase requires the user to confirm their email before a session exists. */
  needsEmailConfirmation: boolean
}

/**
 * Email and password authentication through Supabase Auth.
 * Errors are thrown as `AuthServiceError` so screens can show a Turkish message.
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  const confirmUrl = new URL('/confirm', useRequestURL().origin).toString()

  async function signIn(credentials: Credentials): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw toAuthServiceError(error)
  }

  async function signUp(credentials: Credentials): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: { emailRedirectTo: confirmUrl },
    })
    if (error) throw toAuthServiceError(error)
    return { needsEmailConfirmation: !data.session }
  }

  async function signOut(): Promise<void> {
    // Signs out this browser only; other devices stay signed in.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw toAuthServiceError(error)
  }

  function signInWithGoogle(): Promise<never> {
    // Google sign-in needs OAuth credentials from Google Cloud; it is added in a later step.
    return Promise.reject(new AuthServiceError('google_not_configured'))
  }

  return { signIn, signUp, signOut, signInWithGoogle }
}
