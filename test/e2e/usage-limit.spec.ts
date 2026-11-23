import { expect, test, type Page } from '@playwright/test'
import { createTestUser, signInThroughForm, signedOut } from './helpers'

// Users cannot raise their own usage (only the server can), so these tests answer the usage
// and process-note requests in the browser instead of filling up a real limit.
test.use({ storageState: signedOut })

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }

async function signInAsNewUser(page: Page) {
  const user = await createTestUser('usage')
  await page.goto('/login')
  await signInThroughForm(page, user.email, user.password)
  await expect(page).toHaveURL(/\/notes$/)
}

function fakeUsage(page: Page, used: number) {
  return page.route('**/rest/v1/rpc/get_my_ai_usage**', (route) =>
    route.fulfill({
      json: [
        {
          used,
          request_limit: 50,
          plan: 'free',
          period: '2026-11-01',
          stt_minutes: 0,
          stt_minute_limit: 30,
        },
      ],
    }),
  )
}

test('settings show this month’s AI usage for a new user', async ({ page }) => {
  await signInAsNewUser(page)
  await page.goto('/settings')

  const usage = page.getByRole('region', { name: 'Bu ayki kullanım' })
  await expect(usage).toContainText('0 / 50')
  await expect(usage.getByRole('progressbar', { name: 'AI işleme kullanımı' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
})

test('settings warn when the limit is close', async ({ page }) => {
  await signInAsNewUser(page)
  await fakeUsage(page, 45)
  await page.goto('/settings')

  await expect(page.getByRole('region', { name: 'Bu ayki kullanım' })).toContainText(
    'Bu ay 5 AI işleme hakkın kaldı. Hakkın 1 Aralık’ta yenilenir.',
  )
})

test('when the limit is reached notes can still be saved but not processed', async ({ page }) => {
  await signInAsNewUser(page)
  await fakeUsage(page, 50)
  await page.goto('/notes/new')

  await expect(page.getByText('Bu ayki 50 AI işleme hakkını doldurdun')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Görevleri çıkar' })).toBeDisabled()

  await expect(page.getByRole('button', { name: 'Notu kaydet' })).toBeEnabled()
  await page.getByLabel('Not', { exact: true }).fill('Limit dolduğunda da kaydedilen not')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByRole('list', { name: 'Notlar' })).toContainText(
    'Limit dolduğunda da kaydedilen not',
  )
})

test('a note page explains the limit instead of offering a retry', async ({ page }) => {
  await signInAsNewUser(page)
  await page.route('**/functions/v1/process-note', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 200, headers: CORS })
      : route.fulfill({
          status: 429,
          headers: CORS,
          json: {
            error: {
              code: 'limit_reached',
              message:
                'Bu ayki AI işleme hakkını doldurdun. Notun kaydedildi; hakkın gelecek ayın ilk günü yenilenir.',
            },
          },
        }),
  )

  await page.goto('/notes/new')
  await expect(page.getByRole('button', { name: 'Görevleri çıkar' })).toBeEnabled()
  await page.getByLabel('Not', { exact: true }).fill('Limit dolunca işlenemeyen not')
  await page.getByRole('button', { name: 'Görevleri çıkar' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Bu ayki AI hakkın doldu' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tekrar dene' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Kullanımı gör' }).click()
  await expect(page).toHaveURL(/\/settings$/)
})
