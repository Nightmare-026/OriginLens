import { describe, expect, it } from 'vitest';
import { buildC2paResult } from '@/lib/c2pa/check';
import type { C2paInspection } from '@/lib/c2pa/types';
import {
  buildCoverage,
  summarize,
  SUMMARY_DESCRIPTIONS,
  SUMMARY_HEADLINES,
} from '@/lib/pipeline/summary';
import {
  SUMMARY_CODES,
  type CheckKind,
  type CheckResult,
  type ExecutionState,
} from '@/lib/results/schemas';
import { invalidStore, verifiedStore } from './helpers/pipeline-harness';

/**
 * Stage 7 aggregation rules. The matrix pins precedence so a later change
 * cannot silently let missing evidence read as a success or a failure.
 */

let counter = 0;

function check(
  kind: CheckKind,
  executionState: ExecutionState,
  extra: Partial<CheckResult> = {},
): CheckResult {
  counter += 1;

  return {
    checkId: `chk_${String(counter).padStart(6, '0')}`,
    fileId: 'file_000001',
    kind,
    executionState,
    checkerName: 'test-checker',
    evidence: [],
    warnings: [],
    limitations: [],
    ...(executionState === 'completed' ? { outcome: 'present' as const } : {}),
    ...(executionState === 'failed' || executionState === 'timed_out'
      ? { errorCode: 'TEST_FAILURE' }
      : {}),
    ...extra,
  };
}

function findingFrom(inspection: C2paInspection) {
  const output = buildC2paResult({
    checkId: 'chk_900001',
    fileId: 'file_000001',
    startedAtUtc: '2026-10-27T12:00:00.000Z',
    finishedAtUtc: '2026-10-27T12:00:01.000Z',
    inspection,
    createEvidenceId: () => `ev_9${String((counter += 1)).padStart(5, '0')}`,
  });

  return { check: output.check, finding: output.finding };
}

function baseChecks(): CheckResult[] {
  return [
    check('intake', 'completed', { outcome: 'detected' }),
    check('fingerprint', 'completed', { outcome: 'extracted' }),
    check('metadata', 'completed', { outcome: 'extracted' }),
  ];
}

describe('summarize - precedence matrix', () => {
  it('never returns an empty list', () => {
    expect(summarize({ checks: [], findings: [] })).toEqual(['evidence_incomplete']);
  });

  it('reports no supported credentials only when the credential check completed as absent', () => {
    const checks = [...baseChecks(), check('c2pa', 'completed', { outcome: 'not_present' })];

    expect(summarize({ checks, findings: [] })).toEqual(['no_supported_embedded_credentials']);
  });

  it('does not convert a failed credential check into "no credentials"', () => {
    const checks = [...baseChecks(), check('c2pa', 'failed')];

    expect(summarize({ checks, findings: [] })).toEqual(['evidence_incomplete']);
  });

  it('does not convert a skipped or cancelled credential check into "no credentials"', () => {
    expect(
      summarize({ checks: [...baseChecks(), check('c2pa', 'skipped')], findings: [] }),
    ).toEqual(['evidence_incomplete']);
    expect(
      summarize({ checks: [...baseChecks(), check('c2pa', 'cancelled')], findings: [] }),
    ).toEqual(['evidence_incomplete']);
  });

  it('does not convert an unsupported outcome into "no credentials"', () => {
    const checks = [...baseChecks(), check('c2pa', 'completed', { outcome: 'unsupported' })];

    expect(summarize({ checks, findings: [] })).toEqual(['evidence_incomplete']);
  });

  it('reports verified evidence when every credential component validates', () => {
    const verified = findingFrom({ status: 'present', store: verifiedStore() });

    expect(
      summarize({
        checks: [...baseChecks(), verified.check],
        findings: verified.finding === null ? [] : [verified.finding],
      }),
    ).toEqual(['verified_provenance_evidence_found']);
  });

  it('puts a validation issue ahead of verified evidence', () => {
    const invalid = findingFrom({ status: 'present', store: invalidStore() });

    expect(
      summarize({
        checks: [...baseChecks(), invalid.check],
        findings: invalid.finding === null ? [] : [invalid.finding],
      }),
    ).toEqual(['validation_issues_require_attention']);
  });

  it('treats an invalid timestamp validation as a validation issue', () => {
    const verified = findingFrom({ status: 'present', store: verifiedStore() });
    if (verified.finding === null) throw new Error('Expected a finding');

    const finding = { ...verified.finding, timestampValidation: 'invalid' as const };

    expect(
      summarize({
        checks: [...baseChecks(), verified.check],
        findings: [finding],
      }),
    ).toEqual(['validation_issues_require_attention', 'verified_provenance_evidence_found']);
  });

  it('keeps verified evidence visible next to incomplete coverage', () => {
    const verified = findingFrom({ status: 'present', store: verifiedStore() });
    const checks = [
      check('intake', 'completed', { outcome: 'detected' }),
      check('fingerprint', 'completed', { outcome: 'extracted' }),
      check('metadata', 'failed'),
      verified.check,
    ];

    expect(
      summarize({
        checks,
        findings: verified.finding === null ? [] : [verified.finding],
      }),
    ).toEqual(['verified_provenance_evidence_found', 'evidence_incomplete']);
  });

  it('treats a credential check that is still queued or running as incomplete', () => {
    expect(summarize({ checks: [check('c2pa', 'running')], findings: [] })).toEqual([
      'evidence_incomplete',
    ]);
  });

  it('reports incomplete when a manifest is present but nothing validates', () => {
    const unknown = findingFrom({ status: 'present', store: { ...verifiedStore(), validationState: 'Unknown', statusEntries: [] } });

    expect(
      summarize({
        checks: [...baseChecks(), unknown.check],
        findings: unknown.finding === null ? [] : [unknown.finding],
      }),
    ).toEqual(['evidence_incomplete']);
  });

  it('every summary code has a headline and a description that avoids verdict language', () => {
    for (const code of SUMMARY_CODES) {
      const text = `${SUMMARY_HEADLINES[code]} ${SUMMARY_DESCRIPTIONS[code]}`;

      expect(SUMMARY_HEADLINES[code].length).toBeGreaterThan(0);
      expect(SUMMARY_DESCRIPTIONS[code].length).toBeGreaterThan(0);
      expect(text).not.toMatch(
        /\bfake image\b|\b100%\b|\bprobability\b|\bdeepfake\b|forensically certified|verified by meta/i,
      );
      // Every description must state an explicit limitation of the finding.
      expect(text).toMatch(/\bnot\b|\bnothing\b|\bdoes not\b/i);
    }
  });
});

describe('buildCoverage', () => {
  it('counts execution states separately from outcomes', () => {
    const coverage = buildCoverage([
      check('intake', 'completed', { outcome: 'unsupported' }),
      check('fingerprint', 'completed', { outcome: 'inconclusive' }),
      check('metadata', 'completed', { outcome: 'extracted' }),
      check('c2pa', 'skipped'),
      check('c2pa', 'cancelled'),
      check('c2pa', 'failed'),
      check('c2pa', 'timed_out'),
    ]);

    expect(coverage).toEqual({
      total: 7,
      completed: 3,
      skipped: 1,
      cancelled: 1,
      failed: 1,
      timedOut: 1,
      unsupported: 1,
      inconclusive: 1,
    });
  });

  it('never counts queued or running work as completed coverage', () => {
    const coverage = buildCoverage([check('c2pa', 'queued'), check('c2pa', 'running')]);

    expect(coverage.total).toBe(2);
    expect(coverage.completed).toBe(0);
  });
});
