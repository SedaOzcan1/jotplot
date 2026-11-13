import { expect, test as setup } from '@playwright/test'
import { authFile, fillCredentials, TEST_PASSWORD, uniqueEmail } from './helpers'

setup('sign up a test user through the form', async ({ page }) => {
  await page.goto('/register')
  await fillCredentials(page, uniqueEmail('setup'), TEST_PASSWORD)
  await page.locator('form').getByRole('button', { name: 'Kayıt ol' }).click()

  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Henüz notun yok' })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
