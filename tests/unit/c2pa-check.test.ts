import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildC2paResult, type C2paCheckInput } from '@/lib/c2pa/check';
import { mapManifestStore } from '@/lib/c2pa/map';
import type { C2paInspection, MappedC2paStore } from '@/lib/c2pa/types';
import {
  checkResultSchema,
  c2paFindingSchema,
  collectDanglingC2paEvidenceRefs,
} from '@/lib/results/schemas';

const recordedStorePath = fileURLToPath(
  new URL('../fixtures/c2pa/adobe-20220124-C.sdk-0.15.4-manifest-store.json', import.meta.url),
);
const recordedStore: unknown = JSON.parse(readFileSync(recordedStorePath, 'utf8'));

const CHECK_ID = 'chk_cccccccccccc';
const FILE_ID = 'file_ffffffffffff';
const STARTED_AT = '2026-10-27T12:00:00.000Z';
const FINISHED_AT = '2026-10-27T12:00:01.000Z';

function sequentialEvidenceIds(): () => string {
  let counter = 0;

  return () => {
    counter += 1;

    return `ev_${String(counter).padStart(6, '0')}`;
  };
}

function buildInspection(overrides: Record<string, unknown> = {}): C2paInspection {
  const store = mapManifestStore({
    active_manifest: 'urn:test:active',
    manifests: {
      'urn:test:active': {
        title: 'test.jpg',
        format: 'image/jpeg',
        claim_generator: 'fixture/1.0',
        assertions: [],
        ingredients: [],
      },
    },
    validation_results: {
      activeManifest: { success: [], informational: [], failure: [] },
    },
    validation_state: 'Valid',
    ...overrides,
  });

  if (store === null) {
    throw new Error('Synthetic store did not map');
  }

  return { status: 'present', store };
}

function buildInput(inspection: C2paInspection, overrides: Partial<C2paCheckInput> = {}): C2paCheckInput {
  return {
    checkId: CHECK_ID,
    fileId: FILE_ID,
    startedAtUtc: STARTED_AT,
    finishedAtUtc: FINISHED_AT,
    inspection,
    createEvidenceId: sequentialEvidenceIds(),
    ...overrides,
  };
}

function mappedRecordedStore(): MappedC2paStore {
  const store = mapManifestStore(recordedStore);

  if (store === null) {
    throw new Error('Recorded fixture did not map');
  }

  return store;
}

describe('C2PA check and finding derivation', () => {
  it('reports the recorded fixture findings without collapsing them', () => {
    const { check, finding } = buildC2paResult(
      buildInput({ status: 'present', store: mappedRecordedStore() }),
    );

    expect(check.executionState).toBe('completed');
    expect(check.outcome).toBe('present');
    expect(check.kind).toBe('c2pa');
    expect(check.checkerName).toBe('c2pa-web');
    expect(check.checkerVersion).toBe('0.15.4');
    expect(check.rawCode).toBe('Valid');

    expect(finding).not.toBeNull();
    expect(finding?.manifestPresence).toBe('present');
    expect(finding?.manifestValidation).toBe('valid');
    expect(finding?.signatureValidation).toBe('valid');
    expect(finding?.contentBindingValidation).toBe('valid');
    expect(finding?.timestampValidation).toBe('valid');
    // The SDK reports signingCredential.untrusted because no trust anchors are
    // configured; that must never become a negative trust finding.
    expect(finding?.signerTrust).toBe('not_evaluated');
    expect(finding?.revocationStatus).toBe('not_evaluated');
    expect(finding?.trustPolicyId).toBe('originlens-embedded-only-no-trust-anchors-v1');
    expect(finding?.sdkVersion).toBe('0.15.4');
    expect(finding?.sdkCodes).toHaveLength(8);
    expect(new Set(finding?.sdkCodes).size).toBe(8);
  });

  it('produces contract-valid output with resolvable evidence references', () => {
    const { check, finding } = buildC2paResult(
      buildInput({ status: 'present', store: mappedRecordedStore() }),
    );

    expect(checkResultSchema.safeParse(check).success).toBe(true);

    if (finding === null) {
      throw new Error('Expected a finding for a present manifest');
    }

    expect(c2paFindingSchema.safeParse(finding).success).toBe(true);

    const evidenceIds = check.evidence.map((item) => item.evidenceId);
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length);
    expect(collectDanglingC2paEvidenceRefs(finding, evidenceIds)).toEqual([]);
    expect(check.evidence.every((item) => item.sourceCheckId === CHECK_ID)).toBe(true);
  });

  it('records the manifest presence, state, and recorded actions as evidence', () => {
    const { check } = buildC2paResult(
      buildInput({ status: 'present', store: mappedRecordedStore() }),
    );
    const byKey = new Map(check.evidence.map((item) => [item.key, item]));

    expect(byKey.get('c2pa.manifest.presence')?.value).toBe('present');
    expect(byKey.get('c2pa.manifest.presence')?.authority).toBe('file_measurement');
    expect(byKey.get('c2pa.manifest.validation_state')?.value).toBe('Valid');
    expect(byKey.get('c2pa.manifest.claim_generator')?.value).toBe(
      'make_test_images/0.16.1 c2pa-rs/0.16.1',
    );
    expect(byKey.get('c2pa.manifest.claim_generator')?.authority).toBe('unverified_metadata');
    expect(byKey.get('c2pa.action.0')?.value).toBe('c2pa.created');
    expect(byKey.get('c2pa.action.1')?.value).toBe('c2pa.drawing');
    expect(byKey.get('c2pa.status.claimSignature.validated')?.interpretationCode).toBe(
      'signature_valid',
    );
  });

  it('warns that signer trust was not evaluated under the no-anchor policy', () => {
    const { check, finding } = buildC2paResult(
      buildInput({ status: 'present', store: mappedRecordedStore() }),
    );

    const trustWarning = check.warnings.find((warning) => warning.includes('no trust anchors'));

    expect(trustWarning).toBeDefined();
    expect(finding?.warnings).toContain(trustWarning);
  });

  it('never promotes an unrecognized validation state to valid', () => {
    const { finding } = buildC2paResult(
      buildInput(buildInspection({ validation_state: 'PartiallyVerified' })),
    );

    expect(finding?.manifestValidation).toBe('unknown');
  });

  it('preserves an unknown SDK code without giving it a meaning', () => {
    const inspection = buildInspection({
      validation_results: {
        activeManifest: {
          success: [{ code: 'claimSignature.validated' }],
          informational: [],
          failure: [{ code: 'brandNew.failure.mode' }],
        },
      },
    });
    const { check, finding } = buildC2paResult(buildInput(inspection));

    expect(finding?.sdkCodes).toContain('brandNew.failure.mode');
    expect(finding?.signatureValidation).toBe('valid');
    expect(finding?.contentBindingValidation).toBe('unknown');
    expect(finding?.manifestValidation).toBe('valid');
    expect(check.warnings.some((warning) => warning.includes('needs interpretation'))).toBe(true);
  });

  it('treats a failure code as invalid even when the overall state says valid', () => {
    const inspection = buildInspection({
      validation_results: {
        activeManifest: {
          success: [{ code: 'claimSignature.validated' }],
          informational: [],
          failure: [{ code: 'assertion.dataHash.mismatch' }],
        },
      },
    });
    const { finding } = buildC2paResult(buildInput(inspection));

    expect(finding?.contentBindingValidation).toBe('invalid');
    expect(finding?.signatureValidation).toBe('valid');
  });

  it('maps signature and timestamp failure codes to invalid', () => {
    const inspection = buildInspection({
      validation_results: {
        activeManifest: {
          success: [],
          informational: [],
          failure: [{ code: 'claimSignature.mismatch' }, { code: 'timeStamp.mismatch' }],
        },
      },
    });
    const { finding } = buildC2paResult(buildInput(inspection));

    expect(finding?.signatureValidation).toBe('invalid');
    expect(finding?.timestampValidation).toBe('invalid');
    expect(finding?.contentBindingValidation).toBe('unknown');
  });

  it('reports a missing timestamp as not applicable rather than unverified', () => {
    const inspection = buildInspection({
      validation_results: {
        activeManifest: {
          success: [],
          informational: [{ code: 'timeStamp.missing' }],
          failure: [],
        },
      },
    });
    const { finding } = buildC2paResult(buildInput(inspection));

    expect(finding?.timestampValidation).toBe('not_applicable');
  });

  it('keeps a validator-reported missing timestamp as a negative finding', () => {
    const inspection = buildInspection({
      validation_results: {
        activeManifest: {
          success: [],
          informational: [],
          failure: [{ code: 'timeStamp.missing' }],
        },
      },
    });
    const { finding } = buildC2paResult(buildInput(inspection));

    // The SDK classified the absence as a failure; the adapter must not soften
    // it into "not applicable".
    expect(finding?.timestampValidation).toBe('invalid');
  });

  it('only reports trusted when the SDK establishes trust explicitly', () => {
    const trustedByState = buildC2paResult(
      buildInput(buildInspection({ validation_state: 'Trusted' })),
    );
    const trustedByCode = buildC2paResult(
      buildInput(
        buildInspection({
          validation_results: {
            activeManifest: {
              success: [{ code: 'signingCredential.trusted' }],
              informational: [],
              failure: [],
            },
          },
        }),
      ),
    );
    const untrustedOnly = buildC2paResult(
      buildInput(
        buildInspection({
          validation_results: {
            activeManifest: {
              success: [],
              informational: [],
              failure: [{ code: 'signingCredential.untrusted' }],
            },
          },
        }),
      ),
    );

    expect(trustedByState.finding?.signerTrust).toBe('trusted');
    expect(trustedByCode.finding?.signerTrust).toBe('trusted');
    expect(untrustedOnly.finding?.signerTrust).toBe('not_evaluated');
  });

  it('reports revocation only when the SDK reports it', () => {
    const revoked = buildC2paResult(
      buildInput(
        buildInspection({
          validation_results: {
            activeManifest: {
              success: [],
              informational: [],
              failure: [{ code: 'signingCredential.ocsp.revoked' }],
            },
          },
        }),
      ),
    );
    const good = buildC2paResult(
      buildInput(
        buildInspection({
          validation_results: {
            activeManifest: {
              success: [],
              informational: [{ code: 'signingCredential.ocsp.good' }],
              failure: [],
            },
          },
        }),
      ),
    );

    expect(revoked.finding?.revocationStatus).toBe('revoked');
    expect(good.finding?.revocationStatus).toBe('not_revoked');
  });

  it('records a manifest with no status codes as unknown, not valid', () => {
    const { finding } = buildC2paResult(buildInput(buildInspection({ validation_state: undefined })));

    expect(finding?.manifestValidation).toBe('unknown');
    expect(finding?.signatureValidation).toBe('unknown');
    expect(finding?.contentBindingValidation).toBe('unknown');
    expect(finding?.timestampValidation).toBe('not_evaluated');
  });

  it('warns when the active manifest could not be identified', () => {
    const inspection = buildInspection({
      active_manifest: 'urn:missing',
      manifests: { 'urn:a': { title: 'a' }, 'urn:b': { title: 'b' } },
    });
    const { check } = buildC2paResult(buildInput(inspection));

    expect(check.warnings.some((warning) => warning.includes('could not be identified'))).toBe(
      true,
    );
  });

  it('bounds evidence and never references an evidence item it did not keep', () => {
    const statuses = Array.from({ length: 50 }, (_, index) => ({ code: `synthetic.code.${index}` }));
    const actions = Array.from({ length: 3 }, (_, index) => ({ action: `c2pa.synthetic.${index}` }));
    const inspection = buildInspection({
      manifests: {
        'urn:test:active': {
          title: 'test.jpg',
          claim_generator: 'fixture/1.0',
          assertions: [{ label: 'c2pa.actions', data: { actions } }],
        },
      },
      validation_results: {
        activeManifest: { success: statuses, informational: [], failure: [] },
      },
    });
    const { check, finding } = buildC2paResult(buildInput(inspection));

    expect(check.evidence).toHaveLength(50);
    expect(finding?.actions).toHaveLength(0);

    if (finding === null) {
      throw new Error('Expected a finding for a present manifest');
    }

    expect(
      collectDanglingC2paEvidenceRefs(
        finding,
        check.evidence.map((item) => item.evidenceId),
      ),
    ).toEqual([]);
  });

  it('reports a missing manifest without turning absence into a finding', () => {
    const { check, finding } = buildC2paResult(buildInput({ status: 'not_present' }));

    expect(check.executionState).toBe('completed');
    expect(check.outcome).toBe('not_present');
    expect(check.evidence).toHaveLength(1);
    expect(check.evidence[0]?.interpretationCode).toBe('no_embedded_manifest');
    expect(check.limitations.join(' ')).toContain('Absence is not evidence');
    expect(finding?.manifestPresence).toBe('not_present');
    expect(finding?.manifestValidation).toBe('not_evaluated');
    expect(finding?.signerTrust).toBe('not_evaluated');
    expect(finding?.sdkCodes).toEqual([]);
  });

  it('reports an unsupported format without checking anything', () => {
    const { check, finding } = buildC2paResult(buildInput({ status: 'unsupported' }));

    expect(check.outcome).toBe('unsupported');
    expect(finding?.manifestPresence).toBe('unsupported');
    expect(check.limitations.join(' ')).toContain('outside the supported C2PA inspection set');
  });

  it('reports execution failures as failures, never as findings', () => {
    const { check, finding } = buildC2paResult(
      buildInput({ status: 'failed', errorCode: 'C2PA_READ_FAILED' }),
    );

    expect(check.executionState).toBe('failed');
    expect(check.errorCode).toBe('C2PA_READ_FAILED');
    expect(check.outcome).toBeUndefined();
    expect(check.evidence).toEqual([]);
    expect(finding).toBeNull();
  });

  it('records timeouts with a stable code', () => {
    const { check } = buildC2paResult(buildInput({ status: 'timed_out' }));

    expect(check.executionState).toBe('timed_out');
    expect(check.errorCode).toBe('C2PA_TIMEOUT');
    expect(check.outcome).toBeUndefined();
  });

  it('records cancellation without an error code or outcome', () => {
    const { check, finding } = buildC2paResult(buildInput({ status: 'cancelled' }));

    expect(check.executionState).toBe('cancelled');
    expect(check.errorCode).toBeUndefined();
    expect(check.outcome).toBeUndefined();
    expect(check.limitations.join(' ')).toContain('cancelled');
    expect(finding).toBeNull();
  });

  it('clamps a finish time that precedes the start time', () => {
    const { check } = buildC2paResult(
      buildInput({ status: 'not_present' }, { finishedAtUtc: '2026-10-27T11:59:59.000Z' }),
    );

    expect(check.finishedAtUtc).toBe(STARTED_AT);
    expect(checkResultSchema.safeParse(check).success).toBe(true);
  });

  it('keeps manifest text as sanitized text', () => {
    const inspection = buildInspection({
      manifests: {
        'urn:test:active': {
          title: '<img src=x onerror=alert(1)>\u0000',
          claim_generator: 'gen\u202Eerator',
          assertions: [],
        },
      },
    });
    const { check } = buildC2paResult(buildInput(inspection));
    const values = check.evidence.map((item) => String(item.value)).join('\n');

    expect(values).toContain('gen erator');
    expect(values).not.toMatch(/[\u0000\u202E]/);
    // Markup is preserved as inert text; it is never interpreted as HTML.
    expect(values).toContain('<img src=x onerror=alert(1)>');
  });

  it('maps invalid validation state and content binding mismatch correctly (V04)', () => {
    const inspection = buildInspection({
      validation_state: 'Invalid',
      validation_results: {
        activeManifest: {
          success: [
            { code: 'claimSignature.validated', success: true },
            { code: 'timeStamp.validated', success: true },
          ],
          failure: [{ code: 'assertion.dataHash.mismatch', success: false }],
          informational: [{ code: 'signingCredential.untrusted' }],
        },
      },
    });

    const { check, finding } = buildC2paResult(buildInput(inspection));

    expect(check.executionState).toBe('completed');
    expect(check.outcome).toBe('present');
    expect(check.rawCode).toBe('Invalid');
    expect(finding?.manifestPresence).toBe('present');
    expect(finding?.manifestValidation).toBe('invalid');
    expect(finding?.contentBindingValidation).toBe('invalid');
    expect(finding?.signatureValidation).toBe('valid');
    expect(finding?.timestampValidation).toBe('valid');
    expect(finding?.signerTrust).toBe('not_evaluated');
    expect(finding?.sdkCodes).toContain('assertion.dataHash.mismatch');
    expect(checkResultSchema.safeParse(check).success).toBe(true);
    expect(c2paFindingSchema.safeParse(finding).success).toBe(true);
  });
});

