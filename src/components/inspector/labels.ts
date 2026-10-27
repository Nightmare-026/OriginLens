import type {
  CheckKind,
  CommonOutcome,
  ExecutionState,
  ManifestPresence,
  RevocationStatus,
  SignerTrust,
  ValidationState,
} from '@/lib/results/schemas';
import type { PipelineStage } from '@/lib/pipeline/types';

/**
 * Presentation vocabulary. Every union member has exactly one label, enforced
 * by exhaustive `Record` types, so a new SDK or domain state cannot silently
 * fall back to a friendly-sounding default.
 *
 * Labels describe what a check established. They never assert truth, intent,
 * originality, or a probability.
 */

export const CHECK_LABELS: Readonly<Record<CheckKind, string>> = {
  intake: 'File intake and format validation',
  fingerprint: 'SHA-256 fingerprint',
  metadata: 'Embedded metadata',
  c2pa: 'C2PA credential check',
  comparison: 'Provenance Delta',
  meta_explanation: 'Model explanation',
};

export const CHECK_DESCRIPTIONS: Readonly<Record<CheckKind, string>> = {
  intake: 'Size, extension, browser-reported type, file signature, decoder result, and pixel budget.',
  fingerprint: 'SHA-256 over the exact uploaded bytes, used as a fingerprint of this file version.',
  metadata: 'A bounded allowlist of embedded fields, reported as unverified clues.',
  c2pa: 'The pinned C2PA reader and validator, using only embedded credentials.',
  comparison: 'A two-file comparison of fingerprints, properties, and available provenance findings.',
  meta_explanation: 'An optional explanation layer; not enabled in this build.',
};

export const STAGE_ORDER: readonly PipelineStage[] = ['intake', 'fingerprint', 'metadata', 'c2pa'];

export const EXECUTION_STATE_LABELS: Readonly<Record<ExecutionState, string>> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
  failed: 'Failed',
  timed_out: 'Timed out',
};

export const OUTCOME_LABELS: Readonly<Record<CommonOutcome, string>> = {
  present: 'Present',
  not_present: 'Not present',
  valid: 'Valid',
  invalid: 'Invalid',
  trusted: 'Trusted',
  not_trusted: 'Not trusted',
  unknown: 'Unknown',
  detected: 'Format detected',
  not_detected: 'Not detected',
  extracted: 'Extracted',
  equal: 'Equal',
  different: 'Different',
  unsupported: 'Unsupported',
  not_applicable: 'Not applicable',
  inconclusive: 'Inconclusive',
  not_evaluated: 'Not evaluated',
};

export const MANIFEST_LABELS: Readonly<Record<ManifestPresence, string>> = {
  present: 'Present',
  not_present: 'Not present',
  unsupported: 'Unsupported',
  error: 'Error',
};

export const VALIDATION_LABELS: Readonly<Record<ValidationState, string>> = {
  valid: 'Valid',
  invalid: 'Invalid',
  unknown: 'Unknown',
  not_evaluated: 'Not evaluated',
  not_applicable: 'Not applicable',
};

export const TRUST_LABELS: Readonly<Record<SignerTrust, string>> = {
  trusted: 'Trusted under the configured policy',
  not_trusted: 'Not trusted under the configured policy',
  unknown: 'Unknown',
  not_evaluated: 'Not evaluated',
};

export const REVOCATION_LABELS: Readonly<Record<RevocationStatus, string>> = {
  not_revoked: 'Not revoked',
  revoked: 'Revoked',
  unknown: 'Unknown',
  not_evaluated: 'Not evaluated',
};

/** Static explanations of what each C2PA family does and does not establish. */
export const C2PA_FIELD_HELP = {
  manifest:
    'Whether a supported credential is embedded in this exact file. A missing credential is not evidence of editing or human creation.',
  signature:
    'Whether the claim signature validates under the signing credential. A valid signature does not establish that the signer is trustworthy.',
  contentBinding:
    'Whether the signed asset hash matches the bytes of this file. A mismatch means the content binding did not validate.',
  signerTrust:
    'Whether the signing credential is trusted under the configured trust policy. This build configures no trust anchors, so this stays not evaluated.',
  timestamp:
    'Whether the validator could check the recorded timestamp. A file timestamp is not a trusted capture time.',
  revocation:
    'Whether the validator established revocation status. This build performs no network revocation lookup.',
  actions:
    'Actions recorded in the manifest. A recorded action is a signed statement, not an independently observed event.',
  ingredients:
    'Ingredients recorded in the manifest. Recorded relationships are statements, not verified chronology.',
} as const;

/** `1536` becomes `1.5 KiB`; used only for display. */
export function formatByteSize(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    return 'Unknown size';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kib = bytes / 1024;

  if (kib < 1024) {
    return `${kib.toFixed(kib < 10 ? 1 : 0)} KiB`;
  }

  return `${(kib / 1024).toFixed(2)} MiB`;
}

export function formatDimensions(width: number, height: number): string {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return 'Unknown dimensions';
  }

  const megapixels = (width * height) / 1_000_000;

  return `${width} × ${height} px (${megapixels.toFixed(1)} MP)`;
}

/** UTC rendering with an explicit zone, per PRD 13 edge case 27. */
export function formatUtcInstant(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  const value = date.toISOString();

  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}
