import { EXIFREADER_VERSION, type MetadataInspection } from '@/lib/metadata/inspect';
import type {
  CheckResult,
  CommonOutcome,
  EvidenceItem,
} from '@/lib/results/schemas';
import type { PipelineStage } from './types';

/**
 * Builders for the local checks that do not belong to a third-party adapter.
 * Each builder is a pure function of validated inputs, and every displayed
 * value is emitted as a structured evidence item tied to its check.
 */

const CHECKER_NAMES: Readonly<Record<PipelineStage, string>> = {
  intake: 'originlens-intake',
  fingerprint: 'webcrypto-sha-256',
  metadata: 'exifreader',
  c2pa: 'c2pa-web',
};

const INTAKE_LIMITATION =
  'Format detection combines the filename, the browser-reported type, the file signature, and a real decode. It does not establish where the file came from.';

const FINGERPRINT_LIMITATION =
  'The fingerprint identifies this exact byte version. It does not establish who created the file, when an event occurred, or whether the content is true.';

const CANCELLED_LIMITATION =
  'The check was cancelled before a result was recorded. No conclusion follows from the cancellation.';

export function checkerNameFor(stage: PipelineStage): string {
  return CHECKER_NAMES[stage];
}

type EvidenceDraft = Readonly<{
  key: string;
  value: string | number;
  valueType: EvidenceItem['valueType'];
  authority: EvidenceItem['authority'];
  interpretationCode?: string;
}>;

function evidenceItem(
  checkId: string,
  evidenceId: string,
  draft: EvidenceDraft,
): EvidenceItem {
  return {
    evidenceId,
    sourceCheckId: checkId,
    key: draft.key,
    value: draft.value,
    valueType: draft.valueType,
    authority: draft.authority,
    ...(draft.interpretationCode === undefined
      ? {}
      : { interpretationCode: draft.interpretationCode }),
  };
}

function boundedWarnings(warnings: readonly string[]): string[] {
  return warnings.slice(0, 10);
}

export type IntakeCheckInput = Readonly<{
  checkId: string;
  fileId: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  warnings: readonly string[];
  createEvidenceId: () => string;
}>;

/**
 * A completed intake check means the file passed size, format, signature, and
 * pixel-budget validation. `detected` is a statement about the format only.
 */
export function buildIntakeCheck(input: IntakeCheckInput): CheckResult {
  const evidence: EvidenceItem[] = [
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: 'intake.detected_format',
      value: input.mimeType,
      valueType: 'code',
      authority: 'file_measurement',
      interpretationCode: 'format_detected_from_content',
    }),
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: 'intake.byte_size',
      value: input.byteSize,
      valueType: 'number',
      authority: 'file_measurement',
      interpretationCode: 'compressed_size_validated',
    }),
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: 'intake.width',
      value: input.width,
      valueType: 'number',
      authority: 'file_measurement',
      interpretationCode: 'decoded_dimension_within_budget',
    }),
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: 'intake.height',
      value: input.height,
      valueType: 'number',
      authority: 'file_measurement',
      interpretationCode: 'decoded_dimension_within_budget',
    }),
  ];

  return {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: 'intake',
    executionState: 'completed',
    outcome: 'detected',
    checkerName: CHECKER_NAMES.intake,
    startedAtUtc: input.startedAtUtc,
    finishedAtUtc: input.finishedAtUtc,
    evidence,
    warnings: boundedWarnings(input.warnings),
    limitations: [INTAKE_LIMITATION],
  };
}

export type FingerprintCheckInput = Readonly<{
  checkId: string;
  fileId: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  sha256: string;
  createEvidenceId: () => string;
}>;

export function buildFingerprintCheck(input: FingerprintCheckInput): CheckResult {
  return {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: 'fingerprint',
    executionState: 'completed',
    outcome: 'extracted',
    checkerName: CHECKER_NAMES.fingerprint,
    startedAtUtc: input.startedAtUtc,
    finishedAtUtc: input.finishedAtUtc,
    evidence: [
      evidenceItem(input.checkId, input.createEvidenceId(), {
        key: 'file.sha256',
        value: input.sha256,
        valueType: 'hash',
        authority: 'file_measurement',
        interpretationCode: 'fingerprint_of_original_bytes',
      }),
    ],
    warnings: [],
    limitations: [FINGERPRINT_LIMITATION],
  };
}

export type MetadataCheckInput = Readonly<{
  checkId: string;
  fileId: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  inspection: MetadataInspection;
  createEvidenceId: () => string;
}>;

/**
 * Metadata is always recorded as an unverified clue. GPS coordinates are never
 * emitted; only their presence is stated, because the parser result is not
 * allowed to smuggle location data into the ledger or the report.
 */
export function buildMetadataCheck(input: MetadataCheckInput): CheckResult {
  const { inspection } = input;
  const base = {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: 'metadata',
    checkerName: CHECKER_NAMES.metadata,
    checkerVersion: EXIFREADER_VERSION,
    startedAtUtc: input.startedAtUtc,
    finishedAtUtc: input.finishedAtUtc,
  } as const;

  if (inspection.status === 'failed') {
    return {
      ...base,
      executionState: 'failed',
      evidence: [],
      warnings: boundedWarnings(inspection.warnings),
      limitations: inspection.limitations.slice(0, 10),
      errorCode: inspection.errorCode,
    };
  }

  const evidence: EvidenceItem[] = inspection.fields.map((field) =>
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: `metadata.${field.key}`.slice(0, 120),
      value: field.value,
      valueType: field.valueType,
      authority: 'unverified_metadata',
      interpretationCode: 'unverified_clue',
    }),
  );

  const gpsInterpretation =
    inspection.gpsPresence === 'present'
      ? 'location_metadata_present_coordinates_withheld'
      : inspection.gpsPresence === 'not_present'
        ? 'no_location_metadata_found'
        : 'location_presence_not_evaluated';

  evidence.push(
    evidenceItem(input.checkId, input.createEvidenceId(), {
      key: 'metadata.gps_presence',
      value: inspection.gpsPresence,
      valueType: 'code',
      authority: 'unverified_metadata',
      interpretationCode: gpsInterpretation,
    }),
  );

  const outcome: CommonOutcome = inspection.fields.length > 0 ? 'extracted' : 'not_present';

  return {
    ...base,
    executionState: 'completed',
    outcome,
    evidence,
    warnings: boundedWarnings(inspection.warnings),
    limitations: inspection.limitations.slice(0, 10),
  };
}

export type InterruptedCheckInput = Readonly<{
  stage: PipelineStage;
  checkId: string;
  fileId: string;
  limitation?: string;
}>;

/** A check that never started because the session was cancelled. */
export function buildSkippedCheck(input: InterruptedCheckInput): CheckResult {
  return {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: input.stage,
    executionState: 'skipped',
    checkerName: CHECKER_NAMES[input.stage],
    evidence: [],
    warnings: [],
    limitations: [input.limitation ?? CANCELLED_LIMITATION],
  };
}
