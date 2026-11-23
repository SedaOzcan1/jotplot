import { expect, test, type Page } from '@playwright/test'
import {
  createTestUser,
  fakeTranscribeAudio,
  signInThroughForm,
  signedOut,
  silentWav,
  TRANSCRIBE_AUDIO_URL,
  type TestUser,
} from './helpers'

// Chromium's fake microphone plays a test tone, so recording works without a real device.
// Files go to the local Supabase Storage; no speech-to-text service is called.
test.use({
  storageState: signedOut,
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
})

const STORAGE_UPLOAD = '**/storage/v1/object/recordings/**'

async function openTab(page: Page, tab: 'Kaydet' | 'Dosya yükle') {
  // The note page starts transcription on its own; these tests are only about saving the audio.
  await page.route(TRANSCRIBE_AUDIO_URL, fakeTranscribeAudio({ outcome: 'ignore' }))
  const user = await createTestUser('audio')
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  // Open the tab by its address: a click before the page is interactive would be lost.
  await page.goto(`/notes/new?tab=${tab === 'Kaydet' ? 'record' : 'upload'}`)
  await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
  return user
}

const consentBox = (page: Page) => page.getByRole('checkbox', { name: /onay/ })

async function savedAudioNotes(user: TestUser) {
  const { data, error } = await user.supabase
    .from('sources')
    .select('id, type, title, storage_path, consent_confirmed_at, status')
    .eq('type', 'audio')
  if (error) throw error
  return data
}

async function storedFiles(user: TestUser) {
  const { data: auth } = await user.supabase.auth.getUser()
  const { data, error } = await user.supabase.storage.from('recordings').list(auth.user!.id)
  if (error) throw error
  return data.map((file) => file.name)
}

test('an audio file is uploaded only after consent and becomes a note', async ({ page }) => {
  const user = await openTab(page, 'Dosya yükle')
  const fileInput = page.locator('input[type="file"]')
  await expect(fileInput).toBeEnabled()

  await page.getByLabel('Dosyanın başlığı (isteğe bağlı)').fill('Müşteri görüşmesi')
  await fileInput.setInputFiles({ name: 'gorusme.wav', mimeType: 'audio/wav', buffer: silentWav() })
  await expect(page.getByText('gorusme.wav')).toBeVisible()

  // A recording asks for consent before it can be uploaded.
  const upload = page.getByRole('button', { name: 'Kaydı yükle' })
  await expect(upload).toBeDisabled()
  await consentBox(page).check()
  await upload.click()

  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  await expect(page.getByText('Kayıt yüklendi').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Müşteri görüşmesi' })).toBeVisible()

  const [note] = await savedAudioNotes(user)
  expect(note).toMatchObject({ type: 'audio', title: 'Müşteri görüşmesi', status: 'pending' })
  expect(note!.consent_confirmed_at).not.toBeNull()
  expect(await storedFiles(user)).toEqual([`${note!.id}.wav`])

  await page.goto('/notes')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('Müşteri görüşmesi')
})

test('files that are not audio or too large are refused before uploading', async ({ page }) => {
  const user = await openTab(page, 'Dosya yükle')
  const fileInput = page.locator('input[type="file"]')
  await expect(fileInput).toBeEnabled()

  await fileInput.setInputFiles({
    name: 'notlar.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('metin'),
  })
  await expect(page.getByRole('alert')).toContainText('Bu dosya türü desteklenmiyor')

  await fileInput.setInputFiles({
    name: 'uzun-kayit.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toContainText('Dosya çok büyük')
  await expect(page.getByRole('button', { name: 'Kaydı yükle' })).toHaveCount(0)
  expect(await savedAudioNotes(user)).toEqual([])
})

test('a failed upload keeps the file and can be tried again', async ({ page }) => {
  const user = await openTab(page, 'Dosya yükle')
  let attempts = 0
  await page.route(STORAGE_UPLOAD, (route) =>
    attempts++ === 0 ? route.abort('connectionreset') : route.continue(),
  )

  const fileInput = page.locator('input[type="file"]')
  await expect(fileInput).toBeEnabled()
  await fileInput.setInputFiles({ name: 'ders.wav', mimeType: 'audio/wav', buffer: silentWav() })
  await consentBox(page).check()
  await page.getByRole('button', { name: 'Kaydı yükle' }).click()

  await expect(page.getByRole('alert')).toContainText('Kayıt yüklenemedi')
  expect(await savedAudioNotes(user)).toEqual([])

  await page.getByRole('button', { name: 'Tekrar dene' }).click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  expect(await savedAudioNotes(user)).toHaveLength(1)
})

test('a browser recording can be paused, finished, and saved', async ({ page }) => {
  const user = await openTab(page, 'Kaydet')
  const start = page.getByRole('button', { name: 'Kaydı başlat' })

  await expect(start).toBeDisabled()
  await consentBox(page).check()
  await start.click()
  // Opening the fake microphone can be slow while many browsers start at once.
  await expect(page.getByText('Kaydediliyor')).toBeVisible({ timeout: 15_000 })

  const timer = page.getByRole('timer', { name: 'Kayıt süresi' })
  await expect(timer).toHaveText('0:02', { timeout: 5000 })

  await page.getByRole('button', { name: 'Duraklat' }).click()
  await expect(page.getByText('Duraklatıldı')).toBeVisible()
  await page.getByRole('button', { name: 'Devam et' }).click()
  await page.getByRole('button', { name: 'Kaydı bitir' }).click()

  await expect(page.getByRole('region', { name: 'Kaydedilecek ses' })).toContainText('Kayıt ·')
  await page.getByRole('button', { name: 'Kaydı yükle' }).click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Ses kaydı' })).toBeVisible()

  const [note] = await savedAudioNotes(user)
  expect(note!.storage_path).toMatch(/\.webm$/)
  expect(await storedFiles(user)).toHaveLength(1)
})

test('switching tabs during a recording keeps it going', async ({ page }) => {
  await openTab(page, 'Kaydet')
  await consentBox(page).check()
  await page.getByRole('button', { name: 'Kaydı başlat' }).click()
  await expect(page.getByText('Kaydediliyor')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: 'Yaz' }).click()
  await page.getByRole('tab', { name: 'Kaydet' }).click()
  await expect(page.getByText('Kaydediliyor')).toBeVisible()
  await expect(page).toHaveURL(/tab=record/)
})
