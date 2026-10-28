import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Provenance Delta in a real production build (PRD 5.5, Stage 6).
 *
 * Fixture expectations come from tests/fixtures/manifest.json, never from a
 * filename. The cases covered here are the acceptance rows that need a real
 * browser:
 * - V17 duplicate exact file: one fingerprint, no invented pixel difference;
 * - V18 same image, two encodings: byte difference and preview metric stay separate;
 * - V19 different aspect ratios: no misleading pixel metric;
 * - V26 user cancels during work: completed coverage survives, no delta is invented;
 * - V48 same filename, different files: session IDs and hashes stay separate;
 * - V49 user-supplied original/edited labels.
 *
 * Nothing here asserts which file is the original. The app must never claim it.
 */

const ADOBE_SHA256 = '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864';
const PLAIN_SHA256 = 'bdff0e0944f020878bfc277e5977ae6a598422812b68cbe67620c6de85e45045';
const PNG_SHA256 = '55da44a11728930a62c75c7607cdbd466d20f5847742c6a4f6748c28e8f89103';
const PNG_FILTERED_SHA256 = '7e0ee3192f407fafbe484eed266f7c0348434df2f0ef8c30a7fb4f6eb496d200';

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);

  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

async function startComparison(page: Page): Promise<void> {
  await page.getByTestId('compare-start').click();
  await expect(page.getByTestId('compare-ledger')).toBeVisible({ timeout: 90_000 });
}

async function compareFixtures(page: Page, first: string, second: string): Promise<void> {
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath(first));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath(second));
  await startComparison(page);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} was not a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function asRecords(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} was not a JSON array.`);
  }

  return (value as unknown[]).map((entry, index) => asRecord(entry, `${label}[${index}]`));
}

async function downloadReport(
  page: Page,
): Promise<{ raw: string; report: Record<string, unknown> }> {
  const downloadPromise = page.waitForEvent('download');

  await page.getByTestId('download-report').click();

  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^originlens-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/,
  );

  const downloadPath = await download.path();

  if (downloadPath === null) {
    throw new Error('The report download produced no file.');
  }

  const raw = await readFile(downloadPath, 'utf8');

  return { raw, report: asRecord(JSON.parse(raw) as unknown, 'report') };
}

test('V17: comparing a duplicate file reports equal, without a pixel difference', async ({
  page,
}) => {
  await page.goto('/compare');

  await compareFixtures(page, 'plain-3x2.png', 'plain-3x2.png');

  await expect(page.getByTestId('a-file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('b-file-sha256')).toHaveText(PNG_SHA256);

  // Two independent analyses keep separate session identifiers even when the
  // bytes are identical.
  const firstFileId = await page.getByTestId('a-file-id').innerText();
  const secondFileId = await page.getByTestId('b-file-id').innerText();

  expect(firstFileId).not.toBe(secondFileId);

  await expect(page.getByTestId('delta-outcome')).toHaveText('Every compared property is equal');
  await expect(page.getByTestId('delta-execution-state')).toHaveText('Completed');

  const properties = page.getByTestId('delta-properties');

  await expect(properties.getByRole('row', { name: /SHA-256 of the original bytes/ })).toContainText(
    'Equal',
  );
  await expect(properties.getByRole('row', { name: /Byte size/ })).toContainText('Equal');

  // A skipped preview is stated as skipped, never as a measured difference of zero.
  await expect(page.getByTestId('delta-preview-skipped')).toContainText(
    'identical SHA-256 fingerprint',
  );
  await expect(page.getByTestId('delta-preview-no-pixels')).toContainText(
    'not a difference of zero',
  );
  await expect(page.getByTestId('delta-preview-measured')).toHaveCount(0);

  const comparisonCheck = page.getByTestId('delta-check-comparison');

  await expect(comparisonCheck).toContainText('Completed');
  await expect(comparisonCheck).toContainText('Equal');
});

test('V18: a different encoding keeps the byte delta and the preview metric separate', async ({
  page,
}) => {
  await page.goto('/compare');

  await compareFixtures(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  await expect(page.getByTestId('a-file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('b-file-sha256')).toHaveText(PNG_FILTERED_SHA256);

  const properties = page.getByTestId('delta-properties');

  // Same decoded size, same byte length, different bytes.
  await expect(properties.getByRole('row', { name: /SHA-256 of the original bytes/ })).toContainText(
    'Different',
  );
  await expect(properties.getByRole('row', { name: /Byte size/ })).toContainText('Equal');
  await expect(properties.getByRole('row', { name: /Dimensions/ })).toContainText('Equal');

  const measured = page.getByTestId('delta-preview-measured');

  await expect(measured).toContainText('3 × 2 px');
  await expect(measured).toContainText('0 of 255');
  await expect(measured).toContainText('0 of 6 (0.00%)');
  await expect(page.getByTestId('delta-preview-note')).toContainText(
    'resampled to the same target size',
  );

  // The bytes differ, so the delta is different even though the preview shows
  // no changed pixel. Neither figure is allowed to explain the other.
  await expect(page.getByTestId('delta-outcome')).toHaveText(
    'At least one compared property differs',
  );
  await expect(page.getByTestId('delta-outcome-description')).toContainText(
    'does not identify which file is original',
  );
});

test('V19: different aspect ratios produce no pixel metric', async ({ page }) => {
  await page.goto('/compare');

  await compareFixtures(page, 'plain-1x1.jpg', 'plain-3x2.png');

  await expect(page.getByTestId('delta-preview-skipped')).toContainText('the aspect ratios differ');
  await expect(page.getByTestId('delta-preview-no-pixels')).toBeVisible();
  await expect(page.getByTestId('delta-preview-measured')).toHaveCount(0);

  await expect(
    page.getByTestId('delta-properties').getByRole('row', { name: /Dimensions/ }),
  ).toContainText('Different');
  await expect(page.getByTestId('delta-outcome')).toHaveText(
    'At least one compared property differs',
  );
});

test('V48: two files with the same display name stay separate', async ({ page }) => {
  const firstBytes = await readFile(fixturePath('plain-1x1.jpg'));
  const secondBytes = await readFile(fixturePath('adobe-20220124-C.jpg'));

  await page.goto('/compare');

  await page
    .getByTestId('compare-file-a')
    .setInputFiles({ name: 'capture.jpg', mimeType: 'image/jpeg', buffer: firstBytes });
  await page
    .getByTestId('compare-file-b')
    .setInputFiles({ name: 'capture.jpg', mimeType: 'image/jpeg', buffer: secondBytes });

  await startComparison(page);

  await expect(page.getByTestId('a-file-name')).toHaveText('capture.jpg');
  await expect(page.getByTestId('b-file-name')).toHaveText('capture.jpg');
  await expect(page.getByTestId('a-file-sha256')).toHaveText(PLAIN_SHA256);
  await expect(page.getByTestId('b-file-sha256')).toHaveText(ADOBE_SHA256);

  const firstFileId = await page.getByTestId('a-file-id').innerText();
  const secondFileId = await page.getByTestId('b-file-id').innerText();

  expect(firstFileId).not.toBe(secondFileId);

  await expect(
    page.getByTestId('delta-properties').getByRole('row', { name: /SHA-256/ }),
  ).toContainText('Different');
});

test('V49: original/edited labels are recorded as the user assertion', async ({ page }) => {
  await page.goto('/compare');

  await compareFixtures(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  await page.getByTestId('label-select-a').selectOption('original');
  await page.getByTestId('label-select-b').selectOption('edited');

  await expect(page.getByTestId('a-user-label')).toHaveText('Original');
  await expect(page.getByTestId('b-user-label')).toHaveText('Edited');
  await expect(page.getByTestId('a-user-label-note')).toContainText("user's own assertion");
  await expect(page.getByTestId('b-user-label-note')).toContainText("user's own assertion");

  const labelRow = page.getByTestId('delta-properties').getByRole('row', {
    name: /User-supplied label/,
  });

  await expect(labelRow).toContainText('original');
  await expect(labelRow).toContainText('edited');
  await expect(labelRow).toContainText('Not compared by the app');

  // Attaching a label cannot change what the checks established.
  await expect(page.getByTestId('delta-outcome')).toHaveText(
    'At least one compared property differs',
  );

  const { report } = await downloadReport(page);
  const files = asRecords(report['files'], 'files');

  expect(files).toHaveLength(2);
  expect(files[0]?.['userLabel']).toBe('original');
  expect(files[1]?.['userLabel']).toBe('edited');
});

test('downloads a validated two-file report with the comparison block', async ({ page }) => {
  await page.goto('/compare');

  await compareFixtures(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  const { raw, report } = await downloadReport(page);

  expect(report['schemaVersion']).toBe('2.0');
  expect(report['exportOptions']).toEqual({
    includedOriginalImage: false,
    includedPreciseGps: false,
  });

  const files = asRecords(report['files'], 'files');

  expect(files).toHaveLength(2);
  expect(files[0]?.['sha256']).toBe(PNG_SHA256);
  expect(files[1]?.['sha256']).toBe(PNG_FILTERED_SHA256);
  expect(files[0]?.['userLabel']).toBeUndefined();
  expect(files[1]?.['userLabel']).toBeUndefined();

  const comparison = asRecord(report['comparison'], 'comparison');

  expect(comparison['fileIds']).toEqual([files[0]?.['fileId'], files[1]?.['fileId']]);

  const comparisonChecks = asRecords(report['checks'], 'checks').filter(
    (check) => check['kind'] === 'comparison',
  );

  expect(comparisonChecks).toHaveLength(1);
  expect(comparisonChecks[0]?.['fileId']).toBeUndefined();
  expect(comparison['checkId']).toBe(comparisonChecks[0]?.['checkId']);

  const preview = asRecord(comparison['preview'], 'comparison.preview');

  expect(preview).toMatchObject({
    status: 'measured',
    width: 3,
    height: 2,
    pixelCount: 6,
    meanAbsoluteChannelError: 0,
    channelThreshold: 16,
    changedPixelCount: 0,
    changedPixelShare: 0,
  });

  // Summary codes are the intersection of both files, so neither file's finding
  // is claimed on behalf of the other.
  expect(report['summaryCodes']).toEqual(['no_supported_embedded_credentials']);

  const disclaimers = report['disclaimers'];

  expect(Array.isArray(disclaimers)).toBe(true);
  expect((disclaimers as unknown[]).length).toBeGreaterThan(0);
  expect(raw).toContain('does not identify an original');
  expect(raw).toContain('only when they hold for every file');
  expect(raw).not.toContain('data:image');
  expect(raw).not.toMatch(/"latitude"|"longitude"/i);
});

test('V26: cancelling during File A keeps its completed evidence and records no delta', async ({
  page,
}) => {
  // A writable holder, so the test body and the route handler can share it
  // without relying on a mutable local captured by a callback.
  const wasmGate: { release: (() => void) | null } = { release: null };

  // Only the same-origin credential runtime is held back, so the cancel lands
  // while a check is genuinely running rather than at an arbitrary moment.
  await page.route('**/c2pa_bg.wasm', async (route) => {
    await new Promise<void>((resolve) => {
      wasmGate.release = resolve;
    });

    try {
      await route.abort();
    } catch {
      // The page may already be closing; there is nothing left to release.
    }
  });

  await page.goto('/compare');
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath('plain-3x2-filtered.png'));
  await page.getByTestId('compare-start').click();

  await expect(page.getByTestId('a-stage-c2pa')).toContainText('Running', { timeout: 60_000 });

  await page.getByTestId('cancel-button').click();

  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('session-notice')).toContainText('cancelled during File A');
  await expect(page.getByTestId('file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('check-c2pa')).toContainText('Cancelled');
  await expect(page.getByTestId('coverage-summary')).toContainText('3 of 4 checks completed');
  await expect(page.getByTestId('coverage-summary')).toContainText('1 cancelled');

  // File B never started and no delta was recorded.
  await expect(page.getByTestId('compare-ledger')).toHaveCount(0);
  await expect(page.getByTestId('progress-panel')).toHaveCount(0);
  await expect(page.getByTestId('delta-check-comparison')).toHaveCount(0);

  wasmGate.release?.();
});

test('keeps File A evidence when File B cannot be analysed', async ({ page }) => {
  await page.goto('/compare');
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath('truncated.jpg'));
  await page.getByTestId('compare-start').click();

  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('session-notice')).toContainText('File B could not be analysed');
  await expect(page.getByTestId('session-notice')).toContainText('PIPELINE_DECODE_FAILED');
  await expect(page.getByTestId('file-sha256')).toHaveText(PNG_SHA256);
  await expect(page.getByTestId('summary-headline')).toHaveText(
    'No supported embedded credentials found',
  );
  await expect(page.getByTestId('compare-ledger')).toHaveCount(0);

  // The surviving result exports as an honest single-file report.
  const { report } = await downloadReport(page);
  const files = asRecords(report['files'], 'files');

  expect(files).toHaveLength(1);
  expect(files[0]?.['sha256']).toBe(PNG_SHA256);
  expect(report['comparison']).toBeUndefined();
});

test('fits the comparison screen in a 360 px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/compare');

  await compareFixtures(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  await expect(page.getByTestId('compare-ledger')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('V20: non-upright EXIF orientation skips pixel preview metric with honest explanation', async ({
  page,
}) => {
  await page.goto('/compare');
  await compareFixtures(page, 'plain-1x1.jpg', 'exif-orientation-6.jpg');

  await expect(page.getByTestId('compare-ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('delta-preview-skipped')).toBeVisible();
  await expect(page.getByTestId('delta-preview-skipped')).toContainText(
    'Skipped: an orientation value could not be normalized',
  );
  await expect(page.getByTestId('delta-preview-no-pixels')).toHaveText(
    'No pixel difference was recorded. This is not a difference of zero.',
  );
  await expect(page.getByTestId('delta-metadata-orientation')).toContainText(
    'Only in File B',
  );
});


