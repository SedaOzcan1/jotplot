import { expect, test, type Page } from '@playwright/test'
import {
  createTestUser,
  fakeTranscribeAudio,
  type FakeTranscription,
  signInThroughForm,
  signedOut,
  TRANSCRIBE_AUDIO_URL,
  type TestUser,
} from './helpers'

// Each test uses its own user with one uploaded recording. transcribe-audio is replaced by a
// stand-in, so Deepgram is never called; the transcript text is synthetic.
test.use({ storageState: signedOut })

const TRANSCRIPT =
  'Ece mağaza görsellerini cuma gününe kadar hazırlayacak.\nTamam, ben de bülteni yazarım.'

/** Uploads a tiny synthetic file and saves it as an audio note, the way the app does. */
async function createRecording(user: TestUser, title: string) {
  const { data: auth } = await user.supabase.auth.getUser()
  const id = crypto.randomUUID()
  const path = `${auth.user!.id}/${id}.wav`
  const upload = await user.supabase.storage
    .from('recordings')
    .upload(path, new Uint8Array(64), { contentType: 'audio/wav' })
  if (upload.error) throw upload.error
  const note = await user.supabase.from('sources').insert({
    id,
    type: 'audio',
    title,
    storage_path: path,
    consent_confirmed_at: new Date().toISOString(),
  })
  if (note.error) throw note.error
  return id
}

async function openRecording(page: Page, result: FakeTranscription | (() => FakeTranscription)) {
  const user = await createTestUser('stt')
  const id = await createRecording(user, 'Lansman toplantısı kaydı')
  let calls = 0
  await page.route(TRANSCRIBE_AUDIO_URL, async (route) => {
    if (route.request().method() === 'POST') calls++
    return fakeTranscribeAudio(result)(route)
  })
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  await page.goto(`/notes/${id}`)
  return { user, id, calls: () => calls }
}

test('a new recording is transcribed on its own and the transcript appears', async ({ page }) => {
  const { calls } = await openRecording(page, {
    outcome: 'ready',
    text: TRANSCRIPT,
    durationSec: 90,
  })

  await expect(page.getByText('Kaydın yazıya dökülüyor…')).toBeVisible()
  const transcript = page.getByRole('region', { name: /Transkript/ })
  await expect(transcript).toContainText('Ece mağaza görsellerini', { timeout: 10_000 })
  await expect(transcript).toContainText('1:30')
  expect(calls()).toBe(1)

  await page.goto('/notes')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('Transkript hazır')

  await page.goto('/settings')
  await expect(page.getByRole('region', { name: 'Bu ayki kullanım' })).toContainText('1,5 / 30 dk')
})

test('a failed transcription can be tried again', async ({ page }) => {
  let attempt = 0
  await openRecording(page, () =>
    attempt++ === 0 ? { outcome: 'failed' } : { outcome: 'ready', text: TRANSCRIPT },
  )

  await expect(page.getByRole('alert').filter({ hasText: 'Kayıt yazıya dökülemedi' })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: 'Tekrar dene' }).click()
  await expect(page.getByRole('region', { name: /Transkript/ })).toContainText(
    'Tamam, ben de bülteni yazarım.',
    { timeout: 10_000 },
  )
})

test('at the monthly minute limit the recording waits and links to usage', async ({ page }) => {
  await openRecording(page, { outcome: 'limit' })

  await expect(
    page.getByRole('alert').filter({ hasText: 'Bu ayki ses dakikan doldu' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Kullanımı gör' }).click()
  await expect(page).toHaveURL(/\/settings$/)
})
