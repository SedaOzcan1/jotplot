import { expect, test, type Page } from '@playwright/test'
import {
  createTestUser,
  fakeProcessNote,
  fakeTranscribeAudio,
  type FakeTranscription,
  signInThroughForm,
  signedOut,
  PROCESS_NOTE_URL,
  silentWav,
  TRANSCRIBE_AUDIO_URL,
  type TestUser,
} from './helpers'

// Each test uses its own user with one uploaded recording. transcribe-audio is replaced by a
// stand-in, so Deepgram is never called; the transcript text is synthetic.
test.use({ storageState: signedOut })

const TRANSCRIPT =
  'Ece mağaza görsellerini cuma gününe kadar hazırlayacak.\nTamam, ben de bülteni yazarım.'

/** Uploads a tiny synthetic file and saves it as an audio note, the way the app does. */
async function createRecording(user: TestUser, title: string, audio = new Uint8Array(64)) {
  const { data: auth } = await user.supabase.auth.getUser()
  const id = crypto.randomUUID()
  const path = `${auth.user!.id}/${id}.wav`
  const upload = await user.supabase.storage
    .from('recordings')
    .upload(path, audio, { contentType: 'audio/wav' })
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

async function openRecording(
  page: Page,
  result: FakeTranscription | (() => FakeTranscription),
  audio?: Uint8Array,
) {
  const user = await createTestUser('stt')
  const id = await createRecording(user, 'Lansman toplantısı kaydı', audio)
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

/** The transcript is shown in a section that can be opened and closed. */
const transcriptOf = (page: Page) => page.locator('details').filter({ hasText: 'Transkript' })

test('a new recording is transcribed and its tasks are extracted on their own', async ({
  page,
}) => {
  const { calls } = await openRecording(page, {
    outcome: 'ready',
    text: TRANSCRIPT,
    durationSec: 90,
    analysis: {
      summary: 'Mağaza görselleri ve bülten konuşuldu.',
      decisions: ['Bülten haftaya yayımlanacak'],
      tasks: [
        { title: 'Mağaza görsellerini hazırla', assignee: 'Ece' },
        { title: 'Bülteni yaz', assignee: null },
      ],
    },
  })

  await expect(page.getByText('Kaydın yazıya dökülüyor…')).toBeVisible()
  const tasks = page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem')
  await expect(tasks).toHaveCount(2, { timeout: 10_000 })
  await expect(tasks.nth(0).getByLabel('Sorumlu')).toHaveValue('Ece')
  expect(calls()).toBe(1)

  // The transcript stays one click away, with its length.
  await expect(transcriptOf(page)).toContainText('1:30')
  await transcriptOf(page).locator('summary').click()
  await expect(transcriptOf(page)).toContainText('Ece mağaza görsellerini')

  await page.getByRole('button', { name: 'Panoya ekle' }).click()
  await expect(page.getByText('2 görev panoya eklendi').first()).toBeVisible()

  await page.goto('/notes')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('2 görev · 1 karar')

  await page.goto('/settings')
  await expect(page.getByRole('region', { name: 'Bu ayki kullanım' })).toContainText('1,5 / 30 dk')
})

test('without AI requests left, the transcript is ready and tasks can be extracted later', async ({
  page,
}) => {
  const { user } = await openRecording(page, { outcome: 'ready', text: TRANSCRIPT })
  await page.route(PROCESS_NOTE_URL, fakeProcessNote(user))

  await expect(transcriptOf(page)).toContainText('Ece mağaza görsellerini', { timeout: 10_000 })
  await expect(page.getByText('Bu not henüz işlenmedi')).toBeVisible()
  await page.getByRole('button', { name: 'Görevleri çıkar' }).click()

  await expect(
    page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem'),
  ).toHaveCount(2)
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
  await expect(transcriptOf(page)).toContainText('Tamam, ben de bülteni yazarım.', {
    timeout: 10_000,
  })
})

test('at the monthly minute limit the recording waits and links to usage', async ({ page }) => {
  await openRecording(page, { outcome: 'limit' })

  await expect(
    page.getByRole('alert').filter({ hasText: 'Bu ayki ses dakikan doldu' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Kullanımı gör' }).click()
  await expect(page).toHaveURL(/\/settings$/)
})

test('the recording plays, and a turn’s time jumps to that moment', async ({ page }) => {
  await openRecording(
    page,
    {
      outcome: 'ready',
      text: TRANSCRIPT,
      durationSec: 8,
      segments: [
        { start: 0, end: 1.5, speaker: 0, text: 'Günaydın Kaan,' },
        { start: 1.6, end: 2.8, speaker: 0, text: 'rapora bakabildin mi?' },
        { start: 3, end: 5.5, speaker: 1, text: 'Baktım, iade oranı artmış.' },
        { start: 6, end: 7.5, speaker: 0, text: 'Peki, pazartesi konuşalım.' },
      ],
    },
    silentWav(8),
  )

  const turns = page.getByRole('list', { name: 'Transkript' }).getByRole('listitem')
  await expect(turns).toHaveCount(3, { timeout: 10_000 })
  await expect(turns.nth(0)).toContainText('Konuşmacı 1')
  await expect(turns.nth(0)).toContainText('Günaydın Kaan, rapora bakabildin mi?')
  await expect(turns.nth(1)).toContainText('Konuşmacı 2')

  const player = page.getByLabel('Kaydı dinle')
  await expect(player).toBeVisible()
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.duration))
    .toBeGreaterThan(7)

  await page.getByRole('button', { name: '0:03 anından dinle' }).click()
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThanOrEqual(3)
  await expect(turns.nth(1)).toHaveAttribute('aria-current', 'true')
})
