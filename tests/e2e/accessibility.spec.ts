import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility, responsive behaviour, and the shipped security policy
 * (PRD 5.6, FR-014, V37, V38).
 *
 * The lightweight checks here are structural and are asserted directly:
 * one page heading per screen, announced session transitions, focus moving to
 * new content, `aria-busy` while checks run, and labelled controls. The
 * automated axe pass covers the rules a human reviewer cannot check by eye,
 * and it runs against the real production build with the real C2PA runtime.
 *
 * Nothing here asserts that the app is certifiably accessible: it records which
 * automated rules pass, on which screens, with which tool version.
 */

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function fixturePath(name: string): string {
  const { configFile } = test.info().config;
  const projectRoot = configFile === undefined ? process.cwd() : path.dirname(configFile);

  return path.join(projectRoot, 'tests', 'fixtures', 'c2pa', name);
}

type Violation = AxeResults['violations'][number];

function describeViolations(violations: readonly Violation[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) =>
          node.target.map((entry) => (typeof entry === 'string' ? entry : '[]')).join(' '),
        )
        .join(', ');

      return `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} -> ${targets}`;
    })
    .join('\n');
}

async function analyze(page: Page, fixture: string): Promise<void> {
  await page.getByTestId('inspect-file').setInputFiles(fixturePath(fixture));
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
}

async function startComparison(page: Page, first: string, second: string): Promise<void> {
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath(first));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath(second));
  await page.getByTestId('compare-start').click();
  await expect(page.getByTestId('compare-ledger')).toBeVisible({ timeout: 90_000 });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
}

test('the start screen has no automated WCAG A/AA violation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

  expect(violations, describeViolations(violations)).toEqual([]);
});

test('the evidence ledger has no automated WCAG A/AA violation', async ({ page }) => {
  await page.goto('/');
  await analyze(page, 'adobe-20220124-C.jpg');

  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

  expect(violations, describeViolations(violations)).toEqual([]);
});

test('the comparison screen has no automated WCAG A/AA violation', async ({ page }) => {
  await page.goto('/');
  await startComparison(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

  expect(violations, describeViolations(violations)).toEqual([]);
});

test('keeps one page heading per screen and moves focus to the result', async ({ page }) => {
  await page.goto('/');

  const headings = page.locator('h1');

  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText('OriginLens');

  await analyze(page, 'adobe-20220124-C.jpg');

  // The completed result is announced and receives focus, so a keyboard user
  // continues from the new content instead of a removed control.
  await expect(page.getByTestId('session-announcement')).toHaveText(
    'Analysis complete. The Evidence Ledger is ready.',
  );
  await expect(page.getByTestId('ledger-heading')).toBeFocused();
  await expect(headings).toHaveCount(1);

  // Clearing returns to the start screen and announces it without stealing
  // focus back into the removed result.
  await page.getByTestId('inspect-another').click();

  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('session-announcement')).toContainText(
    'The previous analysis was discarded',
  );
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText('OriginLens');
});

test('the comparison result also has one page heading and takes focus', async ({ page }) => {
  await page.goto('/');
  await startComparison(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByTestId('session-announcement')).toHaveText(
    'Comparison complete. The Provenance Delta is ready.',
  );
  await expect(page.getByTestId('compare-heading')).toBeFocused();
});

test('marks a running check as busy and announces the start', async ({ page }) => {
  const wasmGate: { release: (() => void) | null } = { release: null };

  await page.route('**/c2pa_bg.wasm', async (route) => {
    await new Promise<void>((resolve) => {
      wasmGate.release = resolve;
    });

    try {
      await route.continue();
    } catch {
      // The page may already be closing; there is nothing left to release.
    }
  });

  await page.goto('/');
  await page.getByTestId('inspect-file').setInputFiles(fixturePath('plain-3x2.png'));

  await expect(page.getByTestId('stage-c2pa')).toContainText('Running', { timeout: 60_000 });
  await expect(page.getByTestId('progress-panel')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('session-announcement')).toHaveText('Analysis started.');

  // A single-file run owns the page heading while it is in progress.
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Checking');

  wasmGate.release?.();
  await expect(page.getByTestId('ledger')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('progress-panel')).toHaveCount(0);
});

test('the running comparison has one page heading of its own', async ({ page }) => {
  const wasmGate: { release: (() => void) | null } = { release: null };

  await page.route('**/c2pa_bg.wasm', async (route) => {
    await new Promise<void>((resolve) => {
      wasmGate.release = resolve;
    });

    try {
      await route.continue();
    } catch {
      // Nothing left to release.
    }
  });

  await page.goto('/');
  await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath('plain-3x2-filtered.png'));
  await page.getByTestId('compare-start').click();

  await expect(page.getByTestId('a-stage-c2pa')).toContainText('Running', { timeout: 60_000 });
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Comparing two files');
  await expect(page.getByTestId('a-progress-panel')).toHaveAttribute('aria-busy', 'true');

  wasmGate.release?.();
  await expect(page.getByTestId('compare-ledger')).toBeVisible({ timeout: 90_000 });
});

test('every start-screen control is reachable by Tab and has an accessible name', async ({
  page,
}) => {
  await page.goto('/');

  type Stop = Readonly<{ id: string; name: string; focusVisible: boolean }>;

  const tabStops = async (limit: number): Promise<Stop[]> => {
    const stops: Stop[] = [];

    for (let attempt = 0; attempt < limit; attempt += 1) {
      await page.keyboard.press('Tab');

      const stop = await page.evaluate(() => {
        const active = document.activeElement;

        if (active === null || active === document.body) {
          return null;
        }

        const label =
          active.getAttribute('aria-label') ??
          (active instanceof HTMLInputElement ? active.labels?.[0]?.textContent : null) ??
          active.textContent ??
          '';

        return {
          id:
            active.id !== ''
              ? active.id
              : (active.getAttribute('data-testid') ?? active.tagName.toLowerCase()),
          name: label.trim().replace(/\s+/g, ' '),
          focusVisible: active.matches(':focus-visible'),
        };
      });

      if (stop === null) {
        break;
      }

      // A visible focus indicator is required for every stop.
      expect(stop.focusVisible, `focus was not visible on ${stop.id}`).toBe(true);
      expect(stop.name, `focus stop ${stop.id} has no accessible name`).not.toBe('');
      stops.push(stop);

      if (stops.length >= limit) {
        break;
      }
    }

    return stops;
  };

  const withoutFiles = await tabStops(8);

  expect(withoutFiles.map((stop) => stop.id)).toContain('inspect-file');
  expect(withoutFiles.map((stop) => stop.id)).toContain('compare-file-a');
  expect(withoutFiles.map((stop) => stop.id)).toContain('compare-file-b');

  // A disabled action is correctly skipped rather than announced as available.
  expect(withoutFiles.map((stop) => stop.id)).not.toContain('compare-start');

  await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
  await page.getByTestId('compare-file-b').setInputFiles(fixturePath('plain-3x2-filtered.png'));

  // Reset focus to the document so the second pass starts from the top.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  const withFiles = await tabStops(8);

  expect(withFiles.map((stop) => stop.id)).toContain('compare-start');
  await expect(page.getByTestId('compare-start')).toBeEnabled();
});

test('the running screen fits a 360 px viewport and keeps the headers exposed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await startComparison(page, 'plain-3x2.png', 'plain-3x2-filtered.png');

  await expectNoHorizontalOverflow(page);

  // The stacked layout must not drop the column headers from the accessibility
  // tree: they are visually hidden, not removed.
  await expect(
    page.getByTestId('delta-properties').getByRole('columnheader', { name: 'File A' }),
  ).toHaveCount(1);
  await expect(
    page.getByTestId('delta-properties').getByRole('rowheader', { name: 'Byte size' }),
  ).toHaveCount(1);
});

test('serves the production security policy and still runs the credential check', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const refused: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();

    if (/content security policy|refused to/i.test(text)) {
      refused.push(text);
    }
  });

  const response = await page.goto('/');

  expect(response).not.toBeNull();

  const headers = response?.headers() ?? {};
  const csp = headers['content-security-policy'] ?? '';

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
  expect(csp).toContain("worker-src 'self' blob:");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-frame-options']).toBe('DENY');

  // The policy is only meaningful if the real runtime compiles WebAssembly
  // inside its blob worker under it.
  await analyze(page, 'adobe-20220124-C.jpg');

  await expect(page.getByTestId('c2pa-presence')).toHaveText('Present');
  await expect(page.getByTestId('c2pa-manifest')).toHaveText('Valid');

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(refused, refused.join('\n')).toEqual([]);
});
