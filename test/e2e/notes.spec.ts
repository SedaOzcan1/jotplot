import { expect, test, type Page } from '@playwright/test'
import { createTestUser, signInThroughForm, signedOut } from './helpers'

// Each test uses its own user so the shared signed-in user keeps an empty notes list.
test.use({ storageState: signedOut })

async function signInAsNewUser(page: Page) {
  const user = await createTestUser('notes')
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
}

async function openNewNote(page: Page) {
  await page.goto('/notes/new')
  // Wait until the page is interactive; values typed before hydration are reset.
  await expect(page.getByRole('button', { name: 'Notu kaydet' })).toBeEnabled()
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test('a saved note appears at the top of the notes list', async ({ page }) => {
  await signInAsNewUser(page)
  await expect(page.getByRole('heading', { name: 'Henüz notun yok' })).toBeVisible()

  await openNewNote(page)
  await expect(page.getByRole('group', { name: 'Notun modu' })).toBeVisible()
  // The form has its own mode switch, so the mobile top bar does not repeat it.
  await expect(page.getByRole('banner').getByRole('group', { name: 'Mod seçimi' })).toHaveCount(0)
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  await page.getByLabel('Başlık').fill('Haftalık ekip toplantısı')
  await page
    .getByLabel('Not', { exact: true })
    .fill('Ayşe sunumu perşembeye hazırlayacak.\nBütçe onaylandı.')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()

  await expect(page).toHaveURL(/\/notes$/)
  // The toast text is also repeated for screen readers, so take the first match.
  await expect(page.getByText('Not kaydedildi').first()).toBeVisible()

  await openNewNote(page)
  await page
    .getByLabel('Not', { exact: true })
    .fill('\n  Müşteri görüşmesi: teklif cuma gönderilecek.\nDetaylar')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()
  await expect(page).toHaveURL(/\/notes$/)

  const notes = page.getByRole('list', { name: 'Notlar' }).getByRole('listitem')
  await expect(notes).toHaveCount(2)
  // Newest first; a note without a title shows its first line.
  await expect(notes.nth(0).getByRole('heading')).toHaveText(
    'Müşteri görüşmesi: teklif cuma gönderilecek.',
  )
  await expect(notes.nth(1).getByRole('heading')).toHaveText('Haftalık ekip toplantısı')
  await expect(notes.nth(1)).toContainText('Metin')
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})

test('an empty note is not saved', async ({ page }) => {
  await signInAsNewUser(page)
  await openNewNote(page)

  await page.getByLabel('Not', { exact: true }).fill('   ')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()

  await expect(page.getByText('Not metnini yaz ya da yapıştır.')).toBeVisible()
  await expect(page).toHaveURL(/\/notes\/new$/)
})

test('if saving fails the text stays and the user can try again', async ({ page }) => {
  await signInAsNewUser(page)
  await openNewNote(page)
  const text = 'Bağlantı koparsa da kaybolmaması gereken not'

  await page.route('**/rest/v1/sources**', (route) => route.abort('internetdisconnected'))
  await page.getByLabel('Not', { exact: true }).fill(text)
  await page.getByRole('button', { name: 'Notu kaydet' }).click()

  await expect(page.getByRole('alert')).toContainText('Yazdığın metin duruyor')
  await expect(page.getByLabel('Not', { exact: true })).toHaveValue(text)

  await page.unroute('**/rest/v1/sources**')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()

  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByRole('list', { name: 'Notlar' }).getByRole('heading')).toHaveText(text)
})
