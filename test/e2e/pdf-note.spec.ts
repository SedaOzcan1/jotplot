import { expect, test, type Page } from '@playwright/test'
import {
  createTestUser,
  EXTRACT_PDF_URL,
  fakeExtractPdf,
  fakeProcessNote,
  PROCESS_NOTE_URL,
  signInThroughForm,
  signedOut,
  type TestUser,
} from './helpers'

// Each test uses its own user. The PDF goes to the local Supabase Storage; extract-pdf and
// process-note are replaced by stand-ins, so no function server or AI is needed.
test.use({ storageState: signedOut })

const PDF_TEXT =
  'Veri Yapıları 6. hafta\n\nİkili arama ağaçları anlatıldı. Ödev 3 on yedi Aralık’ta teslim.'

/** A tiny synthetic file with a PDF header; the stand-in does not read it. */
const pdfFile = (name: string, size = 400) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(size)]),
})

async function openUpload(page: Page) {
  const user = await createTestUser('pdf')
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  await page.goto('/notes/new?tab=upload')
  const fileInput = page.locator('input[type="file"]')
  await expect(fileInput).toBeEnabled()
  return { user, fileInput }
}

async function savedPdfNotes(user: TestUser) {
  const { data, error } = await user.supabase
    .from('sources')
    .select('id, title, status, raw_text, consent_confirmed_at')
    .eq('type', 'pdf')
  if (error) throw error
  return data
}

test('a PDF is uploaded without a consent step, read, and can become tasks', async ({ page }) => {
  const { user, fileInput } = await openUpload(page)
  await page.route(EXTRACT_PDF_URL, fakeExtractPdf(user, { text: PDF_TEXT }))
  await page.route(PROCESS_NOTE_URL, fakeProcessNote(user))

  await fileInput.setInputFiles(pdfFile('Veri_Yapilari_6.hafta.pdf'))
  await expect(page.getByText('Veri_Yapilari_6.hafta.pdf')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /onay/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'PDF’i yükle' }).click()

  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  // Named after the file when no title was written.
  await expect(page.getByRole('heading', { name: 'Veri Yapilari 6.hafta' })).toBeVisible()
  const text = page.locator('details').filter({ hasText: 'PDF’in metni' })
  await expect(text).toContainText('İkili arama ağaçları anlatıldı.')

  const [note] = await savedPdfNotes(user)
  expect(note).toMatchObject({ status: 'ready', raw_text: PDF_TEXT, consent_confirmed_at: null })

  // Tasks are extracted only when asked.
  await page.getByRole('button', { name: 'Görevleri çıkar' }).click()
  await expect(
    page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem'),
  ).toHaveCount(2)

  await page.goto('/notes?type=pdf')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('Veri Yapilari 6.hafta')
})

test('the PDF opens in a new tab from its note', async ({ page }) => {
  const { user, fileInput } = await openUpload(page)
  await page.route(EXTRACT_PDF_URL, fakeExtractPdf(user, { text: PDF_TEXT }))

  await fileInput.setInputFiles(pdfFile('ders.pdf'))
  await page.getByRole('button', { name: 'PDF’i yükle' }).click()
  await expect(page.locator('details').filter({ hasText: 'PDF’in metni' })).toBeVisible()

  // Headless Chromium downloads a PDF instead of showing it, so the new tab's request is checked.
  const signedRequest = page
    .context()
    .waitForEvent('request', (request) =>
      /\/storage\/v1\/object\/sign\/documents\//.test(request.url()),
    )
  await page.getByRole('button', { name: 'PDF’i aç' }).click()
  expect((await signedRequest).url()).toContain('.pdf')
})

test('a PDF without readable text explains why', async ({ page }) => {
  const { user, fileInput } = await openUpload(page)
  await page.route(EXTRACT_PDF_URL, fakeExtractPdf(user, { error: 'no_text' }))

  await fileInput.setInputFiles(pdfFile('taranmis.pdf'))
  await page.getByRole('button', { name: 'PDF’i yükle' }).click()

  const alert = page.getByRole('alert').filter({ hasText: 'PDF okunamadı' })
  await expect(alert).toContainText('seçilebilir metin bulunamadı')
  await expect(page.getByRole('button', { name: 'Görevleri çıkar' })).toHaveCount(0)
  expect((await savedPdfNotes(user))[0]).toMatchObject({ status: 'failed', raw_text: null })
})

test('a PDF over 10 MB is refused before uploading', async ({ page }) => {
  const { user, fileInput } = await openUpload(page)

  await fileInput.setInputFiles(pdfFile('kitap.pdf', 10 * 1024 * 1024))
  await expect(page.getByRole('alert')).toContainText('PDF çok büyük')
  await expect(page.getByRole('button', { name: 'PDF’i yükle' })).toHaveCount(0)
  expect(await savedPdfNotes(user)).toEqual([])
})
