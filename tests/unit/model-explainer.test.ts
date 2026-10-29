import { describe, expect, it } from 'vitest';
import {
  hasForbiddenClaim,
  validateResponseClaims,
  validateEvidenceIdCitations,
} from '@/lib/model-explainer/claims';
import { generateDeterministicFallback } from '@/lib/model-explainer/fallback';
import { projectReportToExplainPayload } from '@/lib/model-explainer/payload';
import { explainRequestSchema } from '@/lib/model-explainer/schema';
import { explainReportEvidence } from '@/lib/model-explainer/service';
import type { OriginLensReport } from '@/lib/results/schemas';

describe('Model Explainer (P1-001) Unit Tests', () => {
  const sampleReport: OriginLensReport = {
    schemaVersion: '2.0',
    reportId: 'rpt_test_sample_123',
    createdAtUtc: '2026-10-27T12:00:00.000Z',

    appVersion: '0.1.0',
    trustPolicyId: 'c2pa_default_v1',
    summaryCodes: ['no_supported_embedded_credentials'],
    files: [
      {
        fileId: 'file_test_abc_123',
        displayName: 'my_secret_photo.jpg',
        byteSize: 10240,
        sha256: 'a'.repeat(64),
        detectedMimeType: 'image/jpeg',
        width: 800,
        height: 600,
        decodePipelineVersion: 'originlens-browser-decode/1',
      },
    ],
    checks: [
      {
        checkId: 'chk_c2pa_123',
        fileId: 'file_test_abc_123',
        kind: 'c2pa',
        executionState: 'completed',
        outcome: 'not_present',
        checkerName: 'c2pa-web',
        evidence: [],
        warnings: [],
        limitations: ['Manifest not found in JPEG stream'],
      },
      {
        checkId: 'chk_sha_123',
        fileId: 'file_test_abc_123',
        kind: 'fingerprint',
        executionState: 'completed',
        outcome: 'extracted',
        checkerName: 'webcrypto-sha256',
        evidence: [],
        warnings: [],
        limitations: [],
      },
    ],
    evidence: [
      {
        evidenceId: 'ev_sha256_hash_1',
        sourceCheckId: 'chk_sha_123',
        key: 'sha256',
        valueType: 'hash',
        value: 'a'.repeat(64),
        authority: 'file_measurement',
      },
      {
        evidenceId: 'ev_manifest_status_2',
        sourceCheckId: 'chk_c2pa_123',
        key: 'manifest_present',
        valueType: 'boolean',
        value: false,
        authority: 'cryptographic_validation',
      },
    ],
    disclaimers: ['Absence of credentials does not prove human creation.'],
    exportOptions: {
      includedOriginalImage: false,
      includedPreciseGps: false,
    },
  };


  it('projects report into safe payload without original client filenames, image bytes, or evidence values', () => {
    const payload = projectReportToExplainPayload(sampleReport);
    expect(payload.schemaVersion).toBe('2.0');
    expect(payload.consent).toBe(true);

    // Verify displayName is excluded
    expect((payload.report.files[0] as Record<string, unknown>).displayName).toBeUndefined();

    // Verify evidence values (which may contain metadata or manifest text) are excluded
    for (const item of payload.report.evidence) {
      expect((item as Record<string, unknown>).value).toBeUndefined();
    }

    // Verify strict schema validation passes
    const result = explainRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('detects forbidden claims accurately', () => {
    expect(hasForbiddenClaim('This image is 100% authentic')).toBe(true);
    expect(hasForbiddenClaim('Evidence confirms this was human-made')).toBe(true);
    expect(hasForbiddenClaim('The photo has been tampered with')).toBe(true);
    expect(hasForbiddenClaim('This is a fake image')).toBe(true);
    expect(hasForbiddenClaim('No C2PA manifest was detected in the file')).toBe(false);
    expect(hasForbiddenClaim('Cryptographic SHA-256 fingerprint computed')).toBe(false);
  });

  it('rejects responses that include forbidden claims or unknown evidence citations', () => {
    const badResponse = {
      plainLanguageSummary: 'This image is confirmed authentic by provenance checks.',
      whatThisSupports: [
        {
          evidenceIds: ['ev_sha256_hash_1'],
          text: 'The image has not been tampered with.',
        },
      ],
      whatRemainsUnknown: [],
      nextChecks: [],
    };

    const claimsCheck = validateResponseClaims(badResponse);
    expect(claimsCheck.valid).toBe(false);

    const goodResponse = {
      plainLanguageSummary: 'The file was fingerprinted and checked for embedded credentials.',
      whatThisSupports: [
        {
          evidenceIds: ['ev_non_existent_id'],
          text: 'Hash matches recorded input.',
        },
      ],
      whatRemainsUnknown: [],
      nextChecks: [],
    };

    const knownIds = new Set(['ev_sha256_hash_1', 'ev_manifest_status_2']);
    const citationCheck = validateEvidenceIdCitations(goodResponse, knownIds);
    expect(citationCheck.valid).toBe(false);
    expect(citationCheck.unknownId).toBe('ev_non_existent_id');
  });

  it('generates a valid deterministic fallback without crashing', () => {
    const request = projectReportToExplainPayload(sampleReport);
    const fallback = generateDeterministicFallback(request, 'Test fallback reason');

    expect(fallback.mode).toBe('deterministic_fallback');
    expect(fallback.modelUsed).toBe('rule-based-deterministic-template');
    expect(fallback.plainLanguageSummary).toContain('No supported embedded C2PA credential');
    expect(fallback.whatThisSupports.length).toBeGreaterThan(0);
    expect(fallback.whatRemainsUnknown.length).toBeGreaterThan(0);

    // Every cited evidence ID must exist in the request; no synthetic IDs.
    const known = new Set(request.report.evidence.map((e) => e.evidenceId));
    for (const item of [...fallback.whatThisSupports, ...fallback.whatRemainsUnknown]) {
      for (const id of item.evidenceIds) {
        expect(known.has(id)).toBe(true);
      }
    }
  });

  it('falls back deterministically when model explanation is disabled', async () => {
    const request = projectReportToExplainPayload(sampleReport);
    const result = await explainReportEvidence(request, { enabled: false });

    expect(result.mode).toBe('deterministic_fallback');
    expect(result.reason).toContain('disabled');
  });

  it('falls back deterministically when API key is missing', async () => {
    const request = projectReportToExplainPayload(sampleReport);
    const result = await explainReportEvidence(request, { enabled: true, apiKey: '' });

    expect(result.mode).toBe('deterministic_fallback');
    expect(result.reason).toContain('No Model API key');
  });

  it('does not assume a provider endpoint or model', async () => {
    const request = projectReportToExplainPayload(sampleReport);
    const result = await explainReportEvidence(request, {
      enabled: true,
      apiKey: 'test-only-key',
      baseURL: undefined,
      modelName: undefined,
    });

    expect(result.mode).toBe('deterministic_fallback');
    expect(result.reason).toContain('No model endpoint configured');
  });
});
