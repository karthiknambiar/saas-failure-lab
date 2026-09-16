import { expect, test } from '@playwright/test'

test('navigates from the landing page to the scenario browser', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Practice the investigation before it is urgent.',
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Scenarios' }).first().click()

  await expect(page).toHaveURL(/\/scenarios$/)
  await expect(
    page.getByRole('heading', { name: 'Browse troubleshooting scenarios' }),
  ).toBeVisible()
})

test('supports skip navigation by keyboard', async ({ page }) => {
  await page.goto('/')

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.locator('#main-content')).toBeFocused()
})

test('uses the mobile navigation disclosure without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByText('Menu', { exact: true }).click()
  await page.getByRole('link', { name: 'How it works' }).last().click()

  await expect(page).toHaveURL(/\/how-it-works$/)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('renders a clean route directly', async ({ page }) => {
  await page.goto('/scenarios')

  await expect(
    page.getByRole('heading', { name: 'Browse troubleshooting scenarios' }),
  ).toBeVisible()
})

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 320, height: 700 },
]) {
  test(`fits the landing page at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'Practice the investigation before it is urgent.',
      }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}
