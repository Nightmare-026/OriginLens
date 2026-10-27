import { describe, expect, it } from 'vitest';
import { buildComparison, type ComparisonOutput } from '@/lib/compare/build';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  buildReport,
  reportFileName,
  REPORT_DISCLAIMERS,
  COMPARISON_REPORT_DISCLAIMER,
} from '@/lib/report/build';
import { reportSchema } from '@/lib/results/schemas';
import {
  createHarness,
  extractedMetadata,
  jpegFile,
  verifiedStore,
} from './helpers/pipeline-harness';

/**
 * Report export contract (PRD 9.6). The report is the only artifact that
 * leaves the session, so it must be runtime-valid, free of image bytes and
 * precise location data, and explicit about what it is not.
 */

async function analysisFor(
  options: Parameters<typeof createHarness>[0] = {},
): Promise<FileAnalysis> {
  const harness = createHarness(options);
  const result = await runFileAnalysis(
    { file: jpegFile(), signal: harness.controller.signal },
    harness.deps,
  );

  if (result.status !== 'ok') {
    throw new Error(`expected ok, received ${result.status}`);
  }

  return result.analysis;
}

let reportCounter = 0;

function build(
  analyses: readonly FileAnalysis[],
  comparison?: ComparisonOutput,
) {
  reportCounter += 1;

  return buildReport({
    analyses,
    ...(comparison === undefined ? {} : { comparison }),
    now: new Date('2026-10-27T18:30:00.000Z'),
    createId: () => `rpt_${String(reportCounter).padStart(6, '0')}`,
  });
}

function comparisonFor(
  first: FileAnalysis,
  second: FileAnalysis,
  startId: number,
): ComparisonOutput {
  let ids = startId;

  return buildComparison({
    first,
    second,
    preview: { status: 'skipped', reason: 'identical_fingerprint' },
    createId: (prefix) => `${prefix}_${String((ids += 1)).padStart(6, '0')}`,
    now: () => new Date('2026-10-27T18:30:01.000Z'),
  });
}

describe('buildReport', () => {
  it('produces a validated report whose cross-references all resolve', async () => {
    const analysis = await analysisFor({
      inspectC2pa: async () => ({ status: 'present', store: verifiedStore() }),
    });
    const result = build([analysis]);

    expect(result.status).toBe('ok');

    if (result.status !== 'ok') {
      throw new Error('expected a report');
    }

    const { report, json } = result;

    expect(report.schemaVersion).toBe('2.0');
    expect(report.appVersion).toBe('0.1.0');
    expect(report.createdAtUtc).toBe('2026-10-27T18:30:00.000Z');
    expect(report.files).toHaveLength(1);
    expect(report.checks.map((check) => check.kind)).toEqual([
      'intake',
      'fingerprint',
      'metadata',
      'c2pa',
    ]);
    expect(report.evidence).toHaveLength(analysis.evidence.length);
    expect(report.trustPolicyId).toBe('originlens-embedded-only-no-trust-anchors-v1');
    expect(report.summaryCodes).toEqual(['verified_provenance_evidence_found']);

    const reparsed = reportSchema.parse(JSON.parse(json) as unknown);
    expect(reparsed).toEqual(report);
  });

  it('excludes image bytes and precise GPS by construction', async () => {
    const analysis = await analysisFor({ inspectMetadata: () => extractedMetadata() });
    const result = build([analysis]);

    if (result.status !== 'ok') {
      throw new Error('expected a report');
    }

    expect(result.report.exportOptions).toEqual({
      includedOriginalImage: false,
      includedPreciseGps: false,
    });

    expect(result.json).not.toContain('data:image');
    expect(result.json).not.toContain('/9j/');
    expect(result.json).not.toContain('ffd8ffe0');
    expect(result.json).not.toMatch(/gps\.(latitude|longitude)/i);
    expect(result.json).not.toMatch(/"latitude"|"longitude"/i);
  });

  it('records what the report is not, in exported text', async () => {
    const analysis = await analysisFor();
    const result = build([analysis]);

    if (result.status !== 'ok') {
      throw new Error('expected a report');
    }

    expect(result.report.disclaimers).toEqual([...REPORT_DISCLAIMERS]);
    expect(result.report.disclaimers.join(' ')).toContain('not a digitally signed forensic certificate');
    expect(result.report.disclaimers.join(' ')).toContain('No image bytes');
    expect(result.report.disclaimers.join(' ')).toContain('Absence of an embedded credential');
  });

  it('derives a filename from the timestamp, never from the uploaded name', async () => {
    const analysis = await analysisFor();
    const result = build([analysis]);

    if (result.status !== 'ok') {
      throw new Error('expected a report');
    }

    const name = reportFileName(result.report);

    expect(name).toBe('originlens-report-2026-10-27T18-30-00-000Z.json');
    expect(name).not.toContain('sample');
  });

  it('accepts two files with a comparison and rejects an empty or oversized set', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const comparison = comparisonFor(first, second, 200);

    expect(comparison.status).toBe('ok');

    const two = build([first, second], comparison);
    expect(two.status).toBe('ok');

    if (two.status === 'ok') {
      expect(two.report.files).toHaveLength(2);
      expect(two.report.checks).toHaveLength(9);
      expect(two.report.comparison?.preview).toEqual({
        status: 'skipped',
        reason: 'identical_fingerprint',
      });
      expect(two.report.disclaimers).toContain(COMPARISON_REPORT_DISCLAIMER);
      expect(two.report.summaryCodes).toEqual(['no_supported_embedded_credentials']);
    }

    expect(build([]).status).toBe('error');
    expect(build([first, second, first]).status).toBe('error');
  });

  it('rejects a two-file report without a usable comparison', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });

    expect(build([first, second]).status).toBe('error');
    expect(build([first], comparisonFor(first, second, 300)).status).toBe('error');
  });

  it('rejects a two-file report whose identifiers collide', async () => {
    const first = await analysisFor();
    const second = await analysisFor();

    const result = build([first, second], comparisonFor(first, second, 400));

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIPELINE_CONTRACT_VIOLATION');
    }
  });
});
