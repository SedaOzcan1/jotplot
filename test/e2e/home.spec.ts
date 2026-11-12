import { expect, test } from '@playwright/test'

test('home page renders in Turkish without horizontal overflow', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Jotplot')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.getByRole('heading', { level: 1, name: 'Jotplot' })).toBeVisible()
  await expect(
    page.getByText('Toplantı notlarını görevlere dönüştüren asistanın hazırlanıyor.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yakında' })).toBeDisabled()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
