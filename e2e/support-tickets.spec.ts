import { test, expect } from '@playwright/test';

test('member support page loads when optional member e2e credentials are set', async ({ page }) => {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;
  test.skip(!email || !password, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD to run this test.');

  await page.goto('/member/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login now/i }).click();

  await page.waitForURL(/\/(member|two-factor)/, { timeout: 30_000 });

  if (page.url().includes('/two-factor')) {
    const otp = process.env.E2E_2FA_CODE?.trim();
    test.skip(!otp, 'Set E2E_2FA_CODE if the member account requires 2FA.');
    await page.getByLabel(/verification code/i).fill(otp);
    await page.getByRole('button', { name: /verify|submit|continue/i }).click();
    await page.waitForURL(/member/, { timeout: 30_000 });
  }

  await page.goto('/member/support');
  await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'New ticket' })).toBeVisible();

  await page.goto('/member/support/new');
  await expect(page.getByRole('heading', { name: 'New support ticket' })).toBeVisible({ timeout: 15_000 });
});

test('admin support queue loads for super admin (optional env)', async ({ page }) => {
  const email = process.env.E2E_SUPER_EMAIL;
  const password = process.env.E2E_SUPER_PASSWORD;
  test.skip(!email || !password, 'Set E2E_SUPER_EMAIL and E2E_SUPER_PASSWORD to run this test.');

  await page.goto('/super-admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login now/i }).click();

  await page.waitForURL(/\/(super-admin|two-factor)/, { timeout: 30_000 });

  if (page.url().includes('/two-factor')) {
    const otp = process.env.E2E_2FA_CODE?.trim();
    test.skip(!otp, 'Set E2E_2FA_CODE if the super admin account requires 2FA.');
    await page.getByLabel(/verification code/i).fill(otp);
    await page.getByRole('button', { name: /verify|submit|continue/i }).click();
    await page.waitForURL(/super-admin/, { timeout: 30_000 });
  }

  await page.goto('/admin/support');
  await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible({ timeout: 15_000 });
});
