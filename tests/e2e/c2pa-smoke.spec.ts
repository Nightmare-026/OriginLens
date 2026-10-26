import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Real-browser coverage for the C2PA path. These tests run against a production
 * build because WebAssembly compilation, the inline worker, the same-origin
 * asset fetch, and reader cleanup only exist in that environment.
 *
 * Fixture paths are derived from the resolved config file rather than
 * `import.meta.url`, because Playwright loads TypeScript specs as CommonJS when
 * the package is not an ES module.
 */

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);

  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

type SmokeCheck = {
  checkId: string;
  executionState: string;
  outcome?: string;
  errorCode?: string;
  rawCode?: string;
  checkerName: string;
  checkerVersion?: string;
  evidence: { evidenceId: string; sourceCheckId: string }[];
  warnings: string[];
  limitations: string[];
};

type SmokeFinding = {
  manifestPresence: string;
  manifestValidation: string;
  signatureValidation: string;
  contentBindingValidation: string;
  signerTrust: string;
  timestampValidation: string;
  revocationStatus: string;
  sdkCodes: string[];
  warnings: string[];
};

type SmokeReport = {
  runCount: number;
  inspectionStatus: string;
  check: SmokeCheck;
  finding: SmokeFinding | null;
  danglingEvidenceRefs: string[];
};

async function readReport(page: Page): Promise<SmokeReport | null> {
  const raw = await page.getByTestId('smoke-json').textContent();

  if (raw === null || raw.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(raw) as SmokeReport;
  } catch {
    return null;
  }
}

async function runFixture(
  page: Page,
  fixture: string,
  previousCheckId?: string,
): Promise<SmokeReport> {
  await page.getByTestId('smoke-file').setInputFiles(fixture);

  // Wait for a *new* completed report. Returning `null` keeps polling, so a
  // still-running or previous report can never satisfy the condition.
  await expect
    .poll(
      async () => {
        const report = await readReport(page);

        return report === null || report.check.checkId === previousCheckId
          ? null
          : report.check.checkId;
      },
      { timeout: 90_000 },
    )
    .not.toBeNull();

  const report = await readReport(page);

  expect(report).not.toBeNull();

  return report as SmokeReport;
}

test('reports the real credential fixture without promoting trust', async ({ page }) => {
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/dev/c2pa-smoke');
  const report = await runFixture(page, fixturePath('adobe-20220124-C.jpg'));

  expect(report.inspectionStatus).toBe('present');
  expect(report.check.executionState).toBe('completed');
  expect(report.check.outcome).toBe('present');
  expect(report.check.rawCode).toBe('Valid');
  expect(report.check.checkerName).toBe('c2pa-web');
  expect(report.check.checkerVersion).toBe('0.15.4');
  expect(report.check.evidence.length).toBeGreaterThan(0);
  expect(report.check.warnings.join(' ')).toContain('no trust anchors');
  expect(report.danglingEvidenceRefs).toEqual([]);

  expect(report.finding).not.toBeNull();

  const finding = report.finding as SmokeFinding;

  expect(finding.manifestPresence).toBe('present');
  expect(finding.manifestValidation).toBe('valid');
  expect(finding.signatureValidation).toBe('valid');
  expect(finding.contentBindingValidation).toBe('valid');
  expect(finding.timestampValidation).toBe('valid');
  expect(finding.signerTrust).toBe('not_evaluated');
  expect(finding.revocationStatus).toBe('not_evaluated');
  expect(finding.sdkCodes).toContain('signingCredential.untrusted');
  expect(finding.warnings.join(' ')).toContain('no trust anchors');

  const evidenceIds = report.check.evidence.map((item) => item.evidenceId);

  expect(new Set(evidenceIds).size).toBe(evidenceIds.length);
  expect(report.check.evidence.every((item) => item.sourceCheckId === report.check.checkId)).toBe(
    true,
  );
  expect(pageErrors).toEqual([]);
});

test('reports a missing manifest without turning absence into a finding', async ({ page }) => {
  await page.goto('/dev/c2pa-smoke');
  const report = await runFixture(page, fixturePath('plain-1x1.jpg'));

  expect(report.inspectionStatus).toBe('not_present');
  expect(report.check.executionState).toBe('completed');
  expect(report.check.outcome).toBe('not_present');
  expect(report.check.evidence).toHaveLength(1);
  expect(report.check.limitations.join(' ')).toContain('Absence is not evidence');

  expect(report.finding).not.toBeNull();

  const finding = report.finding as SmokeFinding;

  expect(finding.manifestPresence).toBe('not_present');
  expect(finding.manifestValidation).toBe('not_evaluated');
  expect(finding.signatureValidation).toBe('not_evaluated');
  expect(finding.signerTrust).toBe('not_evaluated');
  expect(finding.revocationStatus).toBe('not_evaluated');
  expect(finding.sdkCodes).toEqual([]);
});

test('recovers after a malformed file and keeps one runtime', async ({ page }) => {
  await page.goto('/dev/c2pa-smoke');

  const broken = await runFixture(page, fixturePath('truncated.jpg'));

  expect(broken.inspectionStatus).toBe('failed');
  expect(broken.check.executionState).toBe('failed');
  expect(broken.check.errorCode).toBe('C2PA_READ_FAILED');
  expect(broken.check.outcome).toBeUndefined();
  expect(broken.finding).toBeNull();

  const recovered = await runFixture(page, fixturePath('adobe-20220124-C.jpg'), broken.check.checkId);

  expect(recovered.inspectionStatus).toBe('present');
  expect(recovered.check.outcome).toBe('present');
  expect(recovered.runCount).toBe(2);
});

test('survives a missing WebAssembly asset and recovers after a new session', async ({ page }) => {
  await page.goto('/dev/c2pa-smoke');

  await page.getByTestId('smoke-missing-wasm').check();

  const unavailable = await runFixture(page, fixturePath('adobe-20220124-C.jpg'));

  expect(unavailable.inspectionStatus).toBe('failed');
  expect(unavailable.check.errorCode).toBe('C2PA_RUNTIME_UNAVAILABLE');
  expect(unavailable.check.outcome).toBeUndefined();
  expect(unavailable.finding).toBeNull();

  await page.getByTestId('smoke-missing-wasm').uncheck();

  const recovered = await runFixture(page, fixturePath('adobe-20220124-C.jpg'));

  expect(recovered.inspectionStatus).toBe('present');
  expect(recovered.check.outcome).toBe('present');
  expect(recovered.danglingEvidenceRefs).toEqual([]);
});

test('keeps repeated runs independent and stable', async ({ page }) => {
  await page.goto('/dev/c2pa-smoke');

  const reports: SmokeReport[] = [];
  let previousCheckId: string | undefined;

  for (let index = 0; index < 3; index += 1) {
    const report = await runFixture(page, fixturePath('adobe-20220124-C.jpg'), previousCheckId);

    reports.push(report);
    previousCheckId = report.check.checkId;
  }

  expect(reports.map((report) => report.runCount)).toEqual([1, 2, 3]);
  expect(new Set(reports.map((report) => report.check.checkId)).size).toBe(3);

  for (const report of reports) {
    expect(report.inspectionStatus).toBe('present');
    expect(report.danglingEvidenceRefs).toEqual([]);
  }
});

test('clears the session and can start a new one', async ({ page }) => {
  await page.goto('/dev/c2pa-smoke');

  const first = await runFixture(page, fixturePath('adobe-20220124-C.jpg'));

  await page.getByTestId('smoke-clear').click();

  await expect(page.getByTestId('smoke-status')).toHaveText('idle');
  await expect(page.getByTestId('smoke-json')).toHaveText('');

  const second = await runFixture(page, fixturePath('adobe-20220124-C.jpg'), first.check.checkId);

  expect(second.inspectionStatus).toBe('present');
  expect(second.runCount).toBe(1);
  expect(second.check.checkId).not.toBe(first.check.checkId);
});
