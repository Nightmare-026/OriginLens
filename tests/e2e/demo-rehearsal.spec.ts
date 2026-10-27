import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * End-to-end automated rehearsal of the PRD Section 17 Demo Script.
 *
 * Exercises the entire 3-to-4 minute judging narrative in sequence against
 * a real production build in Chromium:
 *
 * Beat 1: Known provenance credential (adobe-20220124-C.jpg)
 * Beat 2: Absence of evidence is not evidence of absence (plain-3x2.png)
 * Beat 3: Tampered credential detection (adobe-20220124-C-tampered.jpg)
 * Beat 4: Safe failure recovery (truncated.jpg)
 * Beat 5: Provenance Delta comparison (plain-3x2.png vs plain-3x2-filtered.png)
 * Beat 6: Versioned JSON report download & privacy verification
 */

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);

  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

test('complete hackathon judging demo rehearsal', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // --- Beat 0: Hero & Start Screen ---
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('OriginLens');
  await expect(page.getByTestId('start-screen').getByText('Evidence-first media provenance')).toBeVisible();
  await expect(page.getByText('not a universal AI detector', { exact: false })).toBeVisible();

  // --- Beat 1: Known Provenance Credential ---
  await page.getByTestId('inspect-file').setInputFiles(fixturePath('adobe-20220124-C.jpg'));
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('summary-headline')).toHaveText(
    'Verified provenance evidence found',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-signature')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-binding')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-trust')).toHaveText('Not evaluated');
  await expect(page.getByTestId('coverage-summary')).toContainText('4 of 4 checks completed');
  await expect(page.getByTestId('explanation')).toContainText('Signer trust is not evaluated');

  // --- Beat 2: Evidence Absence (Not "Human-Made") ---
  await page.getByTestId('clear-session').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();

  await page.getByTestId('inspect-file').setInputFiles(fixturePath('plain-3x2.png'));
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('summary-headline')).toHaveText(
    'No supported embedded credentials found',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Not present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveCount(0);
  await expect(page.getByTestId('limitations')).toContainText(
    'Absence is not evidence that the image is unedited, human-made, or trustworthy',
  );

  // --- Beat 3: Tampered Credential (Integrity Failure without False Accusation) ---
  await page.getByTestId('clear-session').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();

  await page.getByTestId('inspect-file').setInputFiles(fixturePath('adobe-20220124-C-tampered.jpg'));
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('summary-headline')).toHaveText(
    'One or more validation issues require attention',
  );
  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveText('Invalid');
  await expect(page.getByTestId('c2pa-signature')).toHaveText('Valid');
  await expect(page.getByTestId('c2pa-binding')).toHaveText('Invalid');
  await expect(page.getByTestId('c2pa-codes')).toContainText('assertion.dataHash.mismatch');

  // --- Beat 4: Safe Failure Recovery ---
  await page.getByTestId('clear-session').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();

  await page.getByTestId('inspect-file').setInputFiles(fixturePath('truncated.jpg'));
  await expect(page.getByTestId('error-panel')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('error-code')).toHaveText('PIPELINE_DECODE_FAILED');
  await expect(page.getByTestId('ledger')).toHaveCount(0);

  // --- Beat 5: Two-File Provenance Delta ---
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath('plain-3x2-filtered.png'));
  await page.getByTestId('compare-start').click();

  await expect(page.getByTestId('compare-ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('compare-heading')).toHaveText('Two files, checked independently');

  // Add user assertions (marked as user-supplied)
  await page.getByTestId('label-select-a').selectOption('original');
  await page.getByTestId('label-select-b').selectOption('edited');

  // Delta table assertions
  const propsTable = page.getByTestId('delta-properties');
  await expect(propsTable).toContainText('Different'); // SHA-256 is different
  await expect(propsTable).toContainText('Equal'); // Byte size & dimensions equal

  // Preview measurement
  await expect(page.getByTestId('delta-preview-measured')).toBeVisible();
  await expect(page.getByTestId('delta-preview-measured')).toContainText('0 of 255');
  await expect(page.getByTestId('delta-preview-measured')).toContainText('0 of 6 (0.00%)');

  // --- Beat 6: Report Download & Privacy Defaults ---
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-report').click();
  const download = await downloadPromise;

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const reportJson = await readFile(downloadPath as string, 'utf8');
  const report = JSON.parse(reportJson) as Record<string, unknown>;

  expect(report['schemaVersion']).toBe('2.0');
  expect(report['exportOptions']).toEqual({
    includedOriginalImage: false,
    includedPreciseGps: false,
  });
  expect(report['comparison']).toBeDefined();

  const files = report['files'] as Record<string, unknown>[];
  expect(files).toHaveLength(2);
  expect(files[0]?.['userLabel']).toBe('original');
  expect(files[1]?.['userLabel']).toBe('edited');

  // Clear session resets state cleanly
  await page.getByTestId('clear-session').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('compare-ledger')).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});
