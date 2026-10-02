import { expect, test } from '@playwright/test'

async function beginIamInvestigation(page: import('@playwright/test').Page) {
  await page.goto('/failure-lab/scenarios/iam-001')
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Begin investigation' }).click()
}

test('investigates IAM-001 through the reversible ready checkpoint', async ({
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
  await page
    .getByRole('button', { name: 'Bookmark Role audit history' })
    .click()
  await page.getByRole('radio', { name: /recent role change removed/i }).check()
  await page.getByRole('button', { name: 'Ready to diagnose' }).click()

  await expect(
    page.getByRole('heading', { name: 'Ready to diagnose' }),
  ).toBeFocused()
  await expect(page.getByText('Role audit history')).toBeVisible()
  await expect(page.getByText('4 of 5 evidence sources opened')).toBeVisible()
  await expect(
    page.getByText('Diagnosis continues in the next product milestone.'),
  ).toBeVisible()
  await expect(page.getByText(/score|correct answer/i)).toHaveCount(0)
  await expect(
    page.getByText(/root cause|critical|supporting|red herring|debrief/i),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /submit|diagnose|score/i }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Return to investigation' }).click()
  await expect(
    page.getByRole('button', { name: 'Ready to diagnose' }),
  ).toBeFocused()
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
