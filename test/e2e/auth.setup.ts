import { expect, test as setup } from '@playwright/test'
import { authFile, TEST_PASSWORD, uniqueEmail } from './helpers'

setup('sign up a test user through the form', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('E-posta').fill(uniqueEmail('setup'))
  await page.getByLabel('Şifre', { exact: true }).fill(TEST_PASSWORD)
  await page.locator('form').getByRole('button', { name: 'Kayıt ol' }).click()

  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Henüz notun yok' })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
