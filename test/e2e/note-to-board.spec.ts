import { expect, test } from '@playwright/test'
import {
  createTestUser,
  fakeProcessNote,
  PROCESS_NOTE_URL,
  signInThroughForm,
  signedOut,
} from './helpers'

// T1.9: the whole Faz 1 flow in one test, on desktop and mobile. A new user signs in, writes a
// meeting note, extracts tasks, reviews them, adds them to the board, and moves one forward.
// The AI is replaced by a stand-in (see helpers), so this never calls Claude.
test.use({ storageState: signedOut })

test('sign in, write a note, extract tasks, and track them on the board', async ({
  page,
  isMobile,
}) => {
  const user = await createTestUser('flow')
  await page.route(PROCESS_NOTE_URL, fakeProcessNote(user))

  // 1. Sign in; a new user starts with no notes.
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByRole('heading', { name: 'Henüz notun yok' })).toBeVisible()

  // 2. Write a meeting note and extract its tasks.
  await page.getByRole('link', { name: 'İlk notunu oluştur' }).click()
  await expect(page).toHaveURL(/\/notes\/new$/)
  await expect(page.getByRole('button', { name: 'Görevleri çıkar' })).toBeEnabled()
  await page.getByLabel('Başlık (isteğe bağlı)').fill('Kampanya lansmanı haftalık')
  await page
    .getByLabel('Not', { exact: true })
    .fill('Elif görselleri cumaya hazırlayacak. Bütçe tablosu güncellenecek. Lansman ertelendi.')
  await page.getByRole('button', { name: 'Görevleri çıkar' }).click()

  // 3. Review the result: summary, decisions, and the proposed tasks with their details.
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Kampanya lansmanı haftalık' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Özet' })).toHaveValue(
    'Lansman iki hafta ertelendi.',
  )
  const proposed = page.getByRole('list', { name: 'Önerilen görevler' }).getByRole('listitem')
  await expect(proposed).toHaveCount(2)
  await expect(proposed.nth(0).getByLabel('Sorumlu')).toHaveValue('Elif')

  // Fix the second task before approving it (US-1.3).
  await proposed.nth(1).getByLabel('Sorumlu').fill('Can')
  await page.getByRole('button', { name: 'Panoya ekle' }).click()
  await expect(page.getByText('2 görev panoya eklendi').first()).toBeVisible()

  // 4. The note list shows the processed note with its counts.
  await page.goto('/notes')
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText(
    'Kampanya lansmanı haftalık',
  )
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText('2 görev · 1 karar')

  // 5. The tasks are in the board's Yapılacak column.
  await page.goto('/board')
  const todo = page.getByRole('list', { name: 'Yapılacak görevleri' })
  await expect(todo.getByRole('listitem')).toHaveCount(2)
  const budget = page.getByRole('button', { name: /Bütçeyi güncelle/ })
  await expect(budget).toContainText('Can')
  await expect(page.getByRole('button', { name: /Görselleri hazırla/ })).toContainText('20 Kas')

  // 6. Move a task forward and open its note from the card.
  await budget.click()
  await page
    .getByRole('dialog')
    .getByRole('group', { name: 'Taşı' })
    .getByRole('button', { name: 'Devam Ediyor' })
    .click()
  await expect(page.getByRole('list', { name: 'Devam Ediyor görevleri' })).toContainText(
    'Bütçeyi güncelle',
  )
  if (isMobile) {
    await expect(page.getByRole('tab', { name: 'Devam 1' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  }

  await page.reload()
  if (isMobile) await page.getByRole('tab', { name: /Devam/ }).click()
  await expect(page.getByRole('list', { name: 'Devam Ediyor görevleri' })).toContainText(
    'Bütçeyi güncelle',
  )

  await page.getByRole('button', { name: /Bütçeyi güncelle/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /Kaynak nota git/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Kampanya lansmanı haftalık' })).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Panodaki görevler' }).getByRole('listitem'),
  ).toHaveCount(2)
})
