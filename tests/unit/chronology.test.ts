import { describe, expect, it } from 'vitest';
import {
  evaluateChronology,
  formatDurationDelta,
} from '@/lib/compare/chronology';
import type { FileAnalysis } from '@/lib/pipeline/types';

function createDummyAnalysis(overrides: Partial<FileAnalysis> = {}): FileAnalysis {
  return {
    file: {
      fileId: 'file_111111111111',
      displayName: 'sample.jpg',
      detectedMimeType: 'image/jpeg',
      byteSize: 100000,
      width: 1920,
      height: 1080,
      sha256: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864',
      decodePipelineVersion: 'originlens-browser-decode/1',
    },
    checks: [],
    finding: null,
    evidence: [],
    metadata: null,
    summaryCodes: ['no_supported_embedded_credentials'],
    explanation: 'Test explanation',
    cancelled: false,
    ...overrides,
  };
}

describe('Provenance Chronology & Temporal Ordering Determination (Feature 6)', () => {
  it('formats duration deltas accurately into human readable strings', () => {
    expect(formatDurationDelta(1000 * 60 * 5)).toBe('5 minutes');
    expect(formatDurationDelta(1000 * 60 * 60 * 3 + 1000 * 60 * 15)).toBe('3 hours, 15 min');
    expect(formatDurationDelta(1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 2)).toBe('5 days, 2 hr');
    expect(formatDurationDelta(1000 * 60 * 60 * 24 * 45)).toBe('1 month, 15 d');
    expect(formatDurationDelta(1000 * 60 * 60 * 24 * 400)).toContain('1 year');
  });

  it('determines File A predates File B with cryptographically signed C2PA timestamps', () => {
    const fileA = createDummyAnalysis({
      file: {
        fileId: 'file_aaaaaaaaaaaa',
        displayName: 'ancestor.jpg',
        detectedMimeType: 'image/jpeg',
        byteSize: 100000,
        width: 1920,
        height: 1080,
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        decodePipelineVersion: '1',
      },
      finding: {
        manifestPresence: 'present',
        manifestValidation: 'valid',
        signatureValidation: 'valid',
        contentBindingValidation: 'valid',
        signerTrust: 'not_evaluated',
        timestampValidation: 'valid',
        revocationStatus: 'not_evaluated',
        trustPolicyId: 'policy',
        sdkVersion: '0.15.4',
        sdkCodes: [],
        actions: [],
        ingredients: [],
        warnings: [],
      },
      checks: [
        {
          checkId: 'chk_c2pa_a',
          kind: 'c2pa',
          executionState: 'completed',
          checkerName: 'c2pa-web',
          evidence: [
            {
              evidenceId: 'ev_time_a',
              sourceCheckId: 'chk_c2pa_a',
              key: 'c2pa.signature.time',
              value: '2023-01-24T10:00:00.000Z',
              valueType: 'timestamp',
              authority: 'cryptographic_validation',
            },
          ],
          warnings: [],
          limitations: [],
        },
      ],
    });

    const fileB = createDummyAnalysis({
      file: {
        fileId: 'file_bbbbbbbbbbbb',
        displayName: 'derivative.jpg',
        detectedMimeType: 'image/jpeg',
        byteSize: 100000,
        width: 1920,
        height: 1080,
        sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        decodePipelineVersion: '1',
      },
      finding: {
        manifestPresence: 'present',
        manifestValidation: 'valid',
        signatureValidation: 'valid',
        contentBindingValidation: 'valid',
        signerTrust: 'not_evaluated',
        timestampValidation: 'valid',
        revocationStatus: 'not_evaluated',
        trustPolicyId: 'policy',
        sdkVersion: '0.15.4',
        sdkCodes: [],
        actions: [],
        ingredients: [],
        warnings: [],
      },
      checks: [
        {
          checkId: 'chk_c2pa_b',
          kind: 'c2pa',
          executionState: 'completed',
          checkerName: 'c2pa-web',
          evidence: [
            {
              evidenceId: 'ev_time_b',
              sourceCheckId: 'chk_c2pa_b',
              key: 'c2pa.signature.time',
              value: '2024-01-24T10:00:00.000Z',
              valueType: 'timestamp',
              authority: 'cryptographic_validation',
            },
          ],
          warnings: [],
          limitations: [],
        },
      ],
    });

    const evalResult = evaluateChronology(fileA, fileB);

    expect(evalResult.determination).toBe('file_a_predates_file_b');
    expect(evalResult.authority).toBe('cryptographically_signed_c2pa');
    expect(evalResult.isCryptographicallyVerified).toBe(true);
    expect(evalResult.formattedDelta).toContain('1 year');
    expect(evalResult.explanation).toContain('predates File B');
  });

  it('determines File B predates File A when File B has earlier C2PA timestamp', () => {
    const fileA = createDummyAnalysis({
      checks: [
        {
          checkId: 'chk_c2pa_a',
          kind: 'c2pa',
          executionState: 'completed',
          checkerName: 'c2pa-web',
          evidence: [
            {
              evidenceId: 'ev_time_a',
              sourceCheckId: 'chk_c2pa_a',
              key: 'c2pa.signature.time',
              value: '2024-06-01T12:00:00.000Z',
              valueType: 'timestamp',
              authority: 'cryptographic_validation',
            },
          ],
          warnings: [],
          limitations: [],
        },
      ],
      finding: {
        manifestPresence: 'present',
        manifestValidation: 'valid',
        signatureValidation: 'valid',
        contentBindingValidation: 'valid',
        signerTrust: 'not_evaluated',
        timestampValidation: 'valid',
        revocationStatus: 'not_evaluated',
        trustPolicyId: 'policy',
        sdkVersion: '0.15.4',
        sdkCodes: [],
        actions: [],
        ingredients: [],
        warnings: [],
      },
    });

    const fileB = createDummyAnalysis({
      checks: [
        {
          checkId: 'chk_c2pa_b',
          kind: 'c2pa',
          executionState: 'completed',
          checkerName: 'c2pa-web',
          evidence: [
            {
              evidenceId: 'ev_time_b',
              sourceCheckId: 'chk_c2pa_b',
              key: 'c2pa.signature.time',
              value: '2024-05-01T12:00:00.000Z',
              valueType: 'timestamp',
              authority: 'cryptographic_validation',
            },
          ],
          warnings: [],
          limitations: [],
        },
      ],
      finding: {
        manifestPresence: 'present',
        manifestValidation: 'valid',
        signatureValidation: 'valid',
        contentBindingValidation: 'valid',
        signerTrust: 'not_evaluated',
        timestampValidation: 'valid',
        revocationStatus: 'not_evaluated',
        trustPolicyId: 'policy',
        sdkVersion: '0.15.4',
        sdkCodes: [],
        actions: [],
        ingredients: [],
        warnings: [],
      },
    });

    const evalResult = evaluateChronology(fileA, fileB);
    expect(evalResult.determination).toBe('file_b_predates_file_a');
    expect(evalResult.formattedDelta).toContain('1 month');
  });

  it('falls back to camera EXIF clue with unverified warning when signed C2PA timestamps are absent', () => {
    const fileA = createDummyAnalysis({
      metadata: {
        status: 'extracted',
        fields: [
          {
            key: 'captureTime',
            label: 'Capture Time',
            value: '2022-04-10T12:00:00.000Z',
            valueType: 'text',
            authority: 'unverified_metadata',
          },
        ],
        gpsPresence: 'not_present',
        orientationStatus: 'upright',
        parser: { name: 'exifreader', version: '4.52.0' },
        warnings: [],
        limitations: [],
      },
    });

    const fileB = createDummyAnalysis({
      metadata: {
        status: 'extracted',
        fields: [
          {
            key: 'captureTime',
            label: 'Capture Time',
            value: '2022-04-12T12:00:00.000Z',
            valueType: 'text',
            authority: 'unverified_metadata',
          },
        ],
        gpsPresence: 'not_present',
        orientationStatus: 'upright',
        parser: { name: 'exifreader', version: '4.52.0' },
        warnings: [],
        limitations: [],
      },
    });

    const evalResult = evaluateChronology(fileA, fileB);

    expect(evalResult.determination).toBe('file_a_predates_file_b');
    expect(evalResult.authority).toBe('unverified_camera_exif');
    expect(evalResult.isCryptographicallyVerified).toBe(false);
    expect(evalResult.formattedDelta).toBe('2 days');
    expect(evalResult.warnings[0]).toContain('unverified metadata clues');
  });

  it('returns inconclusive with honest uncertainty when timestamps are absent', () => {
    const fileA = createDummyAnalysis();
    const fileB = createDummyAnalysis();

    const evalResult = evaluateChronology(fileA, fileB);

    expect(evalResult.determination).toBe('inconclusive');
    expect(evalResult.authority).toBe('none');
    expect(evalResult.deltaMs).toBeNull();
    expect(evalResult.formattedDelta).toBeNull();
    expect(evalResult.explanation).toContain('Inconclusive — Timestamps absent or unverified');
    expect(evalResult.warnings[0]).toContain('never guesses chronology');
  });
});
