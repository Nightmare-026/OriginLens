import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

test('how-to-use page renders complete step-by-step guide and passes accessibility', async ({
  page,
}) => {
  await page.goto('/how-to-use');

  // Single h1 rule
  const headings = page.locator('h1');
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText('How to Use OriginLens');

  // Verify navigation active state
  await expect(page.getByTestId('nav-how-to-use')).toHaveClass(/nav-link-active/);

  // All 6 steps visible
  await expect(page.getByText('Choose Your Analysis Mode')).toBeVisible();
  await expect(page.getByText('Select & Validate Supported Files')).toBeVisible();
  await expect(page.getByText('Read the Evidence Ledger')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Compare Two Images (Provenance Delta)', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Download & Share Audit Reports')).toBeVisible();
  await expect(page.getByText('Clear Session & Release Memory')).toBeVisible();

  // Uncertainty table & FAQ
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Is OriginLens an AI detector?')).toBeVisible();

  // CTA button navigates to home
  await page.getByRole('link', { name: /Launch Media Explorer/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();

  // Run Axe accessibility audit on /how-to-use
  await page.goto('/how-to-use');
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations).toEqual([]);

  // Responsive check at 360px
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/how-to-use');
  await expectNoHorizontalOverflow(page);
});

test('privacy page renders zero-knowledge invariants and passes accessibility', async ({
  page,
}) => {
  await page.goto('/privacy');

  // Single h1 rule
  const headings = page.locator('h1');
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText('Privacy Policy');

  // Verify navigation active state
  await expect(page.getByTestId('nav-privacy')).toHaveClass(/nav-link-active/);

  // Core privacy guarantees
  await expect(page.getByText('Zero Image Uploads')).toBeVisible();
  await expect(page.getByText('Volatile Session Memory')).toBeVisible();
  await expect(page.getByText('GPS Masked by Default')).toBeVisible();
  await expect(page.getByText('Zero Telemetry or Ads')).toBeVisible();

  // Return button navigates to home
  await page.getByRole('link', { name: /Return to Media Explorer/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();

  // Run Axe accessibility audit on /privacy
  await page.goto('/privacy');
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations).toEqual([]);

  // Responsive check at 360px
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/privacy');
  await expectNoHorizontalOverflow(page);
});
