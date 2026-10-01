import { expect, test } from '@playwright/test'

test('navigates from the landing page to the scenario browser', async ({
  page,
}) => {
  await page.goto('/failure-lab/')

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
  await page.goto('/failure-lab/')

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.locator('#main-content')).toBeFocused()
})

test('reaches primary navigation by keyboard', async ({ page }) => {
  await page.goto('/failure-lab/')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const scenariosLink = page.getByRole('link', { name: 'Scenarios' }).first()
  await expect(scenariosLink).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/failure-lab\/scenarios$/)
})

test('uses the mobile navigation disclosure without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/failure-lab/')

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
  const response = await page.goto('/failure-lab/scenarios')

  expect(response?.status()).toBe(404)
  await expect(page).toHaveURL(/\/failure-lab\/scenarios$/)
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
    await page.goto('/failure-lab/')

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

for (const viewport of [
  { width: 320, height: 700, mobile: true },
  { width: 820, height: 900, mobile: true },
  { width: 865, height: 900, mobile: false },
  { width: 821, height: 900, mobile: false },
]) {
  test(`fits the investigation workspace at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/failure-lab/scenarios/iam-001')
    await page.getByRole('button', { name: 'Begin investigation' }).click()

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)

    if (viewport.mobile) {
      await expect(page.getByRole('tablist')).toBeVisible()
      await expect(page.getByRole('tabpanel', { name: 'Tools' })).toBeVisible()
    } else {
      await expect(page.getByRole('tablist')).toHaveCount(0)
      await expect(
        page.getByRole('region', { name: 'Investigation tools' }),
      ).toBeVisible()
      await expect(page.getByRole('region', { name: 'Evidence' })).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Case notebook' }),
      ).toBeVisible()
    }
  })
}
