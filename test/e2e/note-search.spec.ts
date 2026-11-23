import { expect, test, type Page } from '@playwright/test'
import { createTestUser, signInThroughForm, signedOut } from './helpers'

// Each test uses its own user with a few notes of different types.
test.use({ storageState: signedOut })

async function setUpNotes(page: Page, extraTextNotes = 0) {
  const user = await createTestUser('search')
  const rows = [
    { type: 'text', title: 'İstanbul ofisi taşınması', raw_text: 'Taşınma planı konuşuldu.' },
    { type: 'text', title: 'Sprint planlama', raw_text: 'Bütçe %20 artırıldı.' },
    ...Array.from({ length: extraTextNotes }, (_, i) => ({
      type: 'text',
      title: `Haftalık not ${i + 1}`,
      raw_text: 'Rutin toplantı',
    })),
  ]
  const { error } = await user.supabase.from('sources').insert(rows)
  if (error) throw error
  // An audio note needs its file path and consent time; the file itself is not needed here.
  const { data: auth } = await user.supabase.auth.getUser()
  const audioId = crypto.randomUUID()
  const audio = await user.supabase.from('sources').insert({
    id: audioId,
    type: 'audio',
    title: 'Müşteri görüşmesi kaydı',
    storage_path: `${auth.user!.id}/${audioId}.m4a`,
    consent_confirmed_at: new Date().toISOString(),
  })
  if (audio.error) throw audio.error

  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
  return user
}

function noteCards(page: Page) {
  return page.getByRole('list', { name: 'Notlar' }).getByRole('listitem')
}

test('search finds notes by title or text, ignoring Turkish capital letters', async ({ page }) => {
  await setUpNotes(page)
  await expect(noteCards(page)).toHaveCount(3)

  await page.getByRole('searchbox', { name: 'Ara' }).fill('ISTANBUL')
  await expect(noteCards(page)).toHaveCount(1)
  await expect(noteCards(page)).toContainText('İstanbul ofisi taşınması')
  await expect(page).toHaveURL(/\?q=ISTANBUL/)

  await page.getByRole('searchbox', { name: 'Ara' }).fill('bütçe')
  await expect(noteCards(page)).toHaveCount(1)
  await expect(noteCards(page)).toContainText('Sprint planlama')
})

test('notes can be filtered by type and the filter survives opening a note', async ({ page }) => {
  await setUpNotes(page)
  const types = page.getByRole('group', { name: 'Not türü' })
  await expect(types.getByRole('button', { name: 'Tümü' })).toHaveAttribute('aria-pressed', 'true')

  await types.getByRole('button', { name: 'Ses' }).click()
  await expect(noteCards(page)).toHaveCount(1)
  await expect(noteCards(page)).toContainText('Müşteri görüşmesi kaydı')
  await expect(types.getByRole('button', { name: 'Ses' })).toHaveAttribute('aria-pressed', 'true')

  await noteCards(page).getByRole('link').click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+$/)
  await page.goBack()
  await expect(page).toHaveURL(/\?type=audio/)
  await expect(noteCards(page)).toHaveCount(1)

  await types.getByRole('button', { name: 'PDF' }).click()
  await expect(page.getByText('Aramana uygun not bulunamadı')).toBeVisible()
  await page.getByRole('button', { name: 'Filtreleri temizle' }).click()
  await expect(noteCards(page)).toHaveCount(3)
  await expect(page).toHaveURL(/\/notes$/)
})

test('a long list loads more notes on request', async ({ page }) => {
  await setUpNotes(page, 30)
  await expect(noteCards(page)).toHaveCount(30)

  await page.getByRole('button', { name: 'Daha fazla göster' }).click()
  await expect(noteCards(page)).toHaveCount(33)
  await expect(page.getByRole('button', { name: 'Daha fazla göster' })).toHaveCount(0)
})
