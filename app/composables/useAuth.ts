export interface SignUpResult {
  /** True when Supabase requires the user to confirm their email before a session exists. */
  needsEmailConfirmation: boolean
}

/**
 * Email and password, and Google, authentication through Supabase Auth.
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

  async function signInWithGoogle(): Promise<void> {
    // Sends the browser to Google. Google returns to Supabase, which returns to /confirm; the
    // page the user originally asked for is kept in a cookie by the Supabase module.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: confirmUrl },
    })
    if (error) throw toAuthServiceError(error)
  }

  return { signIn, signUp, signOut, signInWithGoogle }
}
