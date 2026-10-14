import { expect, test } from '@playwright/test'

const hasNoHorizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test('renders an expanded API scenario card without exposing developer tools in primary navigation', async ({
  page,
}) => {
  await page.goto('/failure-lab/scenarios')

  await expect(
    page.getByRole('link', {
      name: /open nightly connection stops authenticating/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('navigation')).not.toContainText(/inspector/i)
  await expect(page.getByRole('navigation')).not.toContainText(/simulator/i)
})

test('loads the static inspector route with its authored evidence dependencies', async ({
  page,
}) => {
  await page.goto('/failure-lab/developer/inspector/api-001?seed=author-seed')

  await expect(
    page.getByRole('heading', { name: 'Scenario Inspector' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Evidence dependencies' }),
  ).toBeVisible()
  await expect(
    page.getByText('credential-audit: unlock after network-connectivity'),
  ).toBeVisible()
})

test('simulates IAM scoring through authored hypothesis and evidence controls', async ({
  page,
}) => {
  await page.goto('/failure-lab/developer/scoring/iam-001')

  await expect(
    page.getByRole('heading', { name: 'Scoring Simulator' }),
  ).toBeVisible()
  await expect(page.getByLabel('Hypothesis')).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Bookmarked evidence' }),
  ).toBeVisible()
  await page
    .getByLabel(/recent role change removed/i)
    .selectOption({ index: 0 })
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Simulate score' }).click()

  await expect(
    page.getByRole('heading', { name: 'Score simulation' }),
  ).toBeVisible()
})

for (const route of [
  '/failure-lab/developer/inspector/api-001?seed=author-seed',
  '/failure-lab/developer/scoring/iam-001',
]) {
  test(`keeps ${route.split('?')[0]} free of horizontal overflow at 320px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto(route)

    await expect(page.locator('main')).toBeVisible()
    expect(await hasNoHorizontalOverflow(page)).toBe(true)
  })
}
