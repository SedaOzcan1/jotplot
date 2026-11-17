import { expect, test, type Page } from '@playwright/test'
import { createTestUser, signInThroughForm, signedOut } from './helpers'

// Each test uses its own user with a few tasks on the default board.
test.use({ storageState: signedOut })

type TestUser = Awaited<ReturnType<typeof createTestUser>>

async function setUpBoard(page: Page) {
  const user = await createTestUser('board')
  const { data: board } = await user.supabase
    .from('boards')
    .select('id')
    .eq('is_default', true)
    .single()
  const { data: note } = await user.supabase
    .from('sources')
    .insert({ type: 'text', title: 'Kampanya toplantısı', raw_text: 'Toplantı notu' })
    .select('id')
    .single()
  // Every row lists the same columns; a column missing from one row would be saved as null.
  const row = (title: string, status: string, position: number, extra = {}) => ({
    board_id: board!.id,
    source_id: null,
    title,
    assignee: null,
    due_date: null,
    status,
    position,
    ...extra,
  })
  const { error } = await user.supabase.from('tasks').insert([
    row('Görselleri hazırla', 'todo', 1, {
      source_id: note!.id,
      assignee: 'Elif',
      due_date: '2026-11-20',
    }),
    row('Bütçeyi güncelle', 'todo', 2, { assignee: 'Can' }),
    row('Rakip analizi', 'doing', 1),
  ])
  if (error) throw error

  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  await page.goto('/board')
  await expect(page.getByText('Görselleri hazırla')).toBeAttached()
  return { user, noteId: note!.id as string }
}

function column(page: Page, title: string) {
  return page.getByRole('list', { name: `${title} görevleri` })
}

async function statusOf(user: TestUser, title: string) {
  const { data } = await user.supabase.from('tasks').select('status').eq('title', title).single()
  return data?.status
}

test('desktop shows three columns and moves a card by drag and drop', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'drag and drop is for desktop')
  const { user } = await setUpBoard(page)

  await expect(page.getByRole('heading', { name: 'Yapılacak · 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Devam Ediyor · 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tamamlandı · 0' })).toBeVisible()

  await page
    .locator('[data-task-id]', { hasText: 'Bütçeyi güncelle' })
    .dragTo(page.getByRole('region', { name: 'Devam Ediyor' }))

  await expect(column(page, 'Devam Ediyor')).toContainText('Bütçeyi güncelle')
  await expect(page.getByRole('heading', { name: 'Devam Ediyor · 2' })).toBeVisible()
  await expect.poll(() => statusOf(user, 'Bütçeyi güncelle')).toBe('doing')

  await page.reload()
  await expect(column(page, 'Devam Ediyor')).toContainText('Bütçeyi güncelle')
})

test('a tap on a card moves it to another column', async ({ page, isMobile }) => {
  const { user } = await setUpBoard(page)

  if (isMobile) {
    // Phones show one column at a time with tabs.
    await expect(page.getByRole('tab', { name: 'Yapılacak 2' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(column(page, 'Devam Ediyor')).toBeHidden()
  }

  await page.getByRole('button', { name: /Görselleri hazırla/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('group', { name: 'Taşı' })
    .getByRole('button', { name: 'Tamamlandı' })
    .click()

  await expect(dialog).toBeHidden()
  await expect(column(page, 'Tamamlandı')).toContainText('Görselleri hazırla')
  if (isMobile) {
    await expect(page.getByRole('tab', { name: 'Tamam 1' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  }
  await expect.poll(() => statusOf(user, 'Görselleri hazırla')).toBe('done')
})

test('a card shows its details, can be edited, and links to its note', async ({ page }) => {
  const { user, noteId } = await setUpBoard(page)
  const card = page.getByRole('button', { name: /Görselleri hazırla/ })
  await expect(card).toContainText('Elif')
  await expect(card).toContainText('20 Kas')

  await card.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Görev').fill('Lansman görsellerini hazırla')
  await dialog.getByLabel('Sorumlu').fill('Deniz')
  await dialog.getByRole('button', { name: 'Kaydet' }).click()

  await expect(dialog).toBeHidden()
  const edited = page.getByRole('button', { name: /Lansman görsellerini hazırla/ })
  await expect(edited).toContainText('Deniz')
  const { data } = await user.supabase
    .from('tasks')
    .select('assignee')
    .eq('title', 'Lansman görsellerini hazırla')
    .single()
  expect(data?.assignee).toBe('Deniz')

  await edited.click()
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /Kaynak nota git/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`/notes/${noteId}$`))
})

test('tasks can be added by hand and deleted after confirmation', async ({ page }) => {
  const { user } = await setUpBoard(page)

  await column(page, 'Yapılacak').locator('..').getByRole('button', { name: 'Görev ekle' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(dialog.getByText('Görevin bir başlığı olmalı.')).toBeVisible()

  await dialog.getByLabel('Görev').fill('Ajansla toplantı ayarla')
  await dialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(dialog).toBeHidden()
  await expect(column(page, 'Yapılacak')).toContainText('Ajansla toplantı ayarla')

  await page.getByRole('button', { name: /Bütçeyi güncelle/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Görevi sil' }).click()

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: /Bütçeyi güncelle/ })).toHaveCount(0)
  const { data } = await user.supabase.from('tasks').select('title').order('title')
  expect(data?.map((task) => task.title)).toEqual([
    'Ajansla toplantı ayarla',
    'Görselleri hazırla',
    'Rakip analizi',
  ])
})

test('when a move cannot be saved the card goes back and an error is shown', async ({ page }) => {
  const { user } = await setUpBoard(page)
  await page.route('**/rest/v1/tasks**', (route) =>
    route.request().method() === 'PATCH' ? route.abort('internetdisconnected') : route.continue(),
  )

  await page.getByRole('button', { name: /Bütçeyi güncelle/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('group', { name: 'Taşı' })
    .getByRole('button', { name: 'Devam Ediyor' })
    .click()

  await expect(page.getByRole('alert').filter({ hasText: 'eski yerine döndü' })).toBeVisible()
  await expect(column(page, 'Yapılacak')).toContainText('Bütçeyi güncelle')
  expect(await statusOf(user, 'Bütçeyi güncelle')).toBe('todo')
})
