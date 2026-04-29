import { expect, test } from '@playwright/test'

async function signIn(page: Parameters<typeof test>[0]['page'], username: string, password: string) {
  await page.goto('/iam/login')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  await page.getByLabel('Username or email').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('**/iam/account')
}

test('super administrator can export the selected realm from the admin workspace', async ({ page }) => {
  await signIn(page, 'admin@idp.local', 'StandaloneIAM!SuperAdmin2026')

  await page.goto('/iam?tab=realms&entity=exports&mode=list')
  await expect(page.getByText('Global Realm Context')).toBeVisible()
  await expect(page.getByText('Realm Exports').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export Selected Realm' }).first()).toBeVisible()
  await expect(page.getByText('Unable to load the standalone IAM administration surface.')).not.toBeVisible()

  await page.getByRole('button', { name: 'Export Selected Realm' }).first().click()

  await expect(page.getByText('Realm export created')).toBeVisible()
  await expect(page.getByRole('table')).toContainText('users')
  await expect(page).toHaveURL(/tab=realms/)
  await expect(page).toHaveURL(/entity=exports/)
})
