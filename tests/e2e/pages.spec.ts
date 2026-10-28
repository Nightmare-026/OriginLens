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

  // CTA button navigates to inspector
  await page.getByRole('link', { name: /Launch Media Explorer/ }).click();
  await expect(page).toHaveURL('/inspect');
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

  // Return button navigates to inspector
  await page.getByRole('link', { name: /Return to Media Explorer/ }).click();
  await expect(page).toHaveURL('/inspect');
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

test('header breadboard menu button toggles dropdown list with navigation links', async ({
  page,
}) => {
  await page.goto('/');

  const menuButton = page.getByTestId('nav-menu-button');
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  // Click menu button to open dropdown
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('nav-how-to-use')).toBeVisible();
  await expect(page.getByTestId('nav-privacy')).toBeVisible();

  // Clicking "How to Use" navigates to /how-to-use and closes dropdown
  await page.getByTestId('nav-how-to-use').click();
  await expect(page).toHaveURL('/how-to-use');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  // Open again on /how-to-use
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('nav-how-to-use')).toHaveClass(/nav-link-active/);

  // Pressing Escape closes the dropdown
  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
});

test('landing page renders storytelling hero, pipeline, and passes accessibility', async ({
  page,
}) => {
  await page.goto('/');

  // Single h1 rule
  const headings = page.locator('h1');
  await expect(headings).toHaveCount(1);
  await expect(headings).toContainText('Truth Over Deception');

  // Hero CTAs
  await expect(page.getByTestId('cta-hero-inspect')).toBeVisible();
  await expect(page.getByTestId('cta-hero-compare')).toBeVisible();

  // Trust indicators
  await expect(page.getByText('100% Client-Side Privacy')).toBeVisible();
  await expect(page.getByText('C2PA WebAssembly Standard')).toBeVisible();

  // Interactive Mini-Demo tab switching
  await expect(page.getByText('Live Cryptographic Evidence Engine')).toBeVisible();
  await page.getByRole('tab', { name: /Binding Mismatch/ }).click();
  await expect(page.getByText('assertion.dataHash.mismatch')).toBeVisible();
  await page.getByRole('tab', { name: /Unsigned Photo/ }).click();
  await expect(page.getByText('Sony Alpha 7R V')).toBeVisible();
  await page.getByRole('tab', { name: /Verified C2PA/ }).click();
  await expect(page.getByText('Adobe Creative Cloud')).toBeVisible();

  // Storytelling & Pipeline & Features
  await expect(page.getByText('The Anti-Snake-Oil Philosophy')).toBeVisible();
  await expect(page.getByText('How OriginLens Verifies Integrity')).toBeVisible();
  await expect(page.getByText('Evidence Ledger', { exact: true })).toBeVisible();
  await expect(page.getByText('Provenance Delta', { exact: true })).toBeVisible();

  // Scroll reveal transitions are present on storytelling cards
  const revealCards = page.locator('.reveal-on-scroll');
  expect(await revealCards.count()).toBeGreaterThanOrEqual(10);

  // Bottom CTA
  await expect(page.getByTestId('cta-bottom-inspect')).toBeVisible();

  // Navigation via Hero CTA
  await page.getByTestId('cta-hero-inspect').click();
  await expect(page).toHaveURL('/inspect');
  await expect(page.getByTestId('start-screen')).toBeVisible();

  // Run Axe accessibility audit on landing page
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations).toEqual([]);

  // Responsive check at 360px
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expectNoHorizontalOverflow(page);
});

test('verifies user visual requests: no hero pill, clean story cards, transparent stage tags, no navbar hover underline', async ({
  page,
}) => {
  await page.goto('/');

  // 1. Hero section: Hackathon pill badge is removed
  await expect(page.locator('.hero-hackathon-pill')).toHaveCount(0);
  await expect(page.getByText('Meta Global AI Hackathon 2026')).toHaveCount(0);

  // 2. Storytelling cards: No colored top lines/borders (uniform 1px border)
  const storyCards = page.locator('.story-card');
  const storyCardCount = await storyCards.count();
  expect(storyCardCount).toBe(3);
  for (let i = 0; i < storyCardCount; i += 1) {
    const card = storyCards.nth(i);
    const borderTopWidth = await card.evaluate((el) => window.getComputedStyle(el).borderTopWidth);
    expect(borderTopWidth).toBe('1px');
  }

  // 3. Pipeline section: Stage badges have transparent background
  const stageBadges = page.locator('.pipeline-tag');
  const stageBadgeCount = await stageBadges.count();
  expect(stageBadgeCount).toBe(4);
  for (let i = 0; i < stageBadgeCount; i += 1) {
    const tag = stageBadges.nth(i);
    const bg = await tag.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent').toBe(true);
  }

  // 4. Navbar links & brand logo: No underline on hover
  const navLinks = [
    page.getByTestId('nav-home-desktop'),
    page.getByTestId('nav-inspect-desktop'),
    page.getByTestId('nav-compare-desktop'),
    page.getByTestId('nav-how-to-use-desktop'),
    page.getByTestId('nav-privacy-desktop'),
    page.locator('#nav-brand'),
  ];

  for (const link of navLinks) {
    await link.hover();
    const textDecoration = await link.evaluate(
      (el) => window.getComputedStyle(el).textDecorationLine,
    );
    expect(textDecoration).toBe('none');
  }
});

