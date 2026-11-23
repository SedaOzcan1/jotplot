import { expect, test, type Page } from '@playwright/test'
import {
  CORS_HEADERS as CORS,
  createTestUser,
  fakeProcessNote,
  PROCESS_NOTE_URL as FUNCTION_URL,
  signInThroughForm,
  signedOut,
} from './helpers'

// Each test uses its own user. The AI function is replaced by a stand-in that saves a fixed
// result for the user, so tests never call Claude.
test.use({ storageState: signedOut })

const NOTE_TEXT = 'Kampanya toplantısı: Elif görselleri cumaya hazırlayacak. Lansman ertelendi.'

async function signInAsNewUser(page: Page) {
  const user = await createTestUser('result')
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  return user
}

async function writeNote(page: Page, button: 'Notu kaydet' | 'Görevleri çıkar') {
  await page.goto('/notes/new')
  await expect(page.getByRole('button', { name: button })).toBeEnabled()
  await page.getByLabel('Not', { exact: true }).fill(NOTE_TEXT)
  await page.getByRole('button', { name: button }).click()
}

test('a note saved without AI can be processed later from its page', async ({ page }) => {
  const user = await signInAsNewUser(page)
  await page.route(FUNCTION_URL, fakeProcessNote(user))

  await writeNote(page, 'Notu kaydet')
  await expect(page).toHaveURL(/\/notes$/)
  const card = page.getByRole('list', { name: 'Notlar' }).getByRole('link')
  await expect(card).toContainText('Henüz işlenmedi')

  await card.click()
  await expect(page.getByText('Bu not henüz işlenmedi')).toBeVisible()
  await page.getByRole('button', { name: 'Görevleri çıkar' }).click()

  await expect(
    page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem'),
  ).toHaveCount(2)
})

test('"Görevleri çıkar" shows the result; the user edits it and adds tasks to the board', async ({
  page,
}) => {
  const user = await signInAsNewUser(page)
  await page.route(FUNCTION_URL, fakeProcessNote(user))

  await writeNote(page, 'Görevleri çıkar')
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)

  const tasks = page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem')
  await expect(tasks).toHaveCount(2)
  await expect(page.getByRole('textbox', { name: 'Özet' })).toHaveValue(
    'Lansman iki hafta ertelendi.',
  )
  await expect(page.getByLabel('Karar 1', { exact: true })).toHaveValue('Lansman ertelendi')
  await expect(tasks.nth(0).getByLabel('Sorumlu')).toHaveValue('Elif')
  await expect(tasks.nth(0).getByLabel('Tarih')).toHaveValue('2026-11-20')

  // Edit the first task, remove the second, add one by hand.
  await tasks.nth(0).getByLabel('Görev 1', { exact: true }).fill('Lansman görsellerini hazırla')
  await page.getByRole('button', { name: 'Görev 2 sil' }).click()
  await page.getByRole('button', { name: 'Görev ekle' }).click()
  await tasks.nth(1).getByLabel('Görev 2', { exact: true }).fill('Ajansla toplantı ayarla')

  await page.getByRole('button', { name: 'Panoya ekle' }).click()

  await expect(page.getByText('2 görev panoya eklendi').first()).toBeVisible()
  const boardTasks = page.getByRole('list', { name: 'Panodaki görevler' }).getByRole('listitem')
  await expect(boardTasks).toHaveCount(2)
  await expect(page.getByRole('list', { name: 'Önerilen görevler' })).toHaveCount(0)

  const { data } = await user.supabase
    .from('tasks')
    .select('title, assignee, status')
    .order('position')
  expect(data).toEqual([
    { title: 'Lansman görsellerini hazırla', assignee: 'Elif', status: 'todo' },
    { title: 'Ajansla toplantı ayarla', assignee: null, status: 'todo' },
  ])

  await page.goto('/notes')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('2 görev · 1 karar')
})

test('adding a reprocessed note to the board again asks first', async ({ page }) => {
  const user = await signInAsNewUser(page)
  await page.route(FUNCTION_URL, fakeProcessNote(user))
  await writeNote(page, 'Görevleri çıkar')

  await page.getByRole('button', { name: 'Panoya ekle' }).click()
  const boardTasks = page.getByRole('list', { name: 'Panodaki görevler' }).getByRole('listitem')
  await expect(boardTasks).toHaveCount(2)

  await page.getByRole('button', { name: 'Tekrar dene' }).click()
  await page.getByRole('button', { name: 'Yeniden işle' }).click()
  await expect(
    page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem'),
  ).toHaveCount(2)

  // Cancelling adds nothing.
  await page.getByRole('button', { name: 'Panoya ekle' }).click()
  const warning = page.getByRole('alertdialog', { name: /panoda zaten 2 görev var/ })
  await expect(warning).toContainText('2 görev daha eklenecek')
  await warning.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(warning).toHaveCount(0)
  const countTasks = async () =>
    (await user.supabase.from('tasks').select('id', { count: 'exact', head: true })).count
  expect(await countTasks()).toBe(2)

  // Confirming adds the new tasks next to the old ones.
  await page.getByRole('button', { name: 'Panoya ekle' }).click()
  await warning.getByRole('button', { name: 'Yine de ekle' }).click()
  await expect(page.getByText('2 görev panoya eklendi').first()).toBeVisible()
  await expect(boardTasks).toHaveCount(4)
  expect(await countTasks()).toBe(4)
})

test('a task needs a title before it can go to the board', async ({ page }) => {
  const user = await signInAsNewUser(page)
  await page.route(FUNCTION_URL, fakeProcessNote(user))
  await writeNote(page, 'Görevleri çıkar')

  const tasks = page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem')
  await tasks.nth(0).getByLabel('Görev 1', { exact: true }).fill('   ')
  await page.getByRole('button', { name: 'Panoya ekle' }).click()

  await expect(
    page.getByRole('alert').filter({ hasText: 'her göreve bir başlık yaz' }),
  ).toBeVisible()
  await expect(page.getByText('Görevin bir başlığı olmalı.')).toBeVisible()
  const { count } = await user.supabase.from('tasks').select('id', { count: 'exact', head: true })
  expect(count).toBe(0)
})

test('edits are saved automatically and survive a reload', async ({ page }) => {
  const user = await signInAsNewUser(page)
  await page.route(FUNCTION_URL, fakeProcessNote(user))
  await writeNote(page, 'Görevleri çıkar')

  await page.getByRole('textbox', { name: 'Özet' }).fill('Kendi yazdığım özet')
  await expect(page.getByText('Değişiklikler kaydedildi')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Özet' })).toHaveValue('Kendi yazdığım özet')
})

test('when processing fails the note stays and the user can try again', async ({ page }) => {
  const user = await signInAsNewUser(page)
  let calls = 0
  await page.route(FUNCTION_URL, async (route) => {
    if (route.request().method() === 'POST' && calls++ === 0) {
      return route.fulfill({
        status: 503,
        headers: CORS,
        json: {
          error: {
            code: 'ai_unavailable',
            message: 'AI servisine şu an ulaşılamıyor. Biraz sonra tekrar dene; notun kaydedildi.',
          },
        },
      })
    }
    return fakeProcessNote(user)(route)
  })

  await writeNote(page, 'Görevleri çıkar')

  await expect(
    page.getByRole('alert').filter({ hasText: 'AI servisine şu an ulaşılamıyor' }),
  ).toBeVisible()
  await page.getByText('Notun metni').click()
  await expect(page.locator('details').getByText(NOTE_TEXT)).toBeVisible()

  await page.getByRole('button', { name: 'Tekrar dene' }).click()
  await expect(
    page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem'),
  ).toHaveCount(2)
})
