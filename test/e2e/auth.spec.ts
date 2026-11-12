import { expect, test } from '@playwright/test'

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

test('login shows validation errors and a not-ready message on submit', async ({ page }) => {
  await page.goto('/login')
  const submit = page.locator('form').getByRole('button', { name: 'Giriş yap' })

  await submit.click()
  await expect(page.getByText('E-posta adresini yaz.')).toBeVisible()
  await expect(page.getByText('Şifreni yaz.')).toBeVisible()

  await page.getByLabel('E-posta').fill('elif@example.com')
  await page.getByLabel('Şifre', { exact: true }).fill('secret12')
  await submit.click()

  await expect(page.getByRole('alert')).toContainText('Giriş henüz hazır değil')
  await expect(page.getByLabel('E-posta')).toHaveValue('elif@example.com')
})
