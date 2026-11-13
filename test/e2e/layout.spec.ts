import { expect, test, type Page } from '@playwright/test'

const pages = [
  { path: '/notes', title: 'Notlar', empty: 'Henüz notun yok' },
  { path: '/board', title: 'Pano', empty: 'Panon şimdilik boş' },
  { path: '/ask', title: 'Sor', empty: 'Notlarına soru sor' },
  { path: '/settings', title: 'Ayarlar', empty: 'Diğer ayarlar hazırlanıyor' },
]

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test('root redirects to the notes page', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
})

for (const { path, title, empty } of pages) {
  test(`${title} page shows its title and empty state without overflow`, async ({ page }) => {
    await page.goto(path)

    await expect(page).toHaveTitle(title === 'Jotplot' ? 'Jotplot' : `${title} · Jotplot`)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: empty })).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
}

test('main navigation moves between sections and marks the current one', async ({ page }) => {
  await page.goto('/notes')
  const nav = page.getByRole('navigation', { name: 'Ana menü' })

  await nav.getByRole('link', { name: 'Pano' }).click()
  await expect(page).toHaveURL(/\/board$/)
  await expect(nav.getByRole('link', { name: 'Pano' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Notlar' })).not.toHaveAttribute('aria-current')
})

test('empty notes page links to the new note screen', async ({ page }) => {
  await page.goto('/notes')
  await page.getByRole('link', { name: 'İlk notunu oluştur' }).click()

  await expect(page).toHaveURL(/\/notes\/new$/)
})

test('student mode is shown as coming soon and cannot be selected', async ({ page }) => {
  await page.goto('/notes')
  const group = page.getByRole('group', { name: 'Mod seçimi' })

  await expect(group.getByRole('button', { name: /Çalışan/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(group.getByRole('button', { name: /Öğrenci/ })).toBeDisabled()
})
