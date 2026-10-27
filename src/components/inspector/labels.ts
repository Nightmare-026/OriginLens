import type {
  CheckKind,
  CommonOutcome,
  ComparisonDifferenceState,
  ExecutionState,
  ManifestPresence,
  RevocationStatus,
  SignerTrust,
  ValidationState,
} from '@/lib/results/schemas';
import type { PipelineStage } from '@/lib/pipeline/types';
import type { MetadataFieldKey } from '@/lib/metadata/inspect';
import type { PreviewSkipReason } from '@/lib/compare/constants';

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

/** Display names for the allowlisted metadata fields compared by the delta. */
export const METADATA_FIELD_LABELS: Readonly<Record<MetadataFieldKey, string>> = {
  captureTime: 'Capture time',
  software: 'Software',
  orientation: 'Orientation',
  cameraMake: 'Camera make',
  cameraModel: 'Camera model',
};

export const COMPARISON_DIFFERENCE_LABELS: Readonly<Record<ComparisonDifferenceState, string>> =
  {
    equal: 'Equal',
    different: 'Different',
    absent_from_both: 'Not recorded in either file',
    present_only_in_first: 'Only in File A',
    present_only_in_second: 'Only in File B',
    not_evaluated: 'Not evaluated',
  };

export const PREVIEW_SKIP_REASON_LABELS: Readonly<Record<PreviewSkipReason, string>> = {
  identical_fingerprint: 'Skipped: both files have the identical SHA-256 fingerprint',
  aspect_ratio_mismatch: 'Skipped: the aspect ratios differ',
  orientation_not_normalized: 'Skipped: an orientation value could not be normalized',
  pixel_budget_exceeded: 'Skipped: the preview could not fit the 1.2 megapixel budget',
  decode_failed: 'Skipped: a file could not be decoded for the preview',
  decode_timed_out: 'Skipped: the preview decode exceeded its time limit',
  pixel_data_unavailable: 'Skipped: the preview pixels could not be read back',
};

/**
 * Why a skip happened, in product language. Each reason says what was not
 * measured; none of them may be read as "no difference was found".
 */
export const PREVIEW_SKIP_REASON_EXPLANATIONS: Readonly<Record<PreviewSkipReason, string>> = {
  identical_fingerprint:
    'Both files have the same fingerprint, so identical byte versions were supplied. No pixel difference was computed, and nothing is implied about other files.',
  aspect_ratio_mismatch:
    'The two images have different aspect ratios beyond the documented tolerance. Stretching or cropping one into the other would invent a difference, so no pixel metric was produced.',
  orientation_not_normalized:
    'At least one file records an orientation value that this build does not apply, or its orientation is unknown. Comparing the stored pixel grids without normalization would be misleading, so no pixel metric was produced.',
  pixel_budget_exceeded:
    'The normalized preview could not be fitted inside the 1.2 megapixel budget, so no pixel metric was produced.',
  decode_failed:
    'The browser could not decode at least one file for the preview. The earlier intake check succeeded, so this is a preview-path limitation, not a statement about the image.',
  decode_timed_out:
    'The preview decode exceeded its time limit. No pixel metric was produced, and the completed checks above are unaffected.',
  pixel_data_unavailable:
    'The preview canvas could not return pixel data in this browser. No pixel metric was produced.',
};

export const COMPARISON_OUTCOME_HEADLINES: Readonly<
  Record<'equal' | 'different' | 'inconclusive', string>
> = {
  equal: 'Every compared property is equal',
  different: 'At least one compared property differs',
  inconclusive: 'The comparison is inconclusive',
};

export const COMPARISON_OUTCOME_DESCRIPTIONS: Readonly<
  Record<'equal' | 'different' | 'inconclusive', string>
> = {
  equal:
    'The recorded fingerprints, properties, metadata clues, and evaluated credential states matched. This does not establish a shared origin, authorship, or that either file is unedited.',
  different:
    'At least one recorded property differs between the two files. A difference is not a finding of tampering, fraud, deception, or intent, and it does not identify which file is original.',
  inconclusive:
    'No difference was established, but at least one comparison input was not evaluated. The gap is reported instead of implying equality.',
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
