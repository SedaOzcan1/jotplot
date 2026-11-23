import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

let service: SupabaseClient | undefined

/**
 * A client with the local Supabase service role, for test stand-ins that do what only the server
 * may do (writing transcripts). The key is the local development key that `supabase status`
 * prints (see playwright.config.ts), never a hosted project's key.
 */
export function serviceClient(): SupabaseClient {
  if (service) return service
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL must be set for E2E tests')
  // Read from `supabase status` by playwright.config.ts.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing; is local Supabase running?')
  service = createClient(url, key, { auth: { persistSession: false } })
  return service
}

export const TRANSCRIBE_AUDIO_URL = '**/functions/v1/transcribe-audio'

export type FakeTranscription =
  | { outcome: 'ready'; text: string; durationSec?: number }
  | { outcome: 'failed' }
  | { outcome: 'limit' }
  /** Accepts the request and does nothing, for tests that are not about transcription. */
  | { outcome: 'ignore' }

/**
 * Stands in for the transcribe-audio Edge Function so tests never call Deepgram. Like the real
 * function it answers 202 at once and finishes a moment later in the background, writing the
 * transcript with the service role.
 */
export function fakeTranscribeAudio(result: FakeTranscription | (() => FakeTranscription)) {
  return async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({
        status: 200,
        headers: { ...CORS_HEADERS, 'Access-Control-Allow-Headers': '*' },
      })
    }
    const { sourceId } = route.request().postDataJSON() as { sourceId: string }
    const outcome = typeof result === 'function' ? result() : result
    if (outcome.outcome === 'ignore') {
      return route.fulfill({
        status: 202,
        json: { sourceId, status: 'processing' },
        headers: CORS_HEADERS,
      })
    }
    if (outcome.outcome === 'limit') {
      return route.fulfill({
        status: 429,
        headers: CORS_HEADERS,
        json: {
          error: {
            code: 'limit_reached',
            message:
              'Bu ayki ses dakikan doldu. Kaydın saklanıyor; hakkın yenilenince yazıya dökebilirsin.',
          },
        },
      })
    }

    const db = serviceClient()
    await db.from('sources').update({ status: 'processing' }).eq('id', sourceId)
    await route.fulfill({
      status: 202,
      json: { sourceId, status: 'processing' },
      headers: CORS_HEADERS,
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (outcome.outcome === 'failed') {
      await db.from('sources').update({ status: 'failed' }).eq('id', sourceId)
      return
    }
    const { data: note } = await db.from('sources').select('user_id').eq('id', sourceId).single()
    await db.from('transcripts').upsert(
      {
        user_id: note!.user_id,
        source_id: sourceId,
        text: outcome.text,
        language: 'tr',
        duration_sec: outcome.durationSec ?? 42,
        segments: [],
      },
      { onConflict: 'source_id' },
    )
    await db.rpc('record_stt_usage', {
      p_user_id: note!.user_id,
      p_minutes: (outcome.durationSec ?? 42) / 60,
      p_cost_usd: 0,
    })
    await db.from('sources').update({ status: 'ready' }).eq('id', sourceId)
  }
}
