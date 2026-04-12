import { expect, test } from '@playwright/test'

async function signIn(page: Parameters<typeof test>[0]['page'], username: string, password: string) {
  await page.goto('/iam/login')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  await page.getByLabel('Username or email').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('**/iam/account')
}

test('standalone super administrator can sign in and log out', async ({ page }) => {
  await signIn(page, 'admin@idp.local', 'StandaloneIAM!SuperAdmin2026')

  const banner = page.getByRole('banner')
  await expect(banner.getByRole('button', { name: 'Logout' })).toBeVisible()
  await expect(banner.getByText('Standalone Identity Platform', { exact: true })).toBeVisible()
  await expect(banner.getByRole('link', { name: /^Account$/ }).first()).toBeVisible()

  await banner.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('**/iam/login?logged_out=1')
  await expect(page.getByText('You are signed out. Sign in again to start a new standalone IAM session.')).toBeVisible()
})

test('tenant administrator can reach the workspace from the account journey', async ({ page }) => {
  await signIn(page, 'alex.morgan@northstar.example', 'StandaloneIAM!TenantAdmin2026')

  await page.getByRole('link', { name: 'Workspace' }).click()
  await page.waitForURL('**/iam')
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('button', { name: 'Logout' })).toBeVisible()
  await expect(banner.getByText('Standalone Identity Platform', { exact: true })).toBeVisible()
})

test('direct workspace URL redirects to login and returns after sign-in', async ({ page }) => {
  await page.goto('/iam?tab=realms&entity=realms&mode=list')
  await page.waitForURL('**/iam/login?next=*')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()

  await page.getByLabel('Username or email').fill('alex.morgan@northstar.example')
  await page.getByLabel('Password').fill('StandaloneIAM!TenantAdmin2026')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await page.waitForURL('**/iam?tab=realms&entity=realms&mode=list')
  await expect(page.getByRole('banner').getByRole('button', { name: 'Logout' })).toBeVisible()
  await expect(page.getByText('Unable to load the standalone IAM administration surface.')).not.toBeVisible()
})
