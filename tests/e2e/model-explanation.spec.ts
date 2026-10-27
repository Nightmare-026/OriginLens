import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);
  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

test.describe('P1-001 Meta Model Explainer Flow', () => {
  test('displays consent dialog and executes explanation flow with accessibility', async ({
    page,
  }) => {
    await page.goto('/');

    // Upload an image to start inspection
    const fileInput = page.getByTestId('inspect-file');
    await fileInput.setInputFiles(fixturePath('plain-1x1.jpg'));

    // Wait for ledger to render
    const ledger = page.getByTestId('ledger');
    await expect(ledger).toBeVisible({ timeout: 60_000 });

    // Explainer button is visible in evidence explanation section
    const openBtn = page.getByTestId('btn-open-explainer');
    await expect(openBtn).toBeVisible();

    // Click to open consent dialog
    await openBtn.click();
    const consentDialog = page.getByTestId('consent-dialog');
    await expect(consentDialog).toBeVisible();

    // Verify privacy disclosure text
    await expect(consentDialog).toContainText('does not send your image bytes');
    await expect(consentDialog).toContainText('Meta Llama 3.2 11B');

    // Run axe audit on consent dialog
    const axeConsent = await new AxeBuilder({ page }).analyze();
    expect(axeConsent.violations).toEqual([]);

    // Click confirm to request explanation
    const confirmBtn = page.getByTestId('btn-confirm-explain');
    await confirmBtn.click();

    // Wait for explanation result card (allow up to 90s for cloud inference)
    const resultCard = page.getByTestId('explanation-card');
    await expect(resultCard).toBeVisible({ timeout: 90_000 });


    // Verify explanation components
    const modeBadge = page.getByTestId('explanation-mode-badge');
    await expect(modeBadge).toBeVisible();

    const summary = page.getByTestId('ai-summary');
    await expect(summary).toBeVisible();
    const summaryText = await summary.textContent();
    expect(summaryText && summaryText.length > 10).toBe(true);

    // Run axe audit on the rendered explanation
    const axeResult = await new AxeBuilder({ page }).analyze();
    expect(axeResult.violations).toEqual([]);
  });
});
