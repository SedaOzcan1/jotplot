import { expect, test } from '@playwright/test'

test('desktop shows the sidebar and hides the bottom bar', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only')
  await page.goto('/notes')

  await expect(page.getByRole('complementary')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Yeni not' })).toBeVisible()
  await expect(page.locator('nav.fixed')).toBeHidden()
})

test('mobile shows the top bar and bottom bar and hides the sidebar', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'mobile only')
  await page.goto('/notes')

  await expect(page.getByRole('complementary')).toBeHidden()
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Notlar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Yeni not' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Ana menü' })).toBeVisible()
})

test('narrow phones (360 px) have no horizontal overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only')
  await page.setViewportSize({ width: 360, height: 740 })

  for (const path of ['/notes', '/notes/new', '/board', '/ask', '/settings']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})
