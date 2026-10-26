import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  CHECK_KINDS,
  COMMON_OUTCOMES,
  EVIDENCE_AUTHORITIES,
  EVIDENCE_VALUE_TYPES,
  EXECUTION_STATES,
  MANIFEST_PRESENCE_STATES,
  REVOCATION_STATES,
  SIGNER_TRUST_STATES,
  SUMMARY_CODES,
  VALIDATION_STATES,
  c2paFindingSchema,
  checkKindSchema,
  checkResultSchema,
  commonOutcomeSchema,
  collectDanglingC2paEvidenceRefs,
  evidenceAuthoritySchema,
  evidenceItemSchema,
  evidenceValueTypeSchema,
  executionStateSchema,
  fileRecordSchema,
  manifestPresenceSchema,
  reportSchema,
  revocationStatusSchema,
  signerTrustSchema,
  summaryCodeSchema,
  validationStateSchema,
  type C2paFinding,
  type CheckResult,
  type EvidenceItem,
  type FileRecord,
  type OriginLensReport,
} from '@/lib/results/schemas';
import { createId, ID_PATTERNS, isValidId, type IdPrefix } from '@/lib/results/ids';
import { APP_VERSION, MAX_FILE_BYTES } from '@/lib/security/limits';

const require = createRequire(import.meta.url);

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);

const FILE_A_ID = 'file_aaaaaaaaaaaa';
const FILE_B_ID = 'file_bbbbbbbbbbbb';
const FILE_C_ID = 'file_cccccccccccc';
const CHECK_INTAKE_ID = 'chk_iiiiiiiiiiii';
const CHECK_FINGERPRINT_ID = 'chk_ffffffffffff';
const CHECK_C2PA_ID = 'chk_cccccccccccc';
const EV_HASH_A_ID = 'ev_hhhhhhhhhhhh';
const EV_C2PA_PRESENCE_ID = 'ev_pppppppppppp';
const EV_ACTION_ID = 'ev_actaaaaaaaaa';
const EV_INGREDIENT_ID = 'ev_ingaaaaaaaaa';
const REPORT_ID = 'rpt_rrrrrrrrrrrr';
const STARTED_AT = '2026-10-27T12:00:00.000Z';
const FINISHED_AT = '2026-10-27T12:00:00.120Z';

function makeFileA(): FileRecord {
  return {
    fileId: FILE_A_ID,
    displayName: 'photo-a.jpg',
    detectedMimeType: 'image/jpeg',
    byteSize: 1024,
    width: 4000,
    height: 3000,
    sha256: SHA_A,
    decodePipelineVersion: 'decode-v1',
  };
}

function makeFileB(): FileRecord {
  return {
    fileId: FILE_B_ID,
    displayName: 'photo-b.png',
    detectedMimeType: 'image/png',
    byteSize: 2048,
    width: 1000,
    height: 1000,
    sha256: SHA_B,
    decodePipelineVersion: 'decode-v1',
    userLabel: 'edited',
  };
}

function makeHashEvidence(): EvidenceItem {
  return {
    evidenceId: EV_HASH_A_ID,
    sourceCheckId: CHECK_FINGERPRINT_ID,
    key: 'sha256',
    value: SHA_A,
    valueType: 'hash',
    authority: 'file_measurement',
    interpretationCode: 'fingerprint_of_uploaded_bytes',
  };
}

function makeC2paPresenceEvidence(): EvidenceItem {
  return {
    evidenceId: EV_C2PA_PRESENCE_ID,
    sourceCheckId: CHECK_C2PA_ID,
    key: 'manifest_presence',
    value: 'not_present',
    valueType: 'code',
    authority: 'file_measurement',
    interpretationCode: 'no_supported_embedded_manifest_found',
  };
}

function makeIntakeCheck(): CheckResult {
  return {
    checkId: CHECK_INTAKE_ID,
    fileId: FILE_A_ID,
    kind: 'intake',
    executionState: 'completed',
    outcome: 'valid',
    checkerName: 'OriginLens intake',
    checkerVersion: '1',
    startedAtUtc: STARTED_AT,
    finishedAtUtc: FINISHED_AT,
    evidence: [],
    warnings: [],
    limitations: ['Signature and decoder agreement do not establish provenance.'],
  };
}

function makeFingerprintCheck(): CheckResult {
  return {
    checkId: CHECK_FINGERPRINT_ID,
    fileId: FILE_A_ID,
    kind: 'fingerprint',
    executionState: 'completed',
    outcome: 'extracted',
    checkerName: 'Web Crypto SubtleCrypto.digest',
    checkerVersion: 'SHA-256',
    startedAtUtc: STARTED_AT,
    finishedAtUtc: FINISHED_AT,
    evidence: [makeHashEvidence()],
    warnings: [],
    limitations: ['A fingerprint identifies this exact byte version, not its origin.'],
  };
}

function makeC2paCheck(): CheckResult {
  return {
    checkId: CHECK_C2PA_ID,
    fileId: FILE_A_ID,
    kind: 'c2pa',
    executionState: 'completed',
    outcome: 'not_present',
    checkerName: 'c2pa-web',
    checkerVersion: '0.15.4',
    startedAtUtc: STARTED_AT,
    finishedAtUtc: FINISHED_AT,
    evidence: [makeC2paPresenceEvidence()],
    warnings: [],
    limitations: [
      'No supported embedded manifest was found. This does not establish that the image is unedited or human-made.',
    ],
  };
}

function makeReport(): OriginLensReport {
  return {
    schemaVersion: '2.0',
    appVersion: APP_VERSION,
    reportId: REPORT_ID,
    createdAtUtc: '2026-10-27T12:00:05.000Z',
    files: [makeFileA(), makeFileB()],
    checks: [makeIntakeCheck(), makeFingerprintCheck(), makeC2paCheck()],
    evidence: [makeHashEvidence(), makeC2paPresenceEvidence()],
    summaryCodes: ['no_supported_embedded_credentials'],
    trustPolicyId: 'originlens-default-embedded-v1',
    disclaimers: [
      'A SHA-256 fingerprint identifies this exact byte version, not its origin or truth.',
    ],
    exportOptions: {
      includedOriginalImage: false,
      includedPreciseGps: false,
    },
  };
}

function cloneReport(): OriginLensReport {
  return structuredClone(makeReport());
}

function fileAt(report: OriginLensReport, index: number): FileRecord {
  const file = report.files[index];

  if (file === undefined) {
    throw new Error(`Fixture is missing file ${index}.`);
  }

  return file;
}

function checkWithId(report: OriginLensReport, checkId: string): CheckResult {
  const check = report.checks.find((item) => item.checkId === checkId);

  if (check === undefined) {
    throw new Error(`Fixture is missing check ${checkId}.`);
  }

  return check;
}

function evidenceWithId(report: OriginLensReport, evidenceId: string): EvidenceItem {
  const item = report.evidence.find((entry) => entry.evidenceId === evidenceId);

  if (item === undefined) {
    throw new Error(`Fixture is missing evidence ${evidenceId}.`);
  }

  return item;
}

function formatIssues(result: { error: { issues: Array<{ path: PropertyKey[]; message: string }> } }) {
  return result.error.issues
    .map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`)
    .join(' | ');
}

function expectValid(report: unknown): OriginLensReport {
  const result = reportSchema.safeParse(report);

  if (!result.success) {
    throw new Error(`Expected a valid report. Issues: ${formatIssues(result)}`);
  }

  return result.data;
}

function expectInvalid(report: unknown, expected?: RegExp): void {
  const result = reportSchema.safeParse(report);

  if (result.success) {
    throw new Error('Expected report validation to fail, but it passed.');
  }

  if (expected !== undefined) {
    expect(formatIssues(result)).toMatch(expected);
  }
}

function makePresentFinding(): C2paFinding {
  return {
    manifestPresence: 'present',
    manifestValidation: 'valid',
    signatureValidation: 'valid',
    contentBindingValidation: 'valid',
    signerTrust: 'unknown',
    timestampValidation: 'not_evaluated',
    revocationStatus: 'not_evaluated',
    trustPolicyId: 'originlens-default-embedded-v1',
    sdkVersion: '0.15.4',
    sdkCodes: ['manifest_found', 'signature_valid'],
    actions: [{ actionCode: 'c2pa.created', sourceEvidenceId: EV_ACTION_ID }],
    ingredients: [
      { relationship: 'parentOf', title: 'source.jpg', sourceEvidenceId: EV_INGREDIENT_ID },
    ],
    warnings: [],
  };
}

describe('result vocabularies', () => {
  it('pins the PRD execution-state and outcome vocabularies', () => {
    expect([...EXECUTION_STATES]).toEqual([
      'queued',
      'running',
      'completed',
      'skipped',
      'cancelled',
      'failed',
      'timed_out',
    ]);
    expect([...COMMON_OUTCOMES]).toEqual([
      'present',
      'not_present',
      'valid',
      'invalid',
      'trusted',
      'not_trusted',
      'unknown',
      'detected',
      'not_detected',
      'extracted',
      'equal',
      'different',
      'unsupported',
      'not_applicable',
      'inconclusive',
      'not_evaluated',
    ]);
    expect([...CHECK_KINDS]).toEqual([
      'intake',
      'fingerprint',
      'metadata',
      'c2pa',
      'comparison',
      'meta_explanation',
    ]);
    expect([...EVIDENCE_VALUE_TYPES]).toEqual([
      'text',
      'number',
      'boolean',
      'hash',
      'timestamp',
      'code',
    ]);
    expect([...EVIDENCE_AUTHORITIES]).toEqual([
      'cryptographic_validation',
      'provider_result',
      'file_measurement',
      'unverified_metadata',
      'model_explanation',
    ]);
    expect([...VALIDATION_STATES]).toEqual([
      'valid',
      'invalid',
      'unknown',
      'not_evaluated',
      'not_applicable',
    ]);
    expect([...SIGNER_TRUST_STATES]).toEqual([
      'trusted',
      'not_trusted',
      'unknown',
      'not_evaluated',
    ]);
    expect([...REVOCATION_STATES]).toEqual(['not_revoked', 'revoked', 'unknown', 'not_evaluated']);
    expect([...MANIFEST_PRESENCE_STATES]).toEqual([
      'present',
      'not_present',
      'unsupported',
      'error',
    ]);
    expect([...SUMMARY_CODES]).toEqual([
      'verified_provenance_evidence_found',
      'no_supported_embedded_credentials',
      'evidence_incomplete',
      'validation_issues_require_attention',
    ]);
  });

  it('accepts every declared enum value and rejects unknown values', () => {
    for (const value of EXECUTION_STATES) {
      expect(executionStateSchema.safeParse(value).success).toBe(true);
    }
    for (const value of COMMON_OUTCOMES) {
      expect(commonOutcomeSchema.safeParse(value).success).toBe(true);
    }
    for (const value of CHECK_KINDS) {
      expect(checkKindSchema.safeParse(value).success).toBe(true);
    }
    for (const value of EVIDENCE_VALUE_TYPES) {
      expect(evidenceValueTypeSchema.safeParse(value).success).toBe(true);
    }
    for (const value of EVIDENCE_AUTHORITIES) {
      expect(evidenceAuthoritySchema.safeParse(value).success).toBe(true);
    }
    for (const value of VALIDATION_STATES) {
      expect(validationStateSchema.safeParse(value).success).toBe(true);
    }
    for (const value of SIGNER_TRUST_STATES) {
      expect(signerTrustSchema.safeParse(value).success).toBe(true);
    }
    for (const value of MANIFEST_PRESENCE_STATES) {
      expect(manifestPresenceSchema.safeParse(value).success).toBe(true);
    }
    for (const value of REVOCATION_STATES) {
      expect(revocationStatusSchema.safeParse(value).success).toBe(true);
    }
    for (const value of SUMMARY_CODES) {
      expect(summaryCodeSchema.safeParse(value).success).toBe(true);
    }

    expect(executionStateSchema.safeParse('unavailable').success).toBe(false);
    expect(commonOutcomeSchema.safeParse('verified').success).toBe(false);
    expect(manifestPresenceSchema.safeParse('missing').success).toBe(false);
    expect(signerTrustSchema.safeParse('valid').success).toBe(false);
    expect(summaryCodeSchema.safeParse('real').success).toBe(false);
  });
});

describe('session identifiers', () => {
  it('creates prefixed identifiers that satisfy their own pattern', () => {
    const prefixes: readonly IdPrefix[] = ['file', 'chk', 'ev', 'rpt'];

    for (const prefix of prefixes) {
      const id = createId(prefix);

      expect(id).toMatch(ID_PATTERNS[prefix]);
      expect(isValidId(prefix, id)).toBe(true);
      expect(isValidId(prefix, `${prefix}_short`)).toBe(false);
    }
  });

  it('does not reuse identifiers across many calls', () => {
    const ids = new Set<string>();

    for (let index = 0; index < 500; index += 1) {
      ids.add(createId('file'));
    }

    expect(ids.size).toBe(500);
  });

  it('rejects an identifier under the wrong prefix', () => {
    const fileId = createId('file');

    expect(isValidId('chk', fileId)).toBe(false);
    expect(isValidId('ev', fileId)).toBe(false);
    expect(isValidId('file', `file_${'a'.repeat(41)}`)).toBe(false);
  });
});

describe('application version', () => {
  it('keeps the reported app version in sync with package.json', () => {
    const pkg = require('../../package.json') as { version: string };

    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('report contract', () => {
  it('accepts a report where every check, file, and evidence reference resolves', () => {
    const report = expectValid(makeReport());

    expect(report.schemaVersion).toBe('2.0');
    expect(report.files).toHaveLength(2);
    expect(report.checks).toHaveLength(3);
    expect(report.evidence).toHaveLength(2);
  });

  it('survives a JSON export/import round trip', () => {
    const serialized = JSON.stringify(makeReport());

    expect(serialized).not.toContain('undefined');
    expectValid(JSON.parse(serialized));
  });

  it('is strict: unknown keys are rejected at every level', () => {
    const report = cloneReport();
    const withTopLevelExtra: unknown = { ...report, extra: true };
    const withFileExtra: unknown = {
      ...report,
      files: [{ ...fileAt(report, 0), extra: true }, fileAt(report, 1)],
    };
    const withCheckExtra: unknown = {
      ...report,
      checks: [{ ...checkWithId(report, CHECK_INTAKE_ID), extra: true }, ...report.checks.slice(1)],
    };
    const withEvidenceExtra: unknown = {
      ...report,
      evidence: [
        { ...evidenceWithId(report, EV_HASH_A_ID), extra: true },
        evidenceWithId(report, EV_C2PA_PRESENCE_ID),
      ],
    };

    expect(reportSchema.safeParse(withTopLevelExtra).success).toBe(false);
    expect(reportSchema.safeParse(withFileExtra).success).toBe(false);
    expect(reportSchema.safeParse(withCheckExtra).success).toBe(false);
    expect(reportSchema.safeParse(withEvidenceExtra).success).toBe(false);
  });

  it('rejects a schema version other than 2.0', () => {
    expectInvalid({ ...makeReport(), schemaVersion: '3.0' }, /schemaVersion/);
  });

  it('rejects an empty app version and a malformed report identifier', () => {
    expectInvalid({ ...makeReport(), appVersion: '' }, /appVersion/);
    expectInvalid({ ...makeReport(), reportId: 'rpt_short' }, /reportId/);
    expectInvalid({ ...makeReport(), reportId: FILE_A_ID }, /reportId/);
  });

  it('rejects malformed or ambiguous creation timestamps', () => {
    for (const createdAtUtc of [
      '2026-10-27',
      '2026-10-27T12:00:05Z',
      '2026-10-27T12:00:05.000+02:00',
      'not-a-date',
      '',
      '2026-13-45T99:99:99.000Z',
    ]) {
      expectInvalid({ ...makeReport(), createdAtUtc }, /createdAtUtc/);
    }
  });

  it('rejects duplicate file identifiers', () => {
    const report = cloneReport();
    fileAt(report, 1).fileId = FILE_A_ID;

    expectInvalid(report, /unique/);
  });

  it('rejects duplicate check identifiers', () => {
    const report = cloneReport();
    checkWithId(report, CHECK_FINGERPRINT_ID).checkId = CHECK_INTAKE_ID;

    expectInvalid(report, /unique/);
  });

  it('rejects duplicate evidence identifiers in the canonical list', () => {
    const report = cloneReport();
    report.evidence.push({ ...evidenceWithId(report, EV_HASH_A_ID) });

    expectInvalid(report, /unique/);
  });

  it('rejects duplicate evidence identifiers inside one check', () => {
    const report = cloneReport();
    checkWithId(report, CHECK_FINGERPRINT_ID).evidence.push({
      ...evidenceWithId(report, EV_HASH_A_ID),
    });

    expectInvalid(report, /unique/);
  });

  it('rejects a check that references a file outside the report', () => {
    const report = cloneReport();
    checkWithId(report, CHECK_INTAKE_ID).fileId = 'file_zzzzzzzzzzzz';

    expectInvalid(report, /not in the report/);
  });

  it('rejects canonical evidence that references an unknown check', () => {
    const report = cloneReport();
    report.evidence.push({
      evidenceId: 'ev_danglingcheck',
      sourceCheckId: 'chk_zzzzzzzzzzzz',
      key: 'orphan',
      value: 'value',
      valueType: 'text',
      authority: 'file_measurement',
    });

    expectInvalid(report, /not in the report/);
  });

  it('rejects check-local evidence that is absent from the canonical list', () => {
    const report = cloneReport();
    checkWithId(report, CHECK_FINGERPRINT_ID).evidence.push({
      evidenceId: 'ev_missingcanon',
      sourceCheckId: CHECK_FINGERPRINT_ID,
      key: 'orphan',
      value: 1,
      valueType: 'number',
      authority: 'file_measurement',
    });

    expectInvalid(report, /report evidence list/);
  });

  it('rejects canonical evidence that no check references', () => {
    const report = cloneReport();
    report.evidence.push({
      evidenceId: 'ev_unreferenced',
      sourceCheckId: CHECK_INTAKE_ID,
      key: 'orphan',
      value: 'value',
      valueType: 'text',
      authority: 'file_measurement',
    });

    expectInvalid(report, /must be referenced by its source check/);
  });

  it('rejects a check copy that differs from the canonical evidence item', () => {
    const report = cloneReport();
    evidenceWithId(report, EV_HASH_A_ID).value = SHA_B;

    expectInvalid(report, /differs from the canonical/);
  });

  it('rejects evidence that claims another check as its source', () => {
    const report = cloneReport();
    const check = checkWithId(report, CHECK_FINGERPRINT_ID);
    const evidence = check.evidence[0];

    if (evidence === undefined) {
      throw new Error('Fixture is missing check evidence.');
    }

    evidence.sourceCheckId = CHECK_INTAKE_ID;

    expectInvalid(report, /reference the check/);
  });

  it('rejects unknown and duplicate summary codes', () => {
    expectInvalid({ ...makeReport(), summaryCodes: ['real'] }, /summaryCodes/);
    expectInvalid(
      { ...makeReport(), summaryCodes: ['evidence_incomplete', 'evidence_incomplete'] },
      /unique/,
    );
  });

  it('requires at least one file and at most two files', () => {
    expectInvalid({ ...makeReport(), files: [] }, /files/);

    const report = cloneReport();
    const thirdFile: FileRecord = {
      fileId: FILE_C_ID,
      displayName: 'photo-c.png',
      detectedMimeType: 'image/png',
      byteSize: 512,
      width: 100,
      height: 100,
      sha256: SHA_C,
      decodePipelineVersion: 'decode-v1',
    };

    expectInvalid({ ...report, files: [...report.files, thirdFile] }, /files/);
  });

  it('rejects a report with no checks', () => {
    expectInvalid({ ...makeReport(), checks: [] }, /checks/);
  });

  it('refuses to export image bytes or precise GPS', () => {
    expectInvalid(
      {
        ...makeReport(),
        exportOptions: { includedOriginalImage: true, includedPreciseGps: false },
      },
      /exportOptions/,
    );
    expectInvalid(
      {
        ...makeReport(),
        exportOptions: { includedOriginalImage: false, includedPreciseGps: true },
      },
      /exportOptions/,
    );
  });
});

describe('file record contract', () => {
  it('accepts a JPEG record with an optional user label', () => {
    expect(fileRecordSchema.safeParse(makeFileA()).success).toBe(true);
    expect(fileRecordSchema.safeParse(makeFileB()).success).toBe(true);
  });

  it('rejects MIME types outside the implemented JPEG/PNG allowlist', () => {
    const result = fileRecordSchema.safeParse({ ...makeFileA(), detectedMimeType: 'image/webp' });

    expect(result.success).toBe(false);
  });

  it('rejects zero, negative, fractional, and oversized byte counts', () => {
    for (const byteSize of [0, -1, 1.5, MAX_FILE_BYTES + 1]) {
      expect(fileRecordSchema.safeParse({ ...makeFileA(), byteSize }).success).toBe(false);
    }
  });

  it('accepts the exact compressed-size limit', () => {
    expect(fileRecordSchema.safeParse({ ...makeFileA(), byteSize: MAX_FILE_BYTES }).success).toBe(
      true,
    );
  });

  it('rejects malformed dimensions and the pixel budget overflow', () => {
    for (const dimensions of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: -1, height: 100 },
      { width: 100.5, height: 100 },
      { width: 5000, height: 4001 },
      { width: 20_000_001, height: 1 },
    ]) {
      expect(fileRecordSchema.safeParse({ ...makeFileA(), ...dimensions }).success).toBe(false);
    }

    expect(fileRecordSchema.safeParse({ ...makeFileA(), width: 5000, height: 4000 }).success).toBe(
      true,
    );
  });

  it('rejects malformed SHA-256 values', () => {
    for (const sha256 of [SHA_A.toUpperCase(), SHA_A.slice(1), `${SHA_A}0`, 'not-a-hash']) {
      expect(fileRecordSchema.safeParse({ ...makeFileA(), sha256 }).success).toBe(false);
    }
  });
});

describe('evidence item contract', () => {
  it('accepts a well-formed hash item', () => {
    expect(evidenceItemSchema.safeParse(makeHashEvidence()).success).toBe(true);
  });

  it('rejects a hash item whose value is not a lowercase digest', () => {
    for (const value of [SHA_A.toUpperCase(), 'abc', 42]) {
      expect(
        evidenceItemSchema.safeParse({ ...makeHashEvidence(), value }).success,
      ).toBe(false);
    }
  });

  it('rejects a timestamp item whose value is not strict ISO UTC', () => {
    for (const value of ['2026-10-27', '2026-10-27T12:00:05Z', '2026-10-27T12:00:05.000+02:00']) {
      expect(
        evidenceItemSchema.safeParse({
          ...makeHashEvidence(),
          valueType: 'timestamp',
          value,
        }).success,
      ).toBe(false);
    }

    expect(
      evidenceItemSchema.safeParse({
        ...makeHashEvidence(),
        valueType: 'timestamp',
        value: STARTED_AT,
      }).success,
    ).toBe(true);
  });

  it('rejects values whose runtime type disagrees with the declared value type', () => {
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), valueType: 'number', value: '42' })
        .success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), valueType: 'boolean', value: 'true' })
        .success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), valueType: 'code', value: 7 }).success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), valueType: 'text', value: null })
        .success,
    ).toBe(false);
  });

  it('bounds and sanitizes display strings', () => {
    expect(evidenceItemSchema.safeParse({ ...makeHashEvidence(), key: '' }).success).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), key: 'k'.repeat(121) }).success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), key: 'bad\u0000key' }).success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), key: 'allowed\tkey' }).success,
    ).toBe(true);
  });

  it('accepts only prefixed evidence identifiers', () => {
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), evidenceId: 'hash_aaaaaaaaaaaa' })
        .success,
    ).toBe(false);
    expect(
      evidenceItemSchema.safeParse({ ...makeHashEvidence(), sourceCheckId: 'file_aaaaaaaaaaaa' })
        .success,
    ).toBe(false);
  });
});

describe('check result invariants', () => {
  it('accepts a completed check with an outcome', () => {
    expect(checkResultSchema.safeParse(makeFingerprintCheck()).success).toBe(true);
  });

  it('rejects a completed check without an outcome', () => {
    const check = makeFingerprintCheck();
    delete check.outcome;

    expect(checkResultSchema.safeParse(check).success).toBe(false);
  });

  it('rejects an outcome on a check that did not complete', () => {
    for (const executionState of ['queued', 'running', 'skipped', 'cancelled', 'failed', 'timed_out'] as const) {
      const check = makeFingerprintCheck();
      check.executionState = executionState;

      if (executionState === 'failed' || executionState === 'timed_out') {
        check.errorCode = 'CHECK_FAILED';
      }

      expect(checkResultSchema.safeParse(check).success).toBe(false);
    }
  });

  it('requires a stable error code for failed and timed-out checks', () => {
    for (const executionState of ['failed', 'timed_out'] as const) {
      const check = makeIntakeCheck();
      check.executionState = executionState;
      delete check.outcome;

      expect(checkResultSchema.safeParse(check).success).toBe(false);

      check.errorCode = 'CHECK_FAILED';

      expect(checkResultSchema.safeParse(check).success).toBe(true);
    }
  });

  it('accepts skipped and cancelled checks with no outcome', () => {
    for (const executionState of ['skipped', 'cancelled'] as const) {
      const check = makeIntakeCheck();
      check.executionState = executionState;
      delete check.outcome;

      expect(checkResultSchema.safeParse(check).success).toBe(true);
    }
  });

  it('requires a start time before a finish time', () => {
    const withoutStart = makeFingerprintCheck();
    delete withoutStart.startedAtUtc;

    const reversed = makeFingerprintCheck();
    reversed.startedAtUtc = FINISHED_AT;
    reversed.finishedAtUtc = STARTED_AT;

    expect(checkResultSchema.safeParse(withoutStart).success).toBe(false);
    expect(checkResultSchema.safeParse(reversed).success).toBe(false);
  });

  it('rejects evidence that names a different source check', () => {
    const check = makeFingerprintCheck();
    const evidence = check.evidence[0];

    if (evidence === undefined) {
      throw new Error('Fixture is missing check evidence.');
    }

    evidence.sourceCheckId = CHECK_INTAKE_ID;

    expect(checkResultSchema.safeParse(check).success).toBe(false);
  });

  it('rejects duplicate evidence identifiers within one check', () => {
    const check = makeFingerprintCheck();

    check.evidence.push({ ...makeHashEvidence() });

    expect(checkResultSchema.safeParse(check).success).toBe(false);
  });

  it('rejects a check identifier that does not match the check vocabulary', () => {
    expect(
      checkResultSchema.safeParse({ ...makeIntakeCheck(), checkId: 'check_iiiiiiiiiiii' }).success,
    ).toBe(false);
  });
});

describe('C2PA finding contract', () => {
  it('accepts a present manifest with validation findings', () => {
    expect(c2paFindingSchema.safeParse(makePresentFinding()).success).toBe(true);
  });

  it('rejects validation findings when no manifest is present', () => {
    for (const overrides of [
      { manifestValidation: 'valid' },
      { signatureValidation: 'invalid' },
      { contentBindingValidation: 'valid' },
      { timestampValidation: 'invalid' },
      { signerTrust: 'trusted' },
      { signerTrust: 'not_trusted' },
      { revocationStatus: 'not_revoked' },
      { revocationStatus: 'revoked' },
    ]) {
      expect(
        c2paFindingSchema.safeParse({
          ...makePresentFinding(),
          manifestPresence: 'not_present',
          manifestValidation: 'not_evaluated',
          signatureValidation: 'not_evaluated',
          contentBindingValidation: 'not_evaluated',
          timestampValidation: 'not_evaluated',
          signerTrust: 'unknown',
          revocationStatus: 'not_evaluated',
          ...overrides,
        }).success,
      ).toBe(false);
    }
  });

  it('accepts an absent manifest with every dependent state unevaluated', () => {
    const finding: C2paFinding = {
      ...makePresentFinding(),
      manifestPresence: 'not_present',
      manifestValidation: 'not_evaluated',
      signatureValidation: 'not_evaluated',
      contentBindingValidation: 'not_evaluated',
      timestampValidation: 'not_evaluated',
      signerTrust: 'unknown',
      revocationStatus: 'not_evaluated',
      sdkCodes: [],
      actions: [],
      ingredients: [],
    };

    expect(c2paFindingSchema.safeParse(finding).success).toBe(true);
  });

  it('rejects duplicate SDK codes but preserves an unknown bounded code', () => {
    expect(
      c2paFindingSchema.safeParse({
        ...makePresentFinding(),
        sdkCodes: ['manifest_found', 'manifest_found'],
      }).success,
    ).toBe(false);

    expect(
      c2paFindingSchema.safeParse({
        ...makePresentFinding(),
        sdkCodes: ['future_sdk_code_that_needs_interpretation'],
      }).success,
    ).toBe(true);
  });

  it('resolves every action and ingredient evidence reference', () => {
    const finding = makePresentFinding();

    expect(collectDanglingC2paEvidenceRefs(finding, [EV_ACTION_ID, EV_INGREDIENT_ID])).toEqual([]);
    expect(collectDanglingC2paEvidenceRefs(finding, [EV_ACTION_ID])).toEqual([EV_INGREDIENT_ID]);
    expect(collectDanglingC2paEvidenceRefs(finding, [])).toEqual([
      EV_ACTION_ID,
      EV_INGREDIENT_ID,
    ]);
  });

  it('reports each missing reference once', () => {
    const finding: C2paFinding = {
      ...makePresentFinding(),
      actions: [
        { actionCode: 'c2pa.created', sourceEvidenceId: EV_ACTION_ID },
        { actionCode: 'c2pa.edited', sourceEvidenceId: EV_ACTION_ID },
      ],
      ingredients: [],
    };

    expect(collectDanglingC2paEvidenceRefs(finding, [])).toEqual([EV_ACTION_ID]);
  });
});
