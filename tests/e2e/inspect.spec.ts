import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 5 product flow in a real production build: start screen, real pinned
 * C2PA inspection, Evidence Ledger, report download, clear/reset, keyboard, and
 * a narrow viewport. Fixture expectations come from tests/fixtures/manifest.json
 * and the recorded SDK output, never from a filename.
 */

const ADOBE_SHA256 = '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864';
const PLAIN_SHA256 = 'bdff0e0944f020878bfc277e5977ae6a598422812b68cbe67620c6de85e45045';
const PNG_SHA256 = '55da44a11728930a62c75c7607cdbd466d20f5847742c6a4f6748c28e8f89103';

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);

  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

async function analyze(page: Page, fixture: string): Promise<void> {
  await page.getByTestId('inspect-file').setInputFiles(fixturePath(fixture));
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

test('inspects the verified credential fixture and keeps trust unevaluated', async ({ page }) => {
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByText('JPEG and PNG only')).toBeVisible();

  await analyze(page, 'adobe-20220124-C.jpg');

  await expect(page.getByTestId('summary-headline')).toHaveText(
    'Verified provenance evidence found',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-signature')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-binding')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-trust')).toHaveText('Not evaluated');
  await expect(page.getByTestId('c2pa-revocation')).toHaveText('Not evaluated');
  await expect(page.getByTestId('file-sha256')).toHaveText(ADOBE_SHA256);
  await expect(page.getByTestId('file-facts')).toContainText('image/jpeg');
  await expect(page.getByTestId('file-facts')).toContainText(/\d+ × \d+ px/);
  await expect(page.getByTestId('coverage-summary')).toContainText('4 of 4 checks completed');
  await expect(page.getByTestId('coverage-summary')).toContainText('0 failed');
  await expect(page.getByTestId('explanation')).toContainText('Signer trust is not evaluated');
  await expect(page.getByTestId('limitations')).toContainText(
    'This is not a real-or-fake verdict',
  );
  await expect(page.getByTestId('c2pa-codes')).toContainText('claimSignature.validated');

  expect(pageErrors).toEqual([]);
});

test('reports a missing manifest without turning absence into a verdict', async ({ page }) => {
  await page.goto('/');
  await analyze(page, 'plain-1x1.jpg');

  await expect(page.getByTestId('summary-headline')).toHaveText(
    'No supported embedded credentials found',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Not present');
  await expect(page.getByTestId('file-sha256')).toHaveText(PLAIN_SHA256);
  await expect(page.getByTestId('coverage-summary')).toContainText('4 of 4 checks completed');
  await expect(page.getByTestId('metadata-gps')).toBeVisible();
  await expect(page.getByText('No selected metadata fields were found by the configured parser.')).toBeVisible();
  await expect(page.getByTestId('limitations')).toContainText(
    'Absence is not evidence that the image is unedited',
  );
  await expect(page.getByTestId('explanation')).toContainText('not evidence that metadata was deliberately removed');
});

test('inspects a valid PNG with no embedded credential and keeps local evidence complete', async ({
  page,
}) => {
  await page.goto('/');
  await analyze(page, 'plain-3x2.png');

  await expect(page.getByTestId('summary-headline')).toHaveText(
    'No supported embedded credentials found',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Not present');
  await expect(page.getByTestId('file-facts')).toContainText('image/png');
  await expect(page.getByTestId('file-facts')).toContainText('3 × 2 px');
  await expect(page.getByTestId('file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('coverage-summary')).toContainText('4 of 4 checks completed');
  await expect(page.getByText('No selected metadata fields were found by the configured parser.')).toBeVisible();
});

test('recovers from a malformed file and keeps the session usable', async ({ page }) => {
  await page.goto('/');

  await page
    .getByTestId('inspect-file')
    .setInputFiles(fixturePath('truncated.jpg'));

  await expect(page.getByTestId('error-panel')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('error-code')).toHaveText('PIPELINE_DECODE_FAILED');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('ledger')).toHaveCount(0);

  await analyze(page, 'adobe-20220124-C.jpg');
  await expect(page.getByTestId('file-sha256')).toHaveText(ADOBE_SHA256);
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
});

test('downloads a validated JSON report without image bytes or GPS', async ({ page }) => {
  await page.goto('/');
  await analyze(page, 'adobe-20220124-C.jpg');

  const downloadPromise = page.waitForEvent('download');

  await page.getByTestId('download-report').click();

  const download = await downloadPromise;
  const fileName = download.suggestedFilename();

  expect(fileName).toMatch(/^originlens-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);

  const downloadPath = await download.path();

  expect(downloadPath).not.toBeNull();

  const raw = await readFile(downloadPath as string, 'utf8');
  const report = JSON.parse(raw) as Record<string, unknown>;

  expect(report['schemaVersion']).toBe('2.0');
  expect(report['exportOptions']).toEqual({
    includedOriginalImage: false,
    includedPreciseGps: false,
  });

  const files = report['files'] as { sha256: string; displayName: string }[];

  expect(files).toHaveLength(1);
  expect(files[0]?.sha256).toBe(ADOBE_SHA256);
  expect(raw).not.toContain('data:image');
  expect(raw).not.toMatch(/"latitude"|"longitude"/i);
  expect(raw).toContain('not a digitally signed forensic certificate');
});

test('keeps the result usable and retryable when the report download fails', async ({ page }) => {
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);

    URL.createObjectURL = (object: Blob | MediaSource): string => {
      if (object instanceof Blob && object.type === 'application/json') {
        throw new Error('simulated object URL failure');
      }

      return original(object);
    };
  });

  await page.goto('/');
  await analyze(page, 'adobe-20220124-C.jpg');

  await page.getByTestId('download-report').click();

  await expect(page.getByTestId('download-error')).toBeVisible();
  await expect(page.getByTestId('download-error')).toContainText(
    'could not be prepared for download',
  );
  await expect(page.getByTestId('ledger')).toBeVisible();
  await expect(page.getByTestId('file-sha256')).toHaveText(ADOBE_SHA256);

  // The failure is recoverable: the same control is still available.
  await expect(page.getByTestId('download-report')).toBeEnabled();
});

test('keeps local evidence when the browser is offline for the credential runtime', async ({
  page,
  context,
}) => {
  await page.goto('/');
  // The app shell and decoder are local; only the same-origin WASM fetch can
  // fail. That must degrade to a failed check, never to a fabricated result.
  await context.setOffline(true);

  await analyze(page, 'plain-3x2.png');

  await expect(page.getByTestId('summary-headline')).toHaveText('Evidence incomplete');
  await expect(page.getByTestId('check-metadata')).toContainText('Completed');
  await expect(page.getByTestId('check-c2pa')).toContainText('Failed');
  await expect(page.getByTestId('check-c2pa')).toContainText('C2PA_RUNTIME_UNAVAILABLE');
  await expect(page.getByTestId('coverage-summary')).toContainText('3 of 4 checks completed');
  await expect(page.getByTestId('coverage-summary')).toContainText('1 failed');
  await expect(page.getByTestId('file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('explanation')).toContainText('credential check failed');
});

test('discards the previous result when another file is inspected', async ({ page }) => {
  await page.goto('/');
  await analyze(page, 'adobe-20220124-C.jpg');

  await page.getByTestId('inspect-another').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('ledger')).toHaveCount(0);

  await analyze(page, 'plain-1x1.jpg');

  await expect(page.getByTestId('file-sha256')).toHaveText(PLAIN_SHA256);
  await expect(page.getByTestId('summary-headline')).toHaveText(
    'No supported embedded credentials found',
  );
});

test('clears the session and returns to an honest start screen', async ({ page }) => {
  await page.goto('/');
  await analyze(page, 'adobe-20220124-C.jpg');

  await page.getByTestId('clear-session').click();

  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('session-notice')).toContainText('Session cleared');
  await expect(page.getByTestId('ledger')).toHaveCount(0);
});

test('keeps the workflow keyboard reachable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('compare-start')).toBeDisabled();

  let reachedFileInput = false;

  for (let attempt = 0; attempt < 10 && !reachedFileInput; attempt += 1) {
    await page.keyboard.press('Tab');
    reachedFileInput = await page
      .getByTestId('inspect-file')
      .evaluate((element) => element === document.activeElement);
  }

  expect(reachedFileInput).toBe(true);

  await analyze(page, 'adobe-20220124-C.jpg');

  await page.getByTestId('download-report').focus();
  await expect(page.getByTestId('download-report')).toBeFocused();

  const downloadPromise = page.waitForEvent('download');

  await page.keyboard.press('Enter');
  await downloadPromise;
});

test('fits a 360 px viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  await expectNoHorizontalOverflow(page);

  await analyze(page, 'adobe-20220124-C.jpg');
  await expect(page.getByTestId('ledger')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('V04: inspects a mutated credential fixture and reports invalid validation truthfully', async ({
  page,
}) => {
  await page.goto('/');
  await analyze(page, 'adobe-20220124-C-tampered.jpg');

  await expect(page.getByTestId('summary-headline')).toHaveText(
    'One or more validation issues require attention',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveText('Invalid');
  await expect(page.getByTestId('c2pa-signature')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-binding')).toHaveText('Invalid');
  await expect(page.getByTestId('c2pa-trust')).toHaveText('Not evaluated');
  await expect(page.getByTestId('c2pa-codes')).toContainText('assertion.dataHash.mismatch');
});

