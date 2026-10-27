import type { C2paFinding, CheckResult } from '@/lib/results/schemas';
import type { MetadataInspection } from '@/lib/metadata/inspect';

/**
 * Deterministic Evidence explanation (PRD 5.4 item 7, Stage 7).
 *
 * The text is assembled from typed results only. It never sees free-form model
 * prose, never adds a finding, and never promotes an unknown, failed, or
 * unevaluated state. The optional P1 model explanation would render next to
 * this text, not replace it.
 */

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeCredential(check: CheckResult | undefined, finding: C2paFinding | null): string {
  if (check === undefined) {
    return 'No credential check is recorded for this file.';
  }

  if (check.executionState !== 'completed') {
    const state = check.executionState === 'timed_out' ? 'timed out' : check.executionState;

    return `The credential check ${state}, so no credential conclusion is available. Other completed checks are unaffected.`;
  }

  if (check.outcome === 'unsupported') {
    return 'This file is outside the credential checker’s supported scope, so no credential evidence was inspected.';
  }

  if (check.outcome === 'not_present') {
    return 'No supported embedded credential was found. Only credentials embedded in this file were inspected; external and durable credentials were not searched.';
  }

  if (finding === null) {
    return 'The credential check completed but recorded no structured finding, so no credential conclusion is available.';
  }

  if (finding.manifestPresence !== 'present') {
    return 'The credential check did not record an embedded manifest, so no credential conclusion is available.';
  }

  const failed: string[] = [];

  if (finding.manifestValidation === 'invalid') {
    failed.push('the manifest');
  }
  if (finding.signatureValidation === 'invalid') {
    failed.push('the claim signature');
  }
  if (finding.contentBindingValidation === 'invalid') {
    failed.push('the asset binding');
  }

  if (failed.length > 0) {
    return `The validator reported that ${failed.join(', ')} did not validate. This is a finding about the credential, not proof of intent or deception.`;
  }

  if (
    finding.manifestValidation === 'valid' &&
    finding.signatureValidation === 'valid' &&
    finding.contentBindingValidation === 'valid'
  ) {
    const trust =
      finding.signerTrust === 'trusted'
        ? 'Signer trust is reported as trusted under the configured policy.'
        : 'Signer trust is not evaluated under the configured policy, which configures no trust anchors.';

    return `An embedded credential is present, and the configured validator reports the manifest, claim signature, and asset binding as valid for this exact file version. ${trust}`;
  }

  const unknown: string[] = [];

  if (finding.manifestValidation === 'unknown' || finding.manifestValidation === 'not_evaluated') {
    unknown.push('manifest validity');
  }
  if (
    finding.signatureValidation === 'unknown' ||
    finding.signatureValidation === 'not_evaluated'
  ) {
    unknown.push('signature validity');
  }
  if (
    finding.contentBindingValidation === 'unknown' ||
    finding.contentBindingValidation === 'not_evaluated'
  ) {
    unknown.push('asset binding');
  }

  return `An embedded credential is present, but the validator did not establish a supported result for ${unknown.join(', ')}. No conclusion follows from the missing component results.`;
}

function describeMetadata(metadata: MetadataInspection | null): string {
  if (metadata === null) {
    return 'The metadata check did not run, so no metadata clue was recorded.';
  }

  if (metadata.status === 'failed') {
    return 'The metadata parser did not complete, so no metadata clue was recorded.';
  }

  if (metadata.status === 'not_present') {
    return 'No embedded metadata was found. That is not evidence that metadata was deliberately removed.';
  }

  if (metadata.fields.length === 0) {
    return 'No selected metadata fields were found. That is not evidence that metadata was deliberately removed.';
  }

  const gps =
    metadata.gpsPresence === 'present'
      ? 'location metadata is present and its coordinates are withheld'
      : metadata.gpsPresence === 'not_present'
        ? 'no location metadata was found'
        : 'location-metadata presence was not evaluated';

  return `Embedded metadata yielded ${formatCount(metadata.fields.length, 'allowlisted field', 'allowlisted fields')} as unverified clues, and ${gps}.`;
}

export type ExplanationInput = Readonly<{
  checks: readonly CheckResult[];
  finding: C2paFinding | null;
  metadata: MetadataInspection | null;
}>;

export function buildDeterministicExplanation(input: ExplanationInput): string {
  const credentialCheck = input.checks.find((check) => check.kind === 'c2pa');
  const parts = [
    describeCredential(credentialCheck, input.finding),
    describeMetadata(input.metadata),
  ];

  return parts.join(' ');
}
