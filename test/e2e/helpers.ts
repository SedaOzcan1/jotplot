import { createClient } from '@supabase/supabase-js'
import { expect, type Page, type Route } from '@playwright/test'

/** Signed-in browser state shared by the desktop and mobile projects (git-ignored). */
export const authFile = 'test/e2e/.auth/user.json'

export const TEST_PASSWORD = 'e2e-password-123'

/** A unique, synthetic email address for one test run. */
export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

/** Creates a confirmed test user in local Supabase through the public sign-up API. */
export async function createTestUser(prefix = 'e2e') {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY must be set for E2E tests')

  const email = uniqueEmail(prefix)
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase.auth.signUp({ email, password: TEST_PASSWORD })
  if (error) throw error
  // `supabase` is signed in as the new user, so tests can prepare and check their own data.
  return { email, password: TEST_PASSWORD, supabase }
}

/**
 * Fills the sign-in or sign-up form. Waits until the page is interactive (the submit button is
 * enabled once it is), because values typed before hydration are reset.
 */
export async function fillCredentials(page: Page, email: string, password: string) {
  await expect(page.locator('form button[type="submit"]')).toBeEnabled()
  await page.getByLabel('E-posta').fill(email)
  await page.getByLabel('Şifre', { exact: true }).fill(password)
}

export async function signInThroughForm(page: Page, email: string, password: string) {
  await fillCredentials(page, email, password)
  await page.locator('form').getByRole('button', { name: 'Giriş yap' }).click()
}

export const signedOut = { cookies: [], origins: [] }

export async function expectOnLogin(page: Page) {
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Tekrar hoş geldin' })).toBeVisible()
}

export type TestUser = Awaited<ReturnType<typeof createTestUser>>

export const PROCESS_NOTE_URL = '**/functions/v1/process-note'
export const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

/**
 * Stands in for the process-note Edge Function so tests never call Claude: saves a fixed result
 * for the note the way the real function does, as the signed-in test user.
 */
export function fakeProcessNote(user: TestUser) {
  return async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({
        status: 200,
        headers: { ...CORS_HEADERS, 'Access-Control-Allow-Headers': '*' },
      })
    }
    const { sourceId } = route.request().postDataJSON() as { sourceId: string }
    const analysis = {
      summary: 'Lansman iki hafta ertelendi.',
      decisions: ['Lansman ertelendi'],
      concepts: [],
      questions: ['Ajans kim olacak?'],
      proposed_tasks: [
        { title: 'Görselleri hazırla', type: 'task', assignee: 'Elif', due_date: '2026-11-20' },
        { title: 'Bütçeyi güncelle', type: 'task', assignee: null, due_date: null },
      ],
    }
    const saved = await user.supabase
      .from('summaries')
      .upsert({ source_id: sourceId, ...analysis }, { onConflict: 'source_id' })
      .select('id')
      .single()
    if (saved.error) throw saved.error
    await user.supabase.from('sources').update({ status: 'ready' }).eq('id', sourceId)
    await route.fulfill({ json: { sourceId, summaryId: saved.data.id }, headers: CORS_HEADERS })
  }
}
