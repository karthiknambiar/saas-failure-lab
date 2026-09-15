import { expect, test } from '@playwright/test'

test('renders the repository foundation', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'SaaS Failure Lab' }),
  ).toBeVisible()
  await expect(page.getByText('Repository foundation is ready.')).toBeVisible()
})
