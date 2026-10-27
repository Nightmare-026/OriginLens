import {
  METADATA_FIELD_KEYS,
  type MetadataFieldKey,
  type MetadataInspection,
} from '@/lib/metadata/inspect';
import { pipelineError, type PipelineError } from '@/lib/pipeline/errors';
import { APP_VERSION } from '@/lib/security/limits';
import type { FileAnalysis } from '@/lib/pipeline/types';
import type { IdPrefix } from '@/lib/results/ids';
import {
  checkResultSchema,
  comparisonSchema,
  type C2paFinding,
  type CheckResult,
  type Comparison,
  type ComparisonDifferenceState,
  type EvidenceItem,
  type MetadataComparisonField,
  type PreviewComparison,
} from '@/lib/results/schemas';
import {
  PREVIEW_CHANNEL_THRESHOLD,
  PREVIEW_DECODER_ID,
  PREVIEW_METHOD_ID,
  type PreviewSkipReason,
} from './constants';
import { PREVIEW_NORMALIZATION_NOTE, type PreviewMeasurement } from './preview';

/**
 * Provenance Delta (PRD 5.5, Stage 6).
 *
 * Two independently analyzed files are compared field by field. The builder is
 * pure: it reads only typed results, records one `comparison` check plus its
 * evidence, and returns the derived side-by-side view.
 *
 * What it deliberately cannot do:
 * - decide which file is the original, older, or edited;
 * - turn a difference into tampering, fraud, deception, or intent;
 * - turn an unevaluated input into equality or inequality.
 */

export const COMPARISON_CHECKER_NAME = 'originlens-provenance-delta';

const COMPARISON_LIMITATIONS = [
  'The delta compares recorded checks side by side. It does not establish which file is older, which one is the original, or whether either was edited.',
  'A byte, metadata, or preview-pixel difference is not evidence of tampering, fraud, deception, or intent, and an equal value does not establish a shared origin.',
  'Only properties recorded by the completed checks are compared. Anything the checks did not evaluate is reported as not evaluated rather than as equal.',
] as const;

const METADATA_COMPARISON_LIMITATION =
  'Metadata values are unverified clues extracted by the pinned parser. Equal values can be copied, and different values can be unrelated to any editing step.';

const PREVIEW_SKIPPED_LIMITATION =
  'The preview measurement was skipped, so this delta records no pixel difference at all. It does not record a difference of zero.';

const INCOMPLETE_INPUT_WARNING =
  'At least one comparison input was not evaluated. The delta reports that gap instead of implying equality.';

const MAX_EVIDENCE = 50;
const MAX_WARNINGS = 10;

export type ComparisonPreviewOutcome =
  | Readonly<{
      status: 'measured';
      targetWidth: number;
      targetHeight: number;
      metric: PreviewMeasurement;
    }>
  | Readonly<{ status: 'skipped'; reason: PreviewSkipReason }>;

export type ComparisonInput = Readonly<{
  first: FileAnalysis;
  second: FileAnalysis;
  preview: ComparisonPreviewOutcome;
  createId: (prefix: IdPrefix) => string;
  now: () => Date;
}>;

export type ComparisonOutput =
  | Readonly<{
      status: 'ok';
      check: CheckResult;
      comparison: Comparison;
      /** Canonical evidence for both the check and the report. */
      evidence: readonly EvidenceItem[];
    }>
  | Readonly<{ status: 'error'; error: PipelineError }>;

type EvidenceDraft = Readonly<{
  key: string;
  value: string | number | boolean;
  valueType: EvidenceItem['valueType'];
  authority: EvidenceItem['authority'];
  interpretationCode?: string;
}>;

function metadataValues(inspection: MetadataInspection | null): Map<MetadataFieldKey, string> | null {
  if (inspection === null || inspection.status === 'failed') {
    return null;
  }

  const values = new Map<MetadataFieldKey, string>();

  for (const field of inspection.fields) {
    values.set(field.key, String(field.value));
  }

  return values;
}

function compareMetadataField(
  field: MetadataFieldKey,
  first: Map<MetadataFieldKey, string> | null,
  second: Map<MetadataFieldKey, string> | null,
): MetadataComparisonField {
  if (first === null || second === null) {
    return { field, status: 'not_evaluated' };
  }

  const firstValue = first.get(field);
  const secondValue = second.get(field);

  if (firstValue === undefined && secondValue === undefined) {
    return { field, status: 'absent_from_both' };
  }

  if (secondValue === undefined) {
    return { field, status: 'present_only_in_first', firstValue };
  }

  if (firstValue === undefined) {
    return { field, status: 'present_only_in_second', secondValue };
  }

  return {
    field,
    status: firstValue === secondValue ? 'equal' : 'different',
    firstValue,
    secondValue,
  };
}

const C2PA_DIMENSIONS = [
  ['manifest_presence', (finding: C2paFinding) => finding.manifestPresence],
  ['manifest_validation', (finding: C2paFinding) => finding.manifestValidation],
  ['signature_validation', (finding: C2paFinding) => finding.signatureValidation],
  ['content_binding_validation', (finding: C2paFinding) => finding.contentBindingValidation],
  ['signer_trust', (finding: C2paFinding) => finding.signerTrust],
  ['timestamp_validation', (finding: C2paFinding) => finding.timestampValidation],
  ['revocation_status', (finding: C2paFinding) => finding.revocationStatus],
] as const;

type C2paDimension = (typeof C2PA_DIMENSIONS)[number][0];

function compareC2paDimension(
  dimension: C2paDimension,
  first: C2paFinding | null,
  second: C2paFinding | null,
): ComparisonDifferenceState {
  if (first === null || second === null) {
    return 'not_evaluated';
  }

  const read = C2PA_DIMENSIONS.find(([name]) => name === dimension)?.[1];

  if (read === undefined) {
    return 'not_evaluated';
  }

  return read(first) === read(second) ? 'equal' : 'different';
}

function hasDifference(status: ComparisonDifferenceState): boolean {
  return status === 'different' || status === 'present_only_in_first' || status === 'present_only_in_second';
}

function isMetadataGap(status: ComparisonDifferenceState): boolean {
  return status === 'not_evaluated';
}

/** Skip reasons that leave a real gap in the comparison, rather than a redundant measurement. */
function isPreviewGap(reason: PreviewSkipReason): boolean {
  return reason !== 'identical_fingerprint' && reason !== 'aspect_ratio_mismatch';
}

/**
 * Builds the comparison check, its evidence, and the validated comparison
 * block. A contract violation is fatal for the comparison only: the two file
 * ledgers are returned to the caller independently and stay readable.
 */
export function buildComparison(input: ComparisonInput): ComparisonOutput {
  const checkId = input.createId('chk');
  const evidence: EvidenceItem[] = [];
  const warnings: string[] = [];

  const push = (draft: EvidenceDraft): void => {
    if (evidence.length >= MAX_EVIDENCE) {
      return;
    }

    evidence.push({
      evidenceId: input.createId('ev'),
      sourceCheckId: checkId,
      key: draft.key,
      value: draft.value,
      valueType: draft.valueType,
      authority: draft.authority,
      ...(draft.interpretationCode === undefined
        ? {}
        : { interpretationCode: draft.interpretationCode }),
    });
  };

  const firstFile = input.first.file;
  const secondFile = input.second.file;

  const fingerprintsEqual = firstFile.sha256 === secondFile.sha256;
  const byteSizesEqual = firstFile.byteSize === secondFile.byteSize;
  const formatsEqual = firstFile.detectedMimeType === secondFile.detectedMimeType;
  const dimensionsEqual =
    firstFile.width === secondFile.width && firstFile.height === secondFile.height;

  push({
    key: 'comparison.fingerprints_equal',
    value: fingerprintsEqual,
    valueType: 'boolean',
    authority: 'file_measurement',
    interpretationCode: 'exact_byte_versions_compared',
  });
  push({
    key: 'comparison.byte_sizes_equal',
    value: byteSizesEqual,
    valueType: 'boolean',
    authority: 'file_measurement',
    interpretationCode: 'compressed_size_compared',
  });
  push({
    key: 'comparison.formats_equal',
    value: formatsEqual,
    valueType: 'boolean',
    authority: 'file_measurement',
    interpretationCode: 'detected_format_compared',
  });
  push({
    key: 'comparison.dimensions_equal',
    value: dimensionsEqual,
    valueType: 'boolean',
    authority: 'file_measurement',
    interpretationCode: 'decoded_dimensions_compared',
  });

  let different = !fingerprintsEqual || !byteSizesEqual || !formatsEqual || !dimensionsEqual;
  let gap = false;

  const firstMetadata = metadataValues(input.first.metadata);
  const secondMetadata = metadataValues(input.second.metadata);
  const metadataFields = METADATA_FIELD_KEYS.map((field) =>
    compareMetadataField(field, firstMetadata, secondMetadata),
  );

  for (const entry of metadataFields) {
    push({
      key: `comparison.metadata.${entry.field}`,
      value: entry.status,
      valueType: 'code',
      authority: 'unverified_metadata',
      interpretationCode: 'unverified_clue_compared',
    });

    if (hasDifference(entry.status)) {
      different = true;
    } else if (isMetadataGap(entry.status)) {
      gap = true;
    }
  }

  const comparedMetadataFields = metadataFields.filter(
    (entry) => entry.status !== 'not_evaluated',
  ).length;
  const differentMetadataFields = metadataFields.filter((entry) =>
    hasDifference(entry.status),
  ).length;

  push({
    key: 'comparison.metadata_fields_compared',
    value: comparedMetadataFields,
    valueType: 'number',
    authority: 'unverified_metadata',
    interpretationCode: 'allowlisted_fields_compared',
  });
  push({
    key: 'comparison.metadata_fields_different',
    value: differentMetadataFields,
    valueType: 'number',
    authority: 'unverified_metadata',
    interpretationCode: 'allowlisted_fields_compared',
  });

  const firstFinding = input.first.finding;
  const secondFinding = input.second.finding;

  for (const [dimension] of C2PA_DIMENSIONS) {
    const status = compareC2paDimension(dimension, firstFinding, secondFinding);

    push({
      key: `comparison.c2pa.${dimension}`,
      value: status,
      valueType: 'code',
      authority: 'cryptographic_validation',
      interpretationCode: 'validator_states_compared',
    });

    if (status === 'different') {
      different = true;
    } else if (status === 'not_evaluated') {
      gap = true;
    }
  }

  let preview: PreviewComparison;

  if (input.preview.status === 'measured') {
    const { metric } = input.preview;

    preview = {
      status: 'measured',
      methodId: PREVIEW_METHOD_ID,
      decoderId: PREVIEW_DECODER_ID,
      width: input.preview.targetWidth,
      height: input.preview.targetHeight,
      pixelCount: metric.pixelCount,
      meanAbsoluteChannelError: metric.meanAbsoluteChannelError,
      channelThreshold: PREVIEW_CHANNEL_THRESHOLD,
      changedPixelCount: metric.changedPixelCount,
      changedPixelShare: metric.changedPixelShare,
    };

    push({
      key: 'comparison.preview_status',
      value: 'measured',
      valueType: 'code',
      authority: 'file_measurement',
      interpretationCode: 'normalized_preview_measured',
    });
    push({
      key: 'comparison.preview_width',
      value: preview.width,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_height',
      value: preview.height,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_pixel_count',
      value: preview.pixelCount,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_mean_absolute_channel_error',
      value: preview.meanAbsoluteChannelError,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_channel_threshold',
      value: preview.channelThreshold,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_changed_pixel_count',
      value: preview.changedPixelCount,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_changed_pixel_share',
      value: preview.changedPixelShare,
      valueType: 'number',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_method_id',
      value: preview.methodId,
      valueType: 'code',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_decoder_id',
      value: preview.decoderId,
      valueType: 'code',
      authority: 'file_measurement',
    });

    if (preview.meanAbsoluteChannelError > 0) {
      different = true;
    }
  } else {
    preview = { status: 'skipped', reason: input.preview.reason };

    push({
      key: 'comparison.preview_status',
      value: 'skipped',
      valueType: 'code',
      authority: 'file_measurement',
    });
    push({
      key: 'comparison.preview_skip_reason',
      value: input.preview.reason,
      valueType: 'code',
      authority: 'file_measurement',
    });

    if (isPreviewGap(input.preview.reason)) {
      gap = true;
    }
  }

  const outcome = different ? 'different' : gap ? 'inconclusive' : 'equal';

  if (gap) {
    warnings.push(INCOMPLETE_INPUT_WARNING);
  }

  const startedAtUtc = input.now().toISOString();
  const finishedAtUtc = input.now().toISOString();
  const limitations = [
    ...COMPARISON_LIMITATIONS,
    METADATA_COMPARISON_LIMITATION,
    ...(preview.status === 'measured'
      ? [PREVIEW_NORMALIZATION_NOTE]
      : [PREVIEW_SKIPPED_LIMITATION]),
  ];

  const checkDraft: CheckResult = {
    checkId,
    kind: 'comparison',
    executionState: 'completed',
    outcome,
    checkerName: COMPARISON_CHECKER_NAME,
    checkerVersion: APP_VERSION,
    startedAtUtc,
    finishedAtUtc,
    evidence,
    warnings: warnings.slice(0, MAX_WARNINGS),
    limitations,
  };

  const comparisonDraft: Comparison = {
    fileIds: [firstFile.fileId, secondFile.fileId],
    checkId,
    metadataFields,
    preview,
  };

  const parsedCheck = checkResultSchema.safeParse(checkDraft);
  const parsedComparison = comparisonSchema.safeParse(comparisonDraft);

  if (!parsedCheck.success || !parsedComparison.success) {
    return {
      status: 'error',
      error: pipelineError('PIPELINE_CONTRACT_VIOLATION'),
    };
  }

  return {
    status: 'ok',
    check: parsedCheck.data,
    comparison: parsedComparison.data,
    evidence: parsedCheck.data.evidence,
  };
}
