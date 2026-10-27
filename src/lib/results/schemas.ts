import { z } from 'zod';
import { isSha256Hex } from '@/lib/fingerprint/sha256';
import { ID_PATTERNS } from '@/lib/results/ids';
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_SESSION,
  MAX_IMAGE_PIXELS,
} from '@/lib/security/limits';

/**
 * Runtime contracts for every result the app can display or export.
 * TypeScript types are inferred from these schemas so a value cannot be both
 * statically typed and runtime-invalid.
 */

export const EXECUTION_STATES = [
  'queued',
  'running',
  'completed',
  'skipped',
  'cancelled',
  'failed',
  'timed_out',
] as const;

export const COMMON_OUTCOMES = [
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
] as const;

export const CHECK_KINDS = [
  'intake',
  'fingerprint',
  'metadata',
  'c2pa',
  'comparison',
  'meta_explanation',
] as const;

export const EVIDENCE_VALUE_TYPES = [
  'text',
  'number',
  'boolean',
  'hash',
  'timestamp',
  'code',
] as const;

export const EVIDENCE_AUTHORITIES = [
  'cryptographic_validation',
  'provider_result',
  'file_measurement',
  'unverified_metadata',
  'model_explanation',
] as const;

export const VALIDATION_STATES = [
  'valid',
  'invalid',
  'unknown',
  'not_evaluated',
  'not_applicable',
] as const;

export const SIGNER_TRUST_STATES = ['trusted', 'not_trusted', 'unknown', 'not_evaluated'] as const;

export const REVOCATION_STATES = ['not_revoked', 'revoked', 'unknown', 'not_evaluated'] as const;

export const MANIFEST_PRESENCE_STATES = ['present', 'not_present', 'unsupported', 'error'] as const;

export const SUMMARY_CODES = [
  'verified_provenance_evidence_found',
  'no_supported_embedded_credentials',
  'evidence_incomplete',
  'validation_issues_require_attention',
] as const;

export const executionStateSchema = z.enum(EXECUTION_STATES);
export const commonOutcomeSchema = z.enum(COMMON_OUTCOMES);
export const checkKindSchema = z.enum(CHECK_KINDS);
export const evidenceValueTypeSchema = z.enum(EVIDENCE_VALUE_TYPES);
export const evidenceAuthoritySchema = z.enum(EVIDENCE_AUTHORITIES);
export const validationStateSchema = z.enum(VALIDATION_STATES);
export const signerTrustSchema = z.enum(SIGNER_TRUST_STATES);
export const revocationStatusSchema = z.enum(REVOCATION_STATES);
export const manifestPresenceSchema = z.enum(MANIFEST_PRESENCE_STATES);
export const summaryCodeSchema = z.enum(SUMMARY_CODES);

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

/** Bounded display text that rejects C0/C1 controls (tab, CR, LF allowed). */
function boundedText(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => !CONTROL_CHARACTERS.test(value), 'Control characters are not allowed');
}

const isoUtcTimestamp = z.string().refine((value) => {
  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}, 'Expected an ISO 8601 UTC timestamp with millisecond precision');

const fileIdSchema = z.string().regex(ID_PATTERNS.file, 'Invalid file identifier');
const checkIdSchema = z.string().regex(ID_PATTERNS.chk, 'Invalid check identifier');
const evidenceIdSchema = z.string().regex(ID_PATTERNS.ev, 'Invalid evidence identifier');

function isStrictIsoUtc(value: string): boolean {
  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

export const evidenceItemSchema = z
  .object({
    evidenceId: evidenceIdSchema,
    sourceCheckId: checkIdSchema,
    key: boundedText(120),
    value: z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]),
    valueType: evidenceValueTypeSchema,
    authority: evidenceAuthoritySchema,
    interpretationCode: boundedText(80).optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    const reject = (message: string) => {
      ctx.addIssue({ code: 'custom', message, path: ['value'] });
    };

    switch (item.valueType) {
      case 'hash':
        if (typeof item.value !== 'string' || !isSha256Hex(item.value)) {
          reject('A hash evidence value must be 64 lowercase hexadecimal characters.');
        }
        break;
      case 'timestamp':
        if (typeof item.value !== 'string' || !isStrictIsoUtc(item.value)) {
          reject('A timestamp evidence value must be an ISO 8601 UTC timestamp.');
        }
        break;
      case 'number':
        if (typeof item.value !== 'number') {
          reject('A number evidence value must be numeric.');
        }
        break;
      case 'boolean':
        if (typeof item.value !== 'boolean') {
          reject('A boolean evidence value must be true or false.');
        }
        break;
      case 'text':
      case 'code':
        if (typeof item.value !== 'string') {
          reject(`A ${item.valueType} evidence value must be a string.`);
        }
        break;
    }
  });

export const checkResultSchema = z
  .object({
    checkId: checkIdSchema,
    fileId: fileIdSchema.optional(),
    kind: checkKindSchema,
    executionState: executionStateSchema,
    outcome: commonOutcomeSchema.optional(),
    rawCode: boundedText(80).optional(),
    checkerName: boundedText(120),
    checkerVersion: boundedText(80).optional(),
    startedAtUtc: isoUtcTimestamp.optional(),
    finishedAtUtc: isoUtcTimestamp.optional(),
    evidence: z.array(evidenceItemSchema).max(50),
    warnings: z.array(boundedText(300)).max(10),
    limitations: z.array(boundedText(300)).max(10),
    errorCode: boundedText(80).optional(),
  })
  .strict()
  .superRefine((check, ctx) => {
    if (check.executionState === 'completed' && check.outcome === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'A completed check must record an outcome.',
        path: ['outcome'],
      });
    }

    if (check.executionState !== 'completed' && check.outcome !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only a completed check may carry an outcome.',
        path: ['outcome'],
      });
    }

    if (
      (check.executionState === 'failed' || check.executionState === 'timed_out') &&
      check.errorCode === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'A failed or timed-out check must record a stable error code.',
        path: ['errorCode'],
      });
    }

    if (check.finishedAtUtc !== undefined && check.startedAtUtc === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'A finish time requires a start time.',
        path: ['finishedAtUtc'],
      });
    }

    if (
      check.finishedAtUtc !== undefined &&
      check.startedAtUtc !== undefined &&
      Date.parse(check.finishedAtUtc) < Date.parse(check.startedAtUtc)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'The finish time cannot precede the start time.',
        path: ['finishedAtUtc'],
      });
    }

    const evidenceIds = new Set<string>();

    for (const [index, item] of check.evidence.entries()) {
      if (evidenceIds.has(item.evidenceId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Evidence identifiers must be unique within a check.',
          path: ['evidence', index, 'evidenceId'],
        });
      }

      evidenceIds.add(item.evidenceId);

      if (item.sourceCheckId !== check.checkId) {
        ctx.addIssue({
          code: 'custom',
          message: 'Evidence must reference the check that contains it.',
          path: ['evidence', index, 'sourceCheckId'],
        });
      }
    }
  });

export const fileRecordSchema = z
  .object({
    fileId: fileIdSchema,
    displayName: boundedText(200),
    detectedMimeType: z.enum(['image/jpeg', 'image/png']),
    byteSize: z.number().int().positive().max(MAX_FILE_BYTES),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 digest'),
    decodePipelineVersion: boundedText(80),
    userLabel: z.enum(['original', 'edited']).optional(),
  })
  .strict()
  .superRefine((file, ctx) => {
    if (file.width > MAX_IMAGE_PIXELS || file.height > MAX_IMAGE_PIXELS) {
      ctx.addIssue({
        code: 'custom',
        message: 'Image dimensions exceed the pixel budget.',
        path: ['width'],
      });
      return;
    }

    if (file.width * file.height > MAX_IMAGE_PIXELS) {
      ctx.addIssue({
        code: 'custom',
        message: 'The image exceeds the 20 megapixel budget.',
        path: ['width'],
      });
    }
  });

const c2paActionSchema = z
  .object({
    actionCode: boundedText(80),
    sourceEvidenceId: evidenceIdSchema,
  })
  .strict();

const c2paIngredientSchema = z
  .object({
    relationship: boundedText(80).optional(),
    title: boundedText(200).optional(),
    sourceEvidenceId: evidenceIdSchema,
  })
  .strict();

export const c2paFindingSchema = z
  .object({
    manifestPresence: manifestPresenceSchema,
    manifestValidation: validationStateSchema,
    signatureValidation: validationStateSchema,
    contentBindingValidation: validationStateSchema,
    signerTrust: signerTrustSchema,
    timestampValidation: validationStateSchema,
    revocationStatus: revocationStatusSchema,
    trustPolicyId: boundedText(80),
    sdkVersion: boundedText(80),
    sdkCodes: z.array(boundedText(80)).max(50),
    actions: z.array(c2paActionSchema).max(50),
    ingredients: z.array(c2paIngredientSchema).max(50),
    warnings: z.array(boundedText(300)).max(10),
  })
  .strict()
  .superRefine((finding, ctx) => {
    const uniqueCodes = new Set(finding.sdkCodes);

    if (uniqueCodes.size !== finding.sdkCodes.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'SDK codes must be unique.',
        path: ['sdkCodes'],
      });
    }

    if (finding.manifestPresence !== 'present') {
      const findingsThatRequireAManifest = [
        finding.manifestValidation,
        finding.signatureValidation,
        finding.contentBindingValidation,
        finding.timestampValidation,
      ];

      if (findingsThatRequireAManifest.some((state) => state === 'valid' || state === 'invalid')) {
        ctx.addIssue({
          code: 'custom',
          message: 'Validation findings require a present manifest.',
          path: ['manifestValidation'],
        });
      }

      if (finding.signerTrust === 'trusted' || finding.signerTrust === 'not_trusted') {
        ctx.addIssue({
          code: 'custom',
          message: 'Signer trust cannot be established without a present manifest.',
          path: ['signerTrust'],
        });
      }

      if (finding.revocationStatus === 'revoked' || finding.revocationStatus === 'not_revoked') {
        ctx.addIssue({
          code: 'custom',
          message: 'Revocation status cannot be established without a present manifest.',
          path: ['revocationStatus'],
        });
      }
    }
  });

/**
 * C2PA actions and ingredients point at evidence by ID. The report contract
 * does not embed the finding, so the pipeline must call this helper before
 * rendering or serializing a finding to prove every reference resolves.
 * Returns each unresolved identifier once, in first-seen order.
 */
export function collectDanglingC2paEvidenceRefs(
  finding: C2paFinding,
  availableEvidenceIds: readonly string[],
): string[] {
  const available = new Set(availableEvidenceIds);
  const dangling = new Set<string>();

  for (const action of finding.actions) {
    if (!available.has(action.sourceEvidenceId)) {
      dangling.add(action.sourceEvidenceId);
    }
  }

  for (const ingredient of finding.ingredients) {
    if (!available.has(ingredient.sourceEvidenceId)) {
      dangling.add(ingredient.sourceEvidenceId);
    }
  }

  return [...dangling];
}

export const reportSchema = z
  .object({
    schemaVersion: z.literal('2.0'),
    appVersion: boundedText(40),
    reportId: z.string().regex(ID_PATTERNS.rpt, 'Invalid report identifier'),
    createdAtUtc: isoUtcTimestamp,
    files: z.array(fileRecordSchema).min(1).max(MAX_FILES_PER_SESSION),
    checks: z.array(checkResultSchema).min(1).max(60),
    evidence: z.array(evidenceItemSchema).max(200),
    summaryCodes: z.array(summaryCodeSchema).max(SUMMARY_CODES.length),
    trustPolicyId: boundedText(80),
    disclaimers: z.array(boundedText(300)).max(10),
    exportOptions: z
      .object({
        includedOriginalImage: z.literal(false),
        includedPreciseGps: z.literal(false),
      })
      .strict(),
  })
  .strict()
  .superRefine((report, ctx) => {
    const checkIds = new Set<string>();
    const fileIds = new Set<string>();
    const evidenceById = new Map<string, EvidenceItem>();

    for (const [index, file] of report.files.entries()) {
      if (fileIds.has(file.fileId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'File identifiers must be unique.',
          path: ['files', index, 'fileId'],
        });
      }
      fileIds.add(file.fileId);
    }

    for (const [index, check] of report.checks.entries()) {
      if (checkIds.has(check.checkId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Check identifiers must be unique.',
          path: ['checks', index, 'checkId'],
        });
      }
      checkIds.add(check.checkId);

      if (check.fileId !== undefined && !fileIds.has(check.fileId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'The check references a file that is not in the report.',
          path: ['checks', index, 'fileId'],
        });
      }
    }

    for (const [index, item] of report.evidence.entries()) {
      if (evidenceById.has(item.evidenceId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Evidence identifiers must be unique.',
          path: ['evidence', index, 'evidenceId'],
        });
      } else {
        evidenceById.set(item.evidenceId, item);
      }

      if (!checkIds.has(item.sourceCheckId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'The evidence references a check that is not in the report.',
          path: ['evidence', index, 'sourceCheckId'],
        });
      }
    }

    const referencedEvidenceIds = new Set<string>();

    for (const [checkIndex, check] of report.checks.entries()) {
      for (const [evidenceIndex, item] of check.evidence.entries()) {
        referencedEvidenceIds.add(item.evidenceId);

        const canonical = evidenceById.get(item.evidenceId);

        if (canonical === undefined) {
          ctx.addIssue({
            code: 'custom',
            message: 'Check evidence must also appear in the report evidence list.',
            path: ['checks', checkIndex, 'evidence', evidenceIndex, 'evidenceId'],
          });
          continue;
        }

        if (!sameEvidence(item, canonical)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Check evidence differs from the canonical report evidence item.',
            path: ['checks', checkIndex, 'evidence', evidenceIndex],
          });
        }
      }
    }

    for (const [index, item] of report.evidence.entries()) {
      if (!referencedEvidenceIds.has(item.evidenceId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Report evidence must be referenced by its source check.',
          path: ['evidence', index],
        });
      }
    }

    if (new Set(report.summaryCodes).size !== report.summaryCodes.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Summary codes must be unique.',
        path: ['summaryCodes'],
      });
    }
  });

function sameEvidence(left: EvidenceItem, right: EvidenceItem): boolean {
  return (
    left.evidenceId === right.evidenceId &&
    left.sourceCheckId === right.sourceCheckId &&
    left.key === right.key &&
    left.valueType === right.valueType &&
    left.authority === right.authority &&
    left.interpretationCode === right.interpretationCode &&
    Object.is(left.value, right.value)
  );
}

export type ExecutionState = z.infer<typeof executionStateSchema>;
export type CommonOutcome = z.infer<typeof commonOutcomeSchema>;
export type CheckKind = z.infer<typeof checkKindSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type FileRecord = z.infer<typeof fileRecordSchema>;
export type C2paFinding = z.infer<typeof c2paFindingSchema>;
export type ManifestPresence = z.infer<typeof manifestPresenceSchema>;
export type ValidationState = z.infer<typeof validationStateSchema>;
export type SignerTrust = z.infer<typeof signerTrustSchema>;
export type RevocationStatus = z.infer<typeof revocationStatusSchema>;
export type SummaryCode = z.infer<typeof summaryCodeSchema>;
export type OriginLensReport = z.infer<typeof reportSchema>;
