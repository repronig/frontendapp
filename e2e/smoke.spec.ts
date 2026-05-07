import { test, expect } from '@playwright/test';

test('public app shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});

test('super admin integrations route after login (optional env)', async ({ page }) => {
  const email = process.env.E2E_SUPER_EMAIL;
  const password = process.env.E2E_SUPER_PASSWORD;
  test.skip(!email || !password, 'Set E2E_SUPER_EMAIL and E2E_SUPER_PASSWORD to run this smoke test.');

  await page.goto('/super-admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login now/i }).click();

  await page.waitForURL(/\/(super-admin|two-factor)/, { timeout: 30_000 });

  if (page.url().includes('/two-factor')) {
    const otp = process.env.E2E_2FA_CODE?.trim();
    test.skip(
      !otp,
      'Account requires two-factor verification. Set E2E_2FA_CODE to the 6-digit code (or use a super admin without 2FA in this environment).',
    );
    await page.getByLabel(/verification code/i).fill(otp);
    await page.getByRole('button', { name: /verify|submit|continue/i }).click();
    await page.waitForURL(/super-admin/, { timeout: 30_000 });
  }

  await page.goto('/super-admin/integrations');
  await expect(page.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible({ timeout: 15_000 });
});
