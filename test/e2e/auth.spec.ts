import { expect, test } from '@playwright/test'
import {
  createTestUser,
  expectOnLogin,
  fillCredentials,
  signInThroughForm,
  signedOut,
  TEST_PASSWORD,
  uniqueEmail,
} from './helpers'

test.describe('signed out', () => {
  test.use({ storageState: signedOut })

  const screens = [
    { path: '/login', title: 'Giriş yap', heading: 'Tekrar hoş geldin', switchTo: '/register' },
    { path: '/register', title: 'Kayıt ol', heading: 'Hesap oluştur', switchTo: '/login' },
  ]

  for (const { path, title, heading, switchTo } of screens) {
    test(`${title} screen shows the form without app navigation`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveTitle(`${title} · Jotplot`)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(page.getByLabel('E-posta')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Google ile devam et' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Ana menü' })).toHaveCount(0)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)

      await page.locator(`main a[href="${switchTo}"]`).click()
      await expect(page).toHaveURL(switchTo)
    })
  }

  test('Google button sends the visitor to Google through local Supabase', async ({ page }) => {
    // Stop at Google's sign-in page; tests never talk to Google.
    await page.route('https://accounts.google.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Google stub</h1>' }),
    )
    await page.goto('/login')

    await page.getByRole('button', { name: 'Google ile devam et' }).click()

    await page.waitForURL('https://accounts.google.com/**')
    const google = new URL(page.url())
    expect(google.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:54321/auth/v1/callback')
    expect(google.searchParams.get('client_id')).toMatch(/\.apps\.googleusercontent\.com$/)
  })

  test('a cancelled Google sign-in shows a way back to the login page', async ({ page }) => {
    await page.goto('/confirm?error=access_denied&error_description=cancelled')

    await expect(page.getByRole('heading', { name: 'Giriş tamamlanamadı' })).toBeVisible()
    await page.getByRole('link', { name: 'Giriş sayfasına dön' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('protected pages send signed-out visitors to the login page', async ({ page }) => {
    for (const path of ['/notes', '/board', '/ask', '/settings']) {
      await page.goto(path)
      await expectOnLogin(page)
    }
  })

  test('after signing in the user returns to the page they asked for', async ({ page }) => {
    const user = await createTestUser('redirect')

    await page.goto('/board')
    await expectOnLogin(page)
    await signInThroughForm(page, user.email, user.password)

    await expect(page).toHaveURL(/\/board$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Panon şimdilik boş' })).toBeVisible()
  })

  test('login shows validation errors, then a wrong-password error', async ({ page }) => {
    await page.goto('/login')
    const submit = page.locator('form').getByRole('button', { name: 'Giriş yap' })

    await submit.click()
    await expect(page.getByText('E-posta adresini yaz.')).toBeVisible()
    await expect(page.getByText('Şifreni yaz.')).toBeVisible()

    await signInThroughForm(page, uniqueEmail('nobody'), 'wrong-password')

    await expect(page.getByRole('alert')).toContainText('E-posta veya şifre hatalı.')
    await expect(page.getByLabel('E-posta')).not.toHaveValue('')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('sign-up with an email that already has an account shows a clear error', async ({
    page,
  }) => {
    const user = await createTestUser('taken')

    await page.goto('/register')
    await fillCredentials(page, user.email, TEST_PASSWORD)
    await page.locator('form').getByRole('button', { name: 'Kayıt ol' }).click()

    await expect(page.getByRole('alert')).toContainText('zaten bir hesap var')
  })

  test('signing out ends the session', async ({ page }) => {
    const user = await createTestUser('signout')

    await page.goto('/login')
    await signInThroughForm(page, user.email, user.password)
    await expect(page).toHaveURL(/\/notes$/)

    await page.goto('/settings')
    await expect(page.getByText(user.email)).toBeVisible()
    await page.getByRole('main').getByRole('button', { name: 'Çıkış yap' }).click()

    await expectOnLogin(page)
    await page.goto('/notes')
    await expectOnLogin(page)
  })
})

test('signed-in users skip the login page', async ({ page }) => {
  await page.goto('/login')

  await expect(page).toHaveURL(/\/notes$/)
})
