import { expect, test } from '@playwright/test'

async function beginIamInvestigation(page: import('@playwright/test').Page) {
  await page.goto('/failure-lab/scenarios/iam-001')
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Begin investigation' }).click()
}

test('submits an IAM-001 diagnosis from the ready checkpoint', async ({
  page,
}) => {
  await beginIamInvestigation(page)

  await page
    .getByRole('button', { name: /open affected user scope.*cost 1/i })
    .click()
  await page
    .getByRole('button', { name: /open authentication events.*cost 2/i })
    .click()
  await page
    .getByRole('button', { name: /open role configuration.*cost 2/i })
    .click()
  await page
    .getByRole('button', { name: /open role audit history.*cost 3/i })
    .click()
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

  await expect(
    page.getByRole('heading', { name: 'Ready to diagnose' }),
  ).toBeFocused()
  await expect(page.getByText('Role audit history')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Debrief' })).toHaveCount(0)
  await expect(page.getByText('70 / 70', { exact: true })).toHaveCount(0)
  const submit = page.getByRole('button', { name: 'Submit diagnosis' })
  await submit.focus()
  await submit.press('Enter')

  await expect(
    page.getByRole('heading', { name: 'Diagnosis submitted' }),
  ).toBeFocused()
  await expect(page.getByText('100', { exact: true })).toBeVisible()
  await expect(page.getByText('Strong evidence-backed diagnosis')).toBeVisible()
  await expect(
    page.getByText(
      /root cause|critical|supporting|red herring|remediation|communication|debrief/i,
    ),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Investigation tools' }),
  ).toHaveCount(0)
  await expect(page.getByRole('button')).toHaveCount(2)

  await page.getByRole('button', { name: 'Review debrief' }).click()
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused()
  await expect(page.getByText('100 / 100', { exact: true })).toBeVisible()
  await expect(page.getByText('70 / 70', { exact: true })).toBeVisible()
  await expect(page.getByText('30 / 30', { exact: true })).toBeVisible()
  await expect(
    page.getByText(
      /Both users authenticated successfully, but a bulk cleanup removed the role/i,
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Evidence chain' }),
  ).toBeVisible()
  const evidenceChainSection = page
    .getByRole('heading', { name: 'Evidence chain' })
    .locator('..')
  const evidenceChain = evidenceChainSection.locator('ol')
  await expect(evidenceChain).toHaveCount(1)
  expect(await evidenceChain.evaluate((element) => element.tagName)).toBe('OL')
  await expect(page.getByText(/browser change is not causal/i)).toBeVisible()
  await expect(
    page.getByText(
      'Forecasting CPU was briefly elevated earlier in the morning.',
      { exact: true },
    ),
  ).toHaveCount(0)
  await expect(
    page.getByText(
      /spike ended before the failure and cannot explain why peers retain access/i,
    ),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Efficient investigation path' }),
  ).toBeVisible()
  await expect(
    page.getByText('Establish impact', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /A successful login proves authentication, not authorization/i,
    ),
  ).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Investigation tools' }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Back to result' }).click()
  await expect(
    page.getByRole('heading', { name: 'Diagnosis submitted' }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Review debrief' }).click()
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
})

test('shows a deterministic partial result for an incorrect IAM-001 diagnosis without exposing an answer key', async ({
  page,
}) => {
  await beginIamInvestigation(page)

  for (const evidence of [
    ['affected user scope', 1],
    ['authentication events', 2],
    ['role configuration', 2],
    ['role audit history', 3],
  ] as const) {
    await page
      .getByRole('button', {
        name: new RegExp(`open ${evidence[0]}.*cost ${evidence[1]}`, 'i'),
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
  await page
    .getByRole('radio', {
      name: /reporting service is experiencing an outage/i,
    })
    .check()
  await page.getByRole('button', { name: 'Ready to diagnose' }).click()
  await page.getByRole('button', { name: 'Submit diagnosis' }).press('Enter')

  await expect(
    page.getByRole('heading', { name: 'Diagnosis submitted' }),
  ).toBeFocused()
  await expect(page.getByText('30', { exact: true })).toBeVisible()
  await expect(page.getByText('Partial diagnosis')).toBeVisible()
  await expect(
    page.getByText('The reporting service is experiencing an outage.'),
  ).toBeVisible()
  await expect(
    page.getByText(
      "A recent role change removed the affected users' reporting authorization.",
    ),
  ).toHaveCount(0)
  await expect(
    page.getByText(
      /correct answer|root cause|critical|supporting|red herring|remediation|communication|debrief/i,
    ),
  ).toHaveCount(0)
})

test('enters IAM-001 from the landing CTA and browser card', async ({
  page,
}) => {
  await page.goto('/failure-lab/')
  await page.getByRole('link', { name: 'Start an incident' }).click()
  await expect(page).toHaveURL(/\/scenarios\/iam-001$/)

  await page.goto('/failure-lab/scenarios')
  await page
    .getByRole('link', { name: /open login works, feature does not/i })
    .click()
  await expect(page).toHaveURL(/\/scenarios\/iam-001$/)
})

test('recovers safely for unknown and unavailable investigation routes', async ({
  page,
}) => {
  await page.goto('/failure-lab/scenarios/missing-001')
  await expect(
    page.getByRole('heading', { name: 'This scenario could not be found.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Browse scenarios' }).click()
  await expect(page).toHaveURL(/\/scenarios$/)

  await page.goto('/failure-lab/scenarios/fnd-001')
  await expect(
    page.getByRole('heading', { name: 'This scenario is not playable yet.' }),
  ).toBeVisible()
  await expect(page.getByText(/score|correct answer/i)).toHaveCount(0)
})

test('loads the static investigation route directly', async ({ page }) => {
  const response = await page.goto('/failure-lab/scenarios/iam-001')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
})

test('keeps the completed IAM-001 result narrow and free of workspace tab interactions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await beginIamInvestigation(page)

  for (const evidence of [
    ['affected user scope', 1],
    ['authentication events', 2],
    ['role configuration', 2],
    ['role audit history', 3],
  ] as const) {
    await page
      .getByRole('button', {
        name: new RegExp(`open ${evidence[0]}.*cost ${evidence[1]}`, 'i'),
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
  await page.getByRole('button', { name: 'Submit diagnosis' }).press('Enter')

  await expect(
    page.getByRole('heading', { name: 'Diagnosis submitted' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Review debrief' }).click()
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Investigation tools' }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

for (const width of [320, 820, 821, 865]) {
  test(`keeps IAM-001 usable without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await beginIamInvestigation(page)

    if (width <= 820) {
      const tools = page.getByRole('tab', { name: 'Tools' })
      await expect(tools).toHaveAttribute('aria-selected', 'true')
      await tools.press('ArrowLeft')
      await expect(page.getByRole('tab', { name: 'Notebook' })).toBeFocused()
      await expect(
        page.getByRole('tabpanel', { name: 'Notebook' }),
      ).toBeVisible()
      await page.getByRole('tab', { name: 'Notebook' }).press('Home')
      await expect(tools).toBeFocused()
      await expect(page.getByRole('tabpanel', { name: 'Tools' })).toBeVisible()
      await page
        .getByRole('button', { name: /open service status.*cost 1/i })
        .click()
      await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await page.getByRole('tab', { name: 'Evidence' }).press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Notebook' })).toBeFocused()
      await expect(
        page.getByRole('tabpanel', { name: 'Notebook' }),
      ).toBeVisible()
      await page.getByRole('tab', { name: 'Notebook' }).press('Home')
      await expect(tools).toBeFocused()
      await tools.press('End')
      await expect(page.getByRole('tab', { name: 'Notebook' })).toBeFocused()
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

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}
