import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Site-wide OriginLens Guide (bottom-right help launcher).
 *
 * The E2E server runs with `MODEL_EXPLANATION_ENABLED=false`, so every answer
 * here comes from the reviewed help content. That is deliberate: these tests
 * prove the guide never goes dark, never invents an answer outside the reviewed
 * topics, and keeps its consent and focus behaviour. A live provider answer is
 * covered by the documented manual verification, not by pretending a mock is
 * the real model.
 */

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

test('the guide is reachable from every page and answers from reviewed content', async ({
  page,
}) => {
  await page.goto('/');

  const launcher = page.getByTestId('guide-launcher');
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAccessibleName('Ask OriginLens help guide');

  await launcher.click();

  const panel = page.getByTestId('guide-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('guide-title')).toBeFocused();

  // Consent must be deliberate: no question can be typed before the disclosure.
  const consent = page.getByTestId('guide-consent');
  await expect(consent).toBeVisible();
  await expect(consent).toContainText('only your question and the current page name');
  await expect(consent).toContainText('Baseten');
  await expect(consent).toContainText('Meta Muse Spark Open');
  await expect(consent).toContainText('never change a verification result');
  await expect(page.getByTestId('guide-input')).toHaveCount(0);

  await page.getByTestId('guide-start').click();
  await expect(page.getByTestId('guide-input')).toBeFocused();

  await page.getByRole('button', { name: 'What formats and size limits are supported?' }).click();

  const assistant = page.getByTestId('guide-message-assistant');
  await expect(assistant).toBeVisible({ timeout: 30_000 });
  await expect(assistant).toContainText('JPEG');
  await expect(assistant).toContainText('20 MiB');
  await expect(assistant.getByTestId('guide-mode')).toHaveText('Reviewed reference');

  // Related links are attached server-side from the reviewed topic allowlist.
  const linkHrefs = await assistant.locator('a').evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href')),
  );

  expect(linkHrefs.length).toBeGreaterThan(0);
  for (const href of linkHrefs) {
    expect(['/', '/inspect', '/compare', '/how-to-use', '/about', '/privacy']).toContain(href);
  }

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    violations.map((violation) => `${violation.id}: ${violation.help}`),
  ).toEqual([]);
});

test('a typed question is answered and refuses to guess outside the reviewed content', async ({
  page,
}) => {
  await page.goto('/about');
  await page.getByTestId('guide-launcher').click();
  await page.getByTestId('guide-start').click();

  await page.getByTestId('guide-input').fill('How do I bake sourdough bread?');
  await page.getByTestId('guide-send').click();

  const assistant = page.getByTestId('guide-message-assistant');
  await expect(assistant).toBeVisible({ timeout: 30_000 });
  await expect(assistant).toContainText('not covered by the reviewed help content');
  await expect(assistant).not.toContainText('sourdough');
});

test('Escape closes the panel and returns focus to the launcher', async ({ page }) => {
  await page.goto('/inspect');
  await page.getByTestId('guide-launcher').click();
  await expect(page.getByTestId('guide-panel')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByTestId('guide-panel')).toHaveCount(0);
  await expect(page.getByTestId('guide-launcher')).toBeFocused();
});

test('the open guide fits a 360 px viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  await expectNoHorizontalOverflow(page);

  await page.getByTestId('guide-launcher').click();
  await expect(page.getByTestId('guide-panel')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByTestId('guide-start').click();
  await page.getByRole('button', { name: 'What data leaves my browser?' }).click();
  await expect(page.getByTestId('guide-message-assistant')).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalOverflow(page);
});
