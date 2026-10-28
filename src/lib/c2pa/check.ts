import { createId } from '@/lib/results/ids';
import {
  checkResultSchema,
  c2paFindingSchema,
  type C2paFinding,
  type CheckResult,
  type EvidenceItem,
} from '@/lib/results/schemas';
import type { C2paInspection, C2paStatusEntry, MappedC2paStore } from './types';
import {
  C2PA_CHECKER_NAME,
  C2PA_LIMITATIONS,
  C2PA_SDK_VERSION,
  C2PA_TRUST_POLICY_ID,
} from './asset';

/**
 * Turns one inspection attempt into a CheckResult plus, when a manifest could
 * be read, a C2paFinding. Every sub-result is derived from an explicit
 * allowlist of SDK codes. A code this build does not recognise is preserved as
 * a code and reported as needing interpretation; it can never set a validation
 * or trust state.
 */

type ValidationState = C2paFinding['signatureValidation'];
type SignerTrust = C2paFinding['signerTrust'];
type RevocationStatus = C2paFinding['revocationStatus'];

const MANIFEST_VALID_STATES = new Set(['Valid', 'Trusted']);
const MANIFEST_INVALID_STATES = new Set(['Invalid']);

const SIGNATURE_FAILURE_CODES = new Set(['claimSignature.mismatch', 'claimSignature.invalid']);
const SIGNATURE_SUCCESS_CODE = 'claimSignature.validated';

const CONTENT_BINDING_FAILURE_CODES = new Set([
  'assertion.dataHash.mismatch',
  'assertion.hashedURI.mismatch',
]);
const CONTENT_BINDING_SUCCESS_CODE = 'assertion.dataHash.match';

const TIMESTAMP_FAILURE_CODES = new Set(['timeStamp.mismatch']);
const TIMESTAMP_SUCCESS_CODE = 'timeStamp.validated';
const TIMESTAMP_ABSENT_CODES = new Set(['timeStamp.missing']);

const TRUST_SUCCESS_CODE = 'signingCredential.trusted';
const TRUST_NOT_EVALUATED_CODE = 'signingCredential.untrusted';

const REVOCATION_REVOKED_CODES = new Set([
  'signingCredential.revoked',
  'signingCredential.ocsp.revoked',
]);
const REVOCATION_GOOD_CODES = new Set(['signingCredential.ocsp.good']);

/** Codes this build interprets. Anything else is preserved but not applied. */
const INTERPRETED_CODES: ReadonlySet<string> = new Set([
  'assertion.dataHash.match',
  'assertion.dataHash.mismatch',
  'assertion.hashedURI.match',
  'assertion.hashedURI.mismatch',
  'claimSignature.insideValidity',
  'claimSignature.invalid',
  'claimSignature.mismatch',
  'claimSignature.validated',
  'signingCredential.expired',
  'signingCredential.ocsp.good',
  'signingCredential.ocsp.revoked',
  'signingCredential.ocsp.skipped',
  'signingCredential.revoked',
  'signingCredential.trusted',
  'signingCredential.untrusted',
  'timeStamp.mismatch',
  'timeStamp.missing',
  'timeStamp.trusted',
  'timeStamp.validated',
]);

const STATUS_INTERPRETATIONS: Readonly<Record<string, string>> = {
  'assertion.dataHash.match': 'content_binding_valid',
  'assertion.dataHash.mismatch': 'content_binding_invalid',
  'assertion.hashedURI.match': 'assertion_hash_valid',
  'assertion.hashedURI.mismatch': 'assertion_hash_invalid',
  'claimSignature.insideValidity': 'signature_inside_validity',
  'claimSignature.invalid': 'signature_invalid',
  'claimSignature.mismatch': 'signature_invalid',
  'claimSignature.validated': 'signature_valid',
  'signingCredential.expired': 'signing_credential_outside_validity',
  'signingCredential.ocsp.good': 'revocation_not_revoked',
  'signingCredential.ocsp.revoked': 'revocation_revoked',
  'signingCredential.ocsp.skipped': 'revocation_not_evaluated',
  'signingCredential.revoked': 'revocation_revoked',
  'signingCredential.trusted': 'signer_trust_trusted',
  'signingCredential.untrusted': 'signer_trust_not_evaluated',
  'timeStamp.mismatch': 'timestamp_invalid',
  'timeStamp.missing': 'timestamp_absent',
  'timeStamp.trusted': 'timestamp_certificate_trusted',
  'timeStamp.validated': 'timestamp_valid',
};

const UNKNOWN_CODE_INTERPRETATION = 'unknown_sdk_code';

const TRUST_POLICY_WARNING =
  'Signer trust was not evaluated: this build configures no trust anchors, so the C2PA SDK reports every signing credential as untrusted.';

const UNRESOLVED_MANIFEST_WARNING =
  'The active manifest could not be identified, so recorded actions and ingredients may be incomplete.';

const EXPIRED_CREDENTIAL_WARNING =
  'The SDK reported the signing credential as expired. Signature validity, timestamp status, and signer trust are reported separately.';

const NOT_PRESENT_LIMITATION =
  'No embedded C2PA credential was found. Absence is not evidence that the image is unedited, human-made, or trustworthy.';

const UNSUPPORTED_LIMITATION =
  'This file format is outside the supported C2PA inspection set, so no credential evidence was checked.';

const CANCELLED_LIMITATION =
  'The check was cancelled before any credential result was recorded. No conclusion follows from the cancellation.';

const MAX_WARNINGS = 10;
const MAX_EVIDENCE = 50;
const MAX_UNKNOWN_CODE_WARNINGS = 5;

const TRUST_NOT_EVALUATED_CODES: ReadonlySet<string> = new Set([TRUST_NOT_EVALUATED_CODE]);
const EXPIRED_CREDENTIAL_CODES: ReadonlySet<string> = new Set(['signingCredential.expired']);

function hasAnyCode(store: MappedC2paStore, codes: ReadonlySet<string>): boolean {
  return store.statusEntries.some((entry) => codes.has(entry.code));
}

function hasSuccessCode(store: MappedC2paStore, code: string): boolean {
  return store.statusEntries.some((entry) => entry.group === 'success' && entry.code === code);
}

function deriveManifestValidation(state: string | null): ValidationState {
  if (state === null) {
    return 'unknown';
  }

  if (MANIFEST_VALID_STATES.has(state)) {
    return 'valid';
  }

  if (MANIFEST_INVALID_STATES.has(state)) {
    return 'invalid';
  }

  return 'unknown';
}

function deriveSignatureValidation(store: MappedC2paStore): ValidationState {
  if (hasAnyCode(store, SIGNATURE_FAILURE_CODES)) {
    return 'invalid';
  }

  return hasSuccessCode(store, SIGNATURE_SUCCESS_CODE) ? 'valid' : 'unknown';
}

function deriveContentBindingValidation(store: MappedC2paStore): ValidationState {
  if (hasAnyCode(store, CONTENT_BINDING_FAILURE_CODES)) {
    return 'invalid';
  }

  return hasSuccessCode(store, CONTENT_BINDING_SUCCESS_CODE) ? 'valid' : 'unknown';
}

function deriveTimestampValidation(store: MappedC2paStore): ValidationState {
  if (hasAnyCode(store, TIMESTAMP_FAILURE_CODES)) {
    return 'invalid';
  }

  if (hasSuccessCode(store, TIMESTAMP_SUCCESS_CODE)) {
    return 'valid';
  }

  const missingTimestamp = store.statusEntries.find((entry) =>
    TIMESTAMP_ABSENT_CODES.has(entry.code),
  );

  if (missingTimestamp === undefined) {
    return 'not_evaluated';
  }

  // The SDK reports that the manifest carries no timestamp. Keep the validator's
  // own classification: a failure-group report stays a negative finding, while an
  // informational one means the timestamp check did not apply to this manifest.
  return missingTimestamp.group === 'failure' ? 'invalid' : 'not_applicable';
}

/**
 * Signer trust is only ever `trusted` when the SDK establishes it explicitly.
 * This build configures no trust anchors, so `signingCredential.untrusted`
 * carries no distinguishing information and is reported as `not_evaluated`
 * rather than as a negative trust finding.
 */
function deriveSignerTrust(store: MappedC2paStore): SignerTrust {
  if (store.validationState === 'Trusted' || hasSuccessCode(store, TRUST_SUCCESS_CODE)) {
    return 'trusted';
  }

  return 'not_evaluated';
}

function deriveRevocationStatus(store: MappedC2paStore): RevocationStatus {
  if (hasAnyCode(store, REVOCATION_REVOKED_CODES)) {
    return 'revoked';
  }

  return hasAnyCode(store, REVOCATION_GOOD_CODES) ? 'not_revoked' : 'not_evaluated';
}

function interpretStatus(entry: C2paStatusEntry): string {
  if (!INTERPRETED_CODES.has(entry.code)) {
    return UNKNOWN_CODE_INTERPRETATION;
  }

  return STATUS_INTERPRETATIONS[entry.code] ?? UNKNOWN_CODE_INTERPRETATION;
}

function pushWarning(warnings: string[], warning: string): void {
  if (warnings.length < MAX_WARNINGS && !warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function deriveWarnings(store: MappedC2paStore, warnings: string[]): void {
  if (hasAnyCode(store, TRUST_NOT_EVALUATED_CODES)) {
    pushWarning(warnings, TRUST_POLICY_WARNING);
  }

  if (hasAnyCode(store, EXPIRED_CREDENTIAL_CODES)) {
    pushWarning(warnings, EXPIRED_CREDENTIAL_WARNING);
  }

  if (store.activeManifestLabel === null) {
    pushWarning(warnings, UNRESOLVED_MANIFEST_WARNING);
  }

  const unknownCodes = store.statusEntries
    .map((entry) => entry.code)
    .filter((code) => !INTERPRETED_CODES.has(code));

  for (const code of unknownCodes.slice(0, MAX_UNKNOWN_CODE_WARNINGS)) {
    pushWarning(
      warnings,
      `Unrecognized SDK status code "${code}" needs interpretation; it is preserved without a validation meaning.`,
    );
  }

  if (unknownCodes.length > MAX_UNKNOWN_CODE_WARNINGS) {
    pushWarning(
      warnings,
      'Additional unrecognized SDK status codes were preserved without interpretation.',
    );
  }

  if (store.omittedEntryCount > 0) {
    pushWarning(
      warnings,
      `${store.omittedEntryCount} manifest entries were omitted because the recorded evidence is bounded.`,
    );
  }
}

type EvidenceDraft = Readonly<{
  key: string;
  value: string;
  valueType: EvidenceItem['valueType'];
  authority: EvidenceItem['authority'];
  interpretationCode?: string;
}>;

function toEvidenceItem(
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

type BuiltEvidence = Readonly<{
  evidence: EvidenceItem[];
  actions: C2paFinding['actions'];
  ingredients: C2paFinding['ingredients'];
}>;

function buildEvidence(
  checkId: string,
  store: MappedC2paStore,
  createEvidenceId: () => string,
): BuiltEvidence {
  const evidence: EvidenceItem[] = [];
  const actions: C2paFinding['actions'] = [];
  const ingredients: C2paFinding['ingredients'] = [];

  const push = (draft: EvidenceDraft): string | null => {
    if (evidence.length >= MAX_EVIDENCE) {
      return null;
    }

    const evidenceId = createEvidenceId();
    evidence.push(toEvidenceItem(checkId, evidenceId, draft));

    return evidenceId;
  };

  push({
    key: 'c2pa.manifest.presence',
    value: 'present',
    valueType: 'code',
    authority: 'file_measurement',
    interpretationCode: 'embedded_manifest_found',
  });

  if (store.validationState !== null) {
    const stateRecognized =
      MANIFEST_VALID_STATES.has(store.validationState) ||
      MANIFEST_INVALID_STATES.has(store.validationState);

    push({
      key: 'c2pa.manifest.validation_state',
      value: store.validationState,
      valueType: 'code',
      authority: 'cryptographic_validation',
      interpretationCode: stateRecognized
        ? 'validation_state_reported'
        : 'unrecognized_validation_state',
    });
  }

  if (store.claimGenerator !== null) {
    push({
      key: 'c2pa.manifest.claim_generator',
      value: store.claimGenerator,
      valueType: 'text',
      authority: 'unverified_metadata',
      interpretationCode: 'recorded_manifest_statement',
    });
  }

  if (store.title !== null) {
    push({
      key: 'c2pa.manifest.title',
      value: store.title,
      valueType: 'text',
      authority: 'unverified_metadata',
      interpretationCode: 'recorded_manifest_statement',
    });
  }

  for (const entry of store.statusEntries) {
    const interpretation = interpretStatus(entry);

    push({
      key: `c2pa.status.${entry.code}`.slice(0, 120),
      value: entry.explanation ?? entry.code,
      valueType: 'code',
      authority: 'cryptographic_validation',
      interpretationCode: interpretation,
    });
  }

  for (const [index, action] of store.actions.entries()) {
    const evidenceId = push({
      key: `c2pa.action.${index}`,
      value: action.actionCode,
      valueType: 'code',
      authority: 'unverified_metadata',
      interpretationCode: 'recorded_manifest_statement',
    });

    if (evidenceId !== null) {
      actions.push({ actionCode: action.actionCode, sourceEvidenceId: evidenceId });
    }
  }

  for (const [index, ingredient] of store.ingredients.entries()) {
    const value = ingredient.title ?? ingredient.relationship;

    if (value === null) {
      continue;
    }

    const evidenceId = push({
      key: `c2pa.ingredient.${index}`,
      value,
      valueType: 'text',
      authority: 'unverified_metadata',
      interpretationCode: 'recorded_manifest_statement',
    });

    if (evidenceId !== null) {
      const reference: C2paFinding['ingredients'][number] = { sourceEvidenceId: evidenceId };

      if (ingredient.relationship !== null) {
        reference.relationship = ingredient.relationship;
      }

      if (ingredient.title !== null) {
        reference.title = ingredient.title;
      }

      ingredients.push(reference);
    }
  }

  if (store.signatureInfo) {
    if (store.signatureInfo.issuer !== null) {
      push({
        key: 'c2pa.signature.issuer',
        value: store.signatureInfo.issuer,
        valueType: 'text',
        authority: 'cryptographic_validation',
        interpretationCode: 'recorded_signature_issuer',
      });
    }

    if (store.signatureInfo.commonName !== null) {
      push({
        key: 'c2pa.signature.common_name',
        value: store.signatureInfo.commonName,
        valueType: 'text',
        authority: 'cryptographic_validation',
        interpretationCode: 'recorded_signature_common_name',
      });
    }

    if (store.signatureInfo.serialNumber !== null) {
      push({
        key: 'c2pa.signature.cert_serial_number',
        value: store.signatureInfo.serialNumber,
        valueType: 'code',
        authority: 'cryptographic_validation',
        interpretationCode: 'recorded_signature_serial',
      });
    }

    if (store.signatureInfo.time !== null) {
      const parsedTime = new Date(store.signatureInfo.time);
      const isoTime = !Number.isNaN(parsedTime.getTime()) ? parsedTime.toISOString() : null;

      if (isoTime !== null) {
        push({
          key: 'c2pa.signature.time',
          value: isoTime,
          valueType: 'timestamp',
          authority: 'cryptographic_validation',
          interpretationCode: 'recorded_signature_time',
        });
      } else {
        push({
          key: 'c2pa.signature.time',
          value: store.signatureInfo.time,
          valueType: 'text',
          authority: 'cryptographic_validation',
          interpretationCode: 'recorded_signature_time',
        });
      }
    }

    if (store.signatureInfo.algorithm !== null) {
      push({
        key: 'c2pa.signature.algorithm',
        value: store.signatureInfo.algorithm,
        valueType: 'code',
        authority: 'cryptographic_validation',
        interpretationCode: 'recorded_signature_algorithm',
      });
    }
  }

  return { evidence, actions, ingredients };
}

function buildPresentFinding(
  store: MappedC2paStore,
  actions: C2paFinding['actions'],
  ingredients: C2paFinding['ingredients'],
  warnings: string[],
): C2paFinding {
  return {
    manifestPresence: 'present',
    manifestValidation: deriveManifestValidation(store.validationState),
    signatureValidation: deriveSignatureValidation(store),
    contentBindingValidation: deriveContentBindingValidation(store),
    signerTrust: deriveSignerTrust(store),
    timestampValidation: deriveTimestampValidation(store),
    revocationStatus: deriveRevocationStatus(store),
    trustPolicyId: C2PA_TRUST_POLICY_ID,
    sdkVersion: C2PA_SDK_VERSION,
    sdkCodes: store.statusEntries.map((entry) => entry.code),
    actions,
    ingredients,
    warnings: warnings.slice(0, MAX_WARNINGS),
  };
}

function buildAbsentFinding(
  presence: 'not_present' | 'unsupported',
): C2paFinding {
  return {
    manifestPresence: presence,
    manifestValidation: 'not_evaluated',
    signatureValidation: 'not_evaluated',
    contentBindingValidation: 'not_evaluated',
    signerTrust: 'not_evaluated',
    timestampValidation: 'not_evaluated',
    revocationStatus: 'not_evaluated',
    trustPolicyId: C2PA_TRUST_POLICY_ID,
    sdkVersion: C2PA_SDK_VERSION,
    sdkCodes: [],
    actions: [],
    ingredients: [],
    warnings: [],
  };
}

/** Keeps the recorded finish time from preceding the start time. */
function normalizeFinishedAt(startedAtUtc: string, finishedAtUtc: string): string {
  const started = Date.parse(startedAtUtc);
  const finished = Date.parse(finishedAtUtc);

  if (Number.isNaN(started) || Number.isNaN(finished) || finished < started) {
    return startedAtUtc;
  }

  return finishedAtUtc;
}

export type C2paCheckInput = Readonly<{
  checkId: string;
  fileId: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  inspection: C2paInspection;
  /** Injectable for deterministic tests. Defaults to a session-random ID. */
  createEvidenceId?: () => string;
}>;

export type C2paCheckOutput = Readonly<{
  check: CheckResult;
  finding: C2paFinding | null;
}>;

function buildInterruptedCheck(
  input: C2paCheckInput,
  executionState: 'failed' | 'cancelled' | 'timed_out',
  errorCode: string | undefined,
  limitations: readonly string[],
): C2paCheckOutput {
  const check: CheckResult = {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: 'c2pa',
    executionState,
    checkerName: C2PA_CHECKER_NAME,
    checkerVersion: C2PA_SDK_VERSION,
    startedAtUtc: input.startedAtUtc,
    finishedAtUtc: normalizeFinishedAt(input.startedAtUtc, input.finishedAtUtc),
    evidence: [],
    warnings: [],
    limitations: [...limitations],
    ...(errorCode === undefined ? {} : { errorCode }),
  };

  return { check, finding: null };
}

function buildC2paCheck(input: C2paCheckInput): C2paCheckOutput {
  const { inspection } = input;
  const createEvidenceId = input.createEvidenceId ?? (() => createId('ev'));

  if (inspection.status === 'failed') {
    return buildInterruptedCheck(input, 'failed', inspection.errorCode, C2PA_LIMITATIONS);
  }

  if (inspection.status === 'timed_out') {
    return buildInterruptedCheck(input, 'timed_out', 'C2PA_TIMEOUT', C2PA_LIMITATIONS);
  }

  if (inspection.status === 'cancelled') {
    return buildInterruptedCheck(input, 'cancelled', undefined, [
      ...C2PA_LIMITATIONS,
      CANCELLED_LIMITATION,
    ]);
  }

  const finishedAtUtc = normalizeFinishedAt(input.startedAtUtc, input.finishedAtUtc);
  const base = {
    checkId: input.checkId,
    fileId: input.fileId,
    kind: 'c2pa',
    executionState: 'completed',
    checkerName: C2PA_CHECKER_NAME,
    checkerVersion: C2PA_SDK_VERSION,
    startedAtUtc: input.startedAtUtc,
    finishedAtUtc,
  } as const;

  if (inspection.status === 'unsupported') {
    return {
      check: {
        ...base,
        outcome: 'unsupported',
        evidence: [
          toEvidenceItem(input.checkId, createEvidenceId(), {
            key: 'c2pa.manifest.presence',
            value: 'unsupported',
            valueType: 'code',
            authority: 'file_measurement',
            interpretationCode: 'format_outside_c2pa_scope',
          }),
        ],
        warnings: [],
        limitations: [...C2PA_LIMITATIONS, UNSUPPORTED_LIMITATION],
      },
      finding: buildAbsentFinding('unsupported'),
    };
  }

  if (inspection.status === 'not_present') {
    return {
      check: {
        ...base,
        outcome: 'not_present',
        evidence: [
          toEvidenceItem(input.checkId, createEvidenceId(), {
            key: 'c2pa.manifest.presence',
            value: 'not_present',
            valueType: 'code',
            authority: 'file_measurement',
            interpretationCode: 'no_embedded_manifest',
          }),
        ],
        warnings: [],
        limitations: [...C2PA_LIMITATIONS, NOT_PRESENT_LIMITATION],
      },
      finding: buildAbsentFinding('not_present'),
    };
  }

  const warnings: string[] = [];
  deriveWarnings(inspection.store, warnings);

  const built = buildEvidence(input.checkId, inspection.store, createEvidenceId);

  return {
    check: {
      ...base,
      outcome: 'present',
      ...(inspection.store.validationState === null
        ? {}
        : { rawCode: inspection.store.validationState }),
      evidence: built.evidence,
      warnings: warnings.slice(0, MAX_WARNINGS),
      limitations: [...C2PA_LIMITATIONS],
    },
    finding: buildPresentFinding(inspection.store, built.actions, built.ingredients, warnings),
  };
}

/**
 * Builds the ledger entry and validates both contracts before returning them.
 * A contract violation degrades to a failed check rather than emitting a value
 * that cannot be trusted downstream.
 */
export function buildC2paResult(input: C2paCheckInput): C2paCheckOutput {
  const output = buildC2paCheck(input);
  const parsedCheck = checkResultSchema.safeParse(output.check);
  const parsedFinding =
    output.finding === null ? null : c2paFindingSchema.safeParse(output.finding);

  if (!parsedCheck.success || (parsedFinding !== null && !parsedFinding.success)) {
    return buildInterruptedCheck(input, 'failed', 'C2PA_INTERNAL_ERROR', C2PA_LIMITATIONS);
  }

  return {
    check: parsedCheck.data,
    finding: parsedFinding === null ? null : parsedFinding.data,
  };
}
