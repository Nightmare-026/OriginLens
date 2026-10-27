import { describe, expect, it } from 'vitest';
import { buildComparison, type ComparisonPreviewOutcome } from '@/lib/compare/build';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import type { FileAnalysis } from '@/lib/pipeline/types';
import { buildReport } from '@/lib/report/build';
import type { ComparisonDifferenceState } from '@/lib/results/schemas';
import {
  createHarness,
  emptyMetadata,
  extractedMetadata,
  failedMetadata,
  invalidStore,
  jpegFile,
  verifiedStore,
  type HarnessOptions,
} from './helpers/pipeline-harness';

/**
 * Provenance Delta builder (PRD 5.5).
 *
 * The delta must compare only what the checks recorded, must never convert an
 * unevaluated input into equality, and must never claim an original, an
 * ordering, or an intent. These tests assert both the recorded evidence and
 * the outcome precedence.
 */

const SKIPPED_IDENTICAL: ComparisonPreviewOutcome = {
  status: 'skipped',
  reason: 'identical_fingerprint',
};

const MEASURED_CLEAN: ComparisonPreviewOutcome = {
  status: 'measured',
  targetWidth: 64,
  targetHeight: 48,
  metric: {
    pixelCount: 64 * 48,
    meanAbsoluteChannelError: 0,
    changedPixelCount: 0,
    changedPixelShare: 0,
  },
};

async function analysisFor(options: HarnessOptions = {}): Promise<FileAnalysis> {
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

function compare(
  first: FileAnalysis,
  second: FileAnalysis,
  preview: ComparisonPreviewOutcome = SKIPPED_IDENTICAL,
  startId = 500,
) {
  let ids = startId;

  return buildComparison({
    first,
    second,
    preview,
    createId: (prefix) => `${prefix}_${String((ids += 1)).padStart(6, '0')}`,
    now: () => new Date('2026-10-27T12:30:00.000Z'),
  });
}

function unwrap(result: ReturnType<typeof compare>) {
  if (result.status !== 'ok') {
    throw new Error(`expected ok, received ${result.error.code}`);
  }

  return result;
}

function metadataStatus(
  comparison: ReturnType<typeof unwrap>['comparison'],
  field: string,
): ComparisonDifferenceState | undefined {
  return comparison.metadataFields.find((entry) => entry.field === field)?.status;
}

describe('provenance delta builder', () => {
  it('records one comparison check that belongs to both files, not to one', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const result = unwrap(compare(first, second));

    expect(result.check.kind).toBe('comparison');
    expect(result.check.fileId).toBeUndefined();
    expect(result.check.executionState).toBe('completed');
    expect(result.comparison.checkId).toBe(result.check.checkId);
    expect(result.comparison.fileIds).toEqual([first.file.fileId, second.file.fileId]);
    expect(result.evidence).toEqual(result.check.evidence);
    expect(result.check.evidence.length).toBeGreaterThan(0);

    for (const item of result.check.evidence) {
      expect(item.sourceCheckId).toBe(result.check.checkId);
    }
  });

  it('reports equal only when every compared property matches and nothing is unevaluated', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const result = unwrap(compare(first, second));

    expect(result.check.outcome).toBe('equal');
    expect(result.check.warnings).toEqual([]);
    expect(result.comparison.preview).toEqual({
      status: 'skipped',
      reason: 'identical_fingerprint',
    });
  });

  it('reports different when the fingerprints differ, without an ordering claim', async () => {
    const first = await analysisFor();
    const second = await analysisFor({
      startId: 100,
      sha256: async () => 'c'.repeat(64),
    });
    const result = unwrap(compare(first, second, MEASURED_CLEAN));

    expect(result.check.outcome).toBe('different');

    const fingerprints = result.check.evidence.find(
      (item) => item.key === 'comparison.fingerprints_equal',
    );

    expect(fingerprints?.value).toBe(false);

    // The recorded values are measurements and stable codes. The words that
    // would imply an ordering or intent appear only inside the negated
    // limitation sentences, never as a recorded value.
    const recordedValues = result.check.evidence
      .map((item) => `${item.key}=${String(item.value)}`)
      .join('|');

    expect(recordedValues).not.toMatch(/original|older|edited|tamper|authentic/i);
    expect(result.check.limitations.join(' ')).toMatch(
      /does not establish which file is older/i,
    );
  });

  it('reports inconclusive when a metadata parser failed instead of claiming equality', async () => {
    const first = await analysisFor({ inspectMetadata: () => failedMetadata() });
    const second = await analysisFor({ startId: 100, inspectMetadata: () => failedMetadata() });
    const result = unwrap(compare(first, second));

    expect(result.check.outcome).toBe('inconclusive');
    expect(metadataStatus(result.comparison, 'software')).toBe('not_evaluated');
    expect(result.check.warnings.join(' ')).toMatch(/not evaluated/i);
  });

  it('records a field present in only one file as present, not as different content', async () => {
    const first = await analysisFor({ inspectMetadata: () => extractedMetadata() });
    const second = await analysisFor({ startId: 100, inspectMetadata: () => emptyMetadata() });
    const result = unwrap(compare(first, second));

    expect(metadataStatus(result.comparison, 'software')).toBe('present_only_in_first');
    expect(metadataStatus(result.comparison, 'cameraMake')).toBe('absent_from_both');
    expect(result.check.outcome).toBe('different');
  });

  it('records a differing credential state as a difference between two recorded results', async () => {
    const first = await analysisFor({
      inspectC2pa: async () => ({ status: 'present', store: verifiedStore() }),
    });
    const second = await analysisFor({
      startId: 100,
      inspectC2pa: async () => ({ status: 'present', store: invalidStore() }),
    });
    const result = unwrap(compare(first, second));

    expect(result.check.outcome).toBe('different');

    const signature = result.check.evidence.find(
      (item) => item.key === 'comparison.c2pa.signature_validation',
    );

    expect(signature?.value).toBe('different');
  });

  it('treats an unavailable preview decode as a coverage gap, not as zero difference', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const result = unwrap(
      compare(first, second, { status: 'skipped', reason: 'decode_failed' }),
    );

    expect(result.check.outcome).toBe('inconclusive');
    expect(result.comparison.preview).toEqual({ status: 'skipped', reason: 'decode_failed' });
    expect(
      result.check.evidence.some((item) => item.key === 'comparison.preview_skip_reason'),
    ).toBe(true);
    expect(
      result.check.limitations.join(' '),
    ).toMatch(/does not record a difference of zero/i);
  });

  it('keeps a measured preview with zero changed pixels separate from the fingerprint result', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100, sha256: async () => 'd'.repeat(64) });
    const result = unwrap(compare(first, second, MEASURED_CLEAN));

    expect(result.comparison.preview).toMatchObject({
      status: 'measured',
      width: 64,
      height: 48,
      changedPixelCount: 0,
      meanAbsoluteChannelError: 0,
    });
    // The bytes differ, so the delta is different even though the preview metric is zero.
    expect(result.check.outcome).toBe('different');
    expect(result.check.limitations.join(' ')).toMatch(/not every original pixel/i);
  });

  it('never names an original, an author, or an intent in its limitations', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const result = unwrap(compare(first, second));

    const limitations = result.check.limitations.join(' ');

    expect(limitations).toMatch(/does not establish which file is older/i);
    expect(limitations).toMatch(/not evidence of tampering/i);
    expect(limitations).not.toMatch(/confirmed|verified as|authentic/i);
  });

  it('feeds a validated two-file report', async () => {
    const first = await analysisFor();
    const second = await analysisFor({ startId: 100 });
    const result = unwrap(compare(first, second, MEASURED_CLEAN));

    const report = buildReport({
      analyses: [first, second],
      comparison: result,
      now: new Date('2026-10-27T12:31:00.000Z'),
      createId: () => 'rpt_000001',
    });

    expect(report.status).toBe('ok');

    if (report.status === 'ok') {
      expect(report.report.comparison?.checkId).toBe(result.check.checkId);
      expect(report.report.checks.filter((check) => check.kind === 'comparison')).toHaveLength(1);
      expect(report.report.summaryCodes).toEqual(first.summaryCodes.filter((code) => second.summaryCodes.includes(code)));
    }
  });
});
