import { expect, test } from '@playwright/test'

async function completeAcceptedIamDiagnosis(
  page: import('@playwright/test').Page,
) {
  await page.goto('/failure-lab/scenarios/iam-001')
  await page.getByRole('button', { name: 'Begin investigation' }).click()

  for (const [name, cost] of [
    ['affected user scope', 1],
    ['authentication events', 2],
    ['role configuration', 2],
    ['role audit history', 3],
  ] as const) {
    await page
      .getByRole('button', {
        name: new RegExp(`open ${name}.*cost ${cost}`, 'i'),
      })
      .click()
  }

  for (const name of [
    'Affected user scope',
    'Authentication events',
    'Role configuration',
    'Role audit history',
  ]) {
    await page.getByRole('button', { name: `Bookmark ${name}` }).click()
  }

  await page.getByRole('radio', { name: /recent role change removed/i }).check()
  await page.getByRole('button', { name: 'Ready to diagnose' }).click()
  await page.getByRole('button', { name: 'Submit diagnosis' }).click()
  await expect(
    page.getByRole('heading', { name: 'Diagnosis submitted' }),
  ).toBeVisible()
}

test('records, reloads, and resets an accepted IAM completion', async ({
  page,
}) => {
  await completeAcceptedIamDiagnosis(page)

  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your progress' }),
  ).toBeVisible()
  await expect(
    page.getByText('Completed scenarios', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Recent completed runs' }),
  ).toContainText('Score: 100')
  await expect(
    page.getByRole('list', { name: 'Scenario progress' }),
  ).toContainText('Completed')
  await expect(
    page.getByRole('heading', { name: 'First completion' }),
  ).toHaveText(/Unlocked/)
  await expect(
    page.getByRole('heading', { name: 'Perfect diagnosis' }),
  ).toHaveText(/Unlocked/)

  await page.reload()
  await expect(
    page.getByRole('list', { name: 'Recent completed runs' }),
  ).toContainText('Score: 100')

  await page.getByRole('button', { name: 'Reset progress' }).click()
  await expect(
    page.getByRole('button', { name: 'Confirm reset' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await expect(page.getByRole('status')).toHaveText('Progress reset.')
  await expect(
    page.getByRole('heading', { name: 'No completed scenarios yet' }),
  ).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Recent completed runs' }),
  ).toHaveCount(0)

  await page.goto('/failure-lab/scenarios')
  await page.getByRole('link', { name: 'Progress' }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'No completed scenarios yet' }),
  ).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Recent completed runs' }),
  ).toHaveCount(0)
})

test('recovers safely from corrupt saved progress', async ({ page }) => {
  await page.goto('/failure-lab/')
  await page.evaluate(() => {
    localStorage.setItem('saas-failure-lab.progress', '{not valid json')
  })
  await page.goto('/failure-lab/progress')

  await expect(
    page.getByRole('heading', { name: 'Your progress' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText(
    'Progress was recovered from invalid saved data.',
  )
  await expect(
    page.getByRole('heading', { name: 'No completed scenarios yet' }),
  ).toBeVisible()
})

test('keeps progress usable at 320px without workspace tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/failure-lab/progress')

  await expect(
    page.getByRole('heading', { name: 'Your progress' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Reset progress' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Achievements' }),
  ).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
