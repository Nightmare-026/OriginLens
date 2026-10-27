import { buildC2paResult } from '@/lib/c2pa/check';
import type { C2paInspection } from '@/lib/c2pa/types';
import { isSha256Hex } from '@/lib/fingerprint/sha256';
import { FORMAT_TO_MIME } from '@/lib/intake/format';
import {
  validateDeclaredFile,
  validateDimensions,
  validateHeader,
  type PreflightedFile,
} from '@/lib/intake/preflight';
import type { MetadataInspection } from '@/lib/metadata/inspect';
import { METADATA_LIMITATIONS, METADATA_PARSER } from '@/lib/metadata/inspect';
import {
  checkResultSchema,
  collectDanglingC2paEvidenceRefs,
  fileRecordSchema,
  type C2paFinding,
  type CheckResult,
  type EvidenceItem,
  type FileRecord,
} from '@/lib/results/schemas';
import { MAX_FILE_BYTES } from '@/lib/security/limits';
import {
  buildFingerprintCheck,
  buildIntakeCheck,
  buildMetadataCheck,
  buildSkippedCheck,
} from './checks';
import { pipelineError } from './errors';
import { buildDeterministicExplanation } from './explanation';
import { summarize } from './summary';
import {
  DECODE_PIPELINE_VERSION,
  PIPELINE_STAGES,
  type AnalysisResult,
  type AnalyzeDependencies,
  type AnalyzeInput,
  type FileAnalysis,
  type StageEvent,
} from './types';

/**
 * Single-file analysis, PRD 7 Stages 1-4 and 7.
 *
 * Invariants:
 * - Size, extension, and browser-reported type are validated before any bytes
 *   are read; the signature is validated before the decoder runs.
 * - The fingerprint is computed from the one buffer read from the original
 *   `File`, and that buffer is the same one the metadata parser sees.
 * - The C2PA check receives the original `File` plus the detected format, so
 *   the SDK never infers a format from filename labels.
 * - A failed non-critical check never erases an independent completed result.
 * - Cancellation keeps completed checks and records the remaining ones as
 *   cancelled/skipped, so coverage stays visible.
 * - Every check and the file record are runtime-validated before display.
 */

const CANCELLED_BEFORE_RESULT_LIMITATION =
  'The session was cancelled before this check produced a result. No conclusion follows.';

function safeInspectionFailure(): MetadataInspection {
  return {
    status: 'failed',
    fields: [],
    gpsPresence: 'unknown',
    parser: METADATA_PARSER,
    warnings: ['Embedded metadata could not be parsed. Independent checks are unaffected.'],
    limitations: [...METADATA_LIMITATIONS],
    errorCode: 'METADATA_PARSE_FAILED',
  };
}

function normalizeFinish(startedAtUtc: string, finishedAtUtc: string): string {
  const started = Date.parse(startedAtUtc);
  const finished = Date.parse(finishedAtUtc);

  if (Number.isNaN(started) || Number.isNaN(finished) || finished < started) {
    return startedAtUtc;
  }

  return finishedAtUtc;
}

function assertCheck(check: CheckResult): CheckResult {
  const parsed = checkResultSchema.safeParse(check);

  if (!parsed.success) {
    throw new Error('PIPELINE_CONTRACT_VIOLATION');
  }

  return parsed.data;
}

/**
 * Drops a finding whose action or ingredient references do not resolve, and
 * records the credential check as failed. The report contract has no place for
 * an unresolvable reference, so this fails closed instead of rendering it.
 */
function resolveC2paFinding(
  check: CheckResult,
  finding: C2paFinding | null,
): Readonly<{ check: CheckResult; finding: C2paFinding | null }> {
  if (finding === null) {
    return { check, finding: null };
  }

  const dangling = collectDanglingC2paEvidenceRefs(
    finding,
    check.evidence.map((item) => item.evidenceId),
  );

  if (dangling.length === 0) {
    return { check, finding };
  }

  return {
    check: assertCheck({
      checkId: check.checkId,
      ...(check.fileId === undefined ? {} : { fileId: check.fileId }),
      kind: 'c2pa',
      executionState: 'failed',
      checkerName: check.checkerName,
      ...(check.checkerVersion === undefined ? {} : { checkerVersion: check.checkerVersion }),
      ...(check.startedAtUtc === undefined ? {} : { startedAtUtc: check.startedAtUtc }),
      ...(check.finishedAtUtc === undefined ? {} : { finishedAtUtc: check.finishedAtUtc }),
      evidence: [],
      warnings: check.warnings,
      limitations: check.limitations,
      errorCode: 'C2PA_INTERNAL_ERROR',
    }),
    finding: null,
  };
}

export async function runFileAnalysis(
  input: AnalyzeInput,
  deps: AnalyzeDependencies,
): Promise<AnalysisResult> {
  const { file, signal } = input;
  const fileId = deps.createId('file');
  const checks: CheckResult[] = [];
  let finding: C2paFinding | null = null;
  let metadata: MetadataInspection | null = null;
  let preflighted: PreflightedFile | null = null;
  let fileRecord: FileRecord | null = null;
  let cancelled = false;

  const emit = (event: StageEvent): void => {
    input.onStage?.(event);
  };

  const contractFailure = (): AnalysisResult => ({
    status: 'error',
    error: pipelineError('PIPELINE_CONTRACT_VIOLATION'),
  });

  const finalize = (): AnalysisResult => {
    if (fileRecord === null) {
      return cancelled ? { status: 'cancelled' } : contractFailure();
    }

    const record = fileRecordSchema.safeParse(fileRecord);

    if (!record.success) {
      return contractFailure();
    }

    const evidence: EvidenceItem[] = checks.flatMap((check) => check.evidence);

    if (new Set(evidence.map((item) => item.evidenceId)).size !== evidence.length) {
      return contractFailure();
    }

    const analysis: FileAnalysis = {
      file: record.data,
      checks,
      finding,
      evidence,
      metadata,
      summaryCodes: summarize({
        checks,
        findings: finding === null ? [] : [finding],
      }),
      explanation: buildDeterministicExplanation({ checks, finding, metadata }),
      cancelled,
    };

    return { status: 'ok', analysis };
  };

  /**
   * Marks every stage that produced no check as `skipped`, then finalizes.
   * PRD 12.2: work that never started is skipped, and only a check that
   * started and was interrupted is cancelled. Stages before a reusable file
   * record are not shown, because a ledger without a fingerprint would have to
   * invent one.
   */
  const finalizeCancelled = (): AnalysisResult => {
    cancelled = true;

    if (fileRecord === null) {
      return { status: 'cancelled' };
    }

    for (const stage of PIPELINE_STAGES) {
      if (checks.some((check) => check.kind === stage)) {
        continue;
      }

      checks.push(
        assertCheck(
          buildSkippedCheck({
            stage,
            checkId: deps.createId('chk'),
            fileId,
            limitation: CANCELLED_BEFORE_RESULT_LIMITATION,
          }),
        ),
      );
      emit({ stage, executionState: 'skipped' });
    }

    return finalize();
  };

  try {
    // Stage 1 - intake. Every signal is checked before the expensive path.
    emit({ stage: 'intake', executionState: 'running' });
    const intakeStartedAtUtc = deps.now().toISOString();

    const declared = validateDeclaredFile({
      name: file.name,
      declaredMimeType: file.type,
      byteSize: file.size,
    });

    if (!declared.ok) {
      emit({ stage: 'intake', executionState: 'failed', errorCode: declared.error.code });

      return { status: 'error', error: declared.error };
    }

    let header: Uint8Array;

    try {
      header = await deps.readHeader(file);
    } catch {
      const error = pipelineError('PIPELINE_BYTES_UNAVAILABLE');

      emit({ stage: 'intake', executionState: 'failed', errorCode: error.code });

      return { status: 'error', error };
    }

    const headerResult = validateHeader(declared.value, header);

    if (!headerResult.ok) {
      emit({
        stage: 'intake',
        executionState: 'failed',
        errorCode: headerResult.error.code,
      });

      return { status: 'error', error: headerResult.error };
    }

    if (signal.aborted) {
      return { status: 'cancelled' };
    }

    const decoded = await deps.decodeDimensions(file);

    if (!decoded.ok) {
      const error = pipelineError(decoded.code);

      emit({ stage: 'intake', executionState: 'failed', errorCode: error.code });

      return { status: 'error', error };
    }

    if (signal.aborted) {
      return { status: 'cancelled' };
    }

    const dimensions = validateDimensions(decoded.dimensions);

    if (!dimensions.ok) {
      emit({
        stage: 'intake',
        executionState: 'failed',
        errorCode: dimensions.error.code,
      });

      return { status: 'error', error: dimensions.error };
    }

    const detectedMimeType = FORMAT_TO_MIME[headerResult.value];
    const intake = {
      displayName: declared.value.displayName,
      byteSize: declared.value.byteSize,
      width: dimensions.value.width,
      height: dimensions.value.height,
      detectedMimeType,
      warnings: declared.value.warnings,
    } as const;

    preflighted = {
      ...declared.value,
      detectedFormat: headerResult.value,
      detectedMimeType,
      width: intake.width,
      height: intake.height,
    };

    checks.push(
      assertCheck(
        buildIntakeCheck({
          checkId: deps.createId('chk'),
          fileId,
          startedAtUtc: intakeStartedAtUtc,
          finishedAtUtc: normalizeFinish(intakeStartedAtUtc, deps.now().toISOString()),
          mimeType: intake.detectedMimeType,
          byteSize: intake.byteSize,
          width: intake.width,
          height: intake.height,
          warnings: intake.warnings,
          createEvidenceId: () => deps.createId('ev'),
        }),
      ),
    );
    emit({ stage: 'intake', executionState: 'completed', outcome: 'detected' });

    // Stage 2 - fingerprint over the original bytes.
    if (signal.aborted) {
      return { status: 'cancelled' };
    }

    emit({ stage: 'fingerprint', executionState: 'running' });
    const fingerprintStartedAtUtc = deps.now().toISOString();

    let bytes: ArrayBuffer;

    try {
      bytes = await deps.readBytes(file);
    } catch {
      const error = pipelineError('PIPELINE_BYTES_UNAVAILABLE');

      emit({ stage: 'fingerprint', executionState: 'failed', errorCode: error.code });

      return { status: 'error', error };
    }

    // Proves the fingerprint input is the original file version, not a
    // preview, re-encode, or truncated read.
    if (bytes.byteLength !== file.size || bytes.byteLength <= 0) {
      return contractFailure();
    }

    if (bytes.byteLength > MAX_FILE_BYTES) {
      const error = pipelineError('PIPELINE_BYTES_UNAVAILABLE');

      emit({ stage: 'fingerprint', executionState: 'failed', errorCode: error.code });

      return { status: 'error', error };
    }

    let sha256: string;

    try {
      sha256 = await deps.sha256(bytes);
    } catch {
      const error = pipelineError('PIPELINE_HASH_FAILED');

      emit({ stage: 'fingerprint', executionState: 'failed', errorCode: error.code });

      return { status: 'error', error };
    }

    if (!isSha256Hex(sha256)) {
      return contractFailure();
    }

    checks.push(
      assertCheck(
        buildFingerprintCheck({
          checkId: deps.createId('chk'),
          fileId,
          startedAtUtc: fingerprintStartedAtUtc,
          finishedAtUtc: normalizeFinish(fingerprintStartedAtUtc, deps.now().toISOString()),
          sha256,
          createEvidenceId: () => deps.createId('ev'),
        }),
      ),
    );
    fileRecord = {
      fileId,
      displayName: intake.displayName,
      detectedMimeType: intake.detectedMimeType,
      byteSize: intake.byteSize,
      width: intake.width,
      height: intake.height,
      sha256,
      decodePipelineVersion: DECODE_PIPELINE_VERSION,
    };
    emit({ stage: 'fingerprint', executionState: 'completed', outcome: 'extracted' });

    // Stage 3 - metadata. A parser failure is recorded, never fatal.
    if (signal.aborted) {
      return finalizeCancelled();
    }

    emit({ stage: 'metadata', executionState: 'running' });
    const metadataStartedAtUtc = deps.now().toISOString();

    try {
      metadata = deps.inspectMetadata(bytes);
    } catch {
      metadata = safeInspectionFailure();
    }

    const metadataCheck = assertCheck(
      buildMetadataCheck({
        checkId: deps.createId('chk'),
        fileId,
        startedAtUtc: metadataStartedAtUtc,
        finishedAtUtc: normalizeFinish(metadataStartedAtUtc, deps.now().toISOString()),
        inspection: metadata,
        createEvidenceId: () => deps.createId('ev'),
      }),
    );

    checks.push(metadataCheck);

    if (metadataCheck.executionState === 'completed') {
      emit({
        stage: 'metadata',
        executionState: 'completed',
        ...(metadataCheck.outcome === undefined ? {} : { outcome: metadataCheck.outcome }),
      });
    } else {
      emit({
        stage: 'metadata',
        executionState: metadataCheck.executionState,
        ...(metadataCheck.errorCode === undefined ? {} : { errorCode: metadataCheck.errorCode }),
      });
    }

    // Stage 4 - real pinned C2PA reader/validator.
    if (preflighted === null) {
      return contractFailure();
    }

    if (signal.aborted) {
      return finalizeCancelled();
    }

    emit({ stage: 'c2pa', executionState: 'running' });
    const c2paStartedAtUtc = deps.now().toISOString();

    let inspection: C2paInspection;

    try {
      inspection = await deps.inspectC2pa({
        file,
        format: preflighted.detectedMimeType,
        signal,
      });
    } catch {
      inspection = { status: 'failed', errorCode: 'C2PA_INTERNAL_ERROR' };
    }

    // A disposed session reports `cancelled` without a user abort: the run is
    // stale and must not be attached to whatever comes next.
    if (inspection.status === 'cancelled' && !signal.aborted) {
      emit({ stage: 'c2pa', executionState: 'cancelled' });

      return { status: 'cancelled' };
    }

    const output = buildC2paResult({
      checkId: deps.createId('chk'),
      fileId,
      startedAtUtc: c2paStartedAtUtc,
      finishedAtUtc: normalizeFinish(c2paStartedAtUtc, deps.now().toISOString()),
      inspection,
      createEvidenceId: () => deps.createId('ev'),
    });

    const resolved = resolveC2paFinding(assertCheck(output.check), output.finding);

    checks.push(resolved.check);
    finding = resolved.finding;

    if (resolved.check.executionState === 'cancelled') {
      // The inspection started and was interrupted: the one case the PRD maps
      // to `cancelled` rather than `skipped`.
      cancelled = true;
      emit({ stage: 'c2pa', executionState: 'cancelled' });

      return finalize();
    }

    if (resolved.check.executionState === 'completed') {
      emit({
        stage: 'c2pa',
        executionState: 'completed',
        ...(resolved.check.outcome === undefined ? {} : { outcome: resolved.check.outcome }),
      });
    } else {
      emit({
        stage: 'c2pa',
        executionState: resolved.check.executionState,
        ...(resolved.check.errorCode === undefined
          ? {}
          : { errorCode: resolved.check.errorCode }),
      });
    }

    return finalize();
  } catch {
    return contractFailure();
  }
}
