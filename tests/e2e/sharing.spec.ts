import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const browser = window as Window & {
      __shareActions?: {
        copied: string[]
        shared: number
        downloaded: number
        revoked: string[]
      }
    }
    browser.__shareActions = {
      copied: [],
      shared: 0,
      downloaded: 0,
      revoked: [],
    }

    class ShareCardBlob {
      constructor(
        readonly parts: unknown[] = [],
        readonly options: { type?: string } = {},
      ) {}
    }

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          browser.__shareActions?.copied.push(text)
        },
      },
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        if (browser.__shareActions) browser.__shareActions.shared += 1
      },
    })
    Object.defineProperty(window, 'Blob', {
      configurable: true,
      value: ShareCardBlob,
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        fillStyle: '',
        font: '',
        fillRect: () => undefined,
        fillText: () => undefined,
        measureText: () => ({ width: 10 }),
      }),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: (callback: (blob: Blob) => void) =>
        callback(new Blob(['share card'], { type: 'image/png' })),
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:share-card',
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (url: string) => browser.__shareActions?.revoked.push(url),
    })
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      value: function click() {
        if (browser.__shareActions) browser.__shareActions.downloaded += 1
      },
    })
  })
})

async function completeIamScenario(page: import('@playwright/test').Page) {
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

test('shares a completed exact challenge variation without answer data', async ({
  page,
}) => {
  await completeIamScenario(page)

  await expect(
    page.getByRole('heading', { name: 'Share this challenge' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'This link lets others attempt the same scenario variation.',
      { exact: true },
    ),
  ).toBeVisible()

  for (const [button, status] of [
    ['Share challenge', 'Challenge shared.'],
    ['Copy challenge link', 'Challenge link copied.'],
    ['Download share card', 'Share card downloaded.'],
  ] as const) {
    await expect(page.getByRole('button', { name: button })).toBeVisible()
    await page.getByRole('button', { name: button }).click()
    await expect(page.getByRole('status')).toHaveText(status)
  }

  const actions = await page.evaluate(
    () =>
      (
        window as Window & {
          __shareActions: {
            copied: string[]
            shared: number
            downloaded: number
            revoked: string[]
          }
        }
      ).__shareActions,
  )
  expect(actions.shared).toBe(1)
  expect(actions.downloaded).toBe(1)
  expect(actions.revoked).toEqual(['blob:share-card'])
  expect(actions.copied).toEqual([
    'http://127.0.0.1:4173/failure-lab/scenarios/iam-001?seed=iam-001',
  ])
  expect(actions.copied[0]).not.toMatch(
    /root[_-]?cause|evidence|debrief|hypotheses|answer|solution/i,
  )
})

test('loads a seeded challenge variation and recovers from invalid seeds', async ({
  page,
}) => {
  await page.goto('/failure-lab/scenarios/iam-001?seed=sharing-1')

  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
  await expect(
    page.getByText('Cedar Ridge Works', { exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Begin investigation' }).click()
  await page
    .getByRole('button', { name: /open affected user scope.*cost 1/i })
    .click()
  await page
    .getByRole('button', { name: /open authentication events.*cost 2/i })
    .click()
  await expect(page.getByText('Today 09:19', { exact: true })).toBeVisible()

  await page.goto('/failure-lab/scenarios/iam-001?seed=%20%20')
  await expect(
    page.getByRole('heading', { name: 'Invalid challenge link' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Browse scenarios' }),
  ).toBeVisible()
})

test('loads the global UTC Daily Incident beneath the static base path', async ({
  page,
}) => {
  const response = await page.goto('/failure-lab/daily')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Daily Incident' }),
  ).toBeVisible()
  await expect(
    page.getByText('Everyone receives the same daily incident worldwide.'),
  ).toBeVisible()
  const start = page.getByRole('link', { name: 'Start daily incident' })
  await expect(start).toHaveAttribute(
    'href',
    /\/failure-lab\/scenarios\/(?:api-001|api-002|api-004|dat-003|fnd-001|fnd-002|fnd-003|iam-001|iam-004|int-001|int-004|web-001)\?seed=/,
  )
})

test('keeps completed sharing and Daily Incident usable at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await completeIamScenario(page)

  await expect(
    page.getByRole('heading', { name: 'Share this challenge' }),
  ).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await page.goto('/failure-lab/daily')
  await expect(
    page.getByRole('heading', { name: 'Daily Incident' }),
  ).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
