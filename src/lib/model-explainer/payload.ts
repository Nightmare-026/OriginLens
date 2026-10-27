import type { OriginLensReport } from '@/lib/results/schemas';
import type { ExplainRequest } from './schema';

/**
 * Projects a full OriginLensReport into a privacy-preserving ExplainRequest payload.
 *
 * Invariants enforced:
 * 1. NEVER contains original file names or file system paths.
 * 2. NEVER contains image bytes, canvas pixels, or preview data URLs.
 * 3. NEVER contains precise GPS coordinates.
 * 4. Only contains structured check results, evidence IDs, and allowed metadata keys.
 */
export function projectReportToExplainPayload(
  report: OriginLensReport,
  model: string = 'meta/llama-3.2-11b-vision-instruct',
): ExplainRequest {
  const allowedSummaryCodes = report.summaryCodes.slice(0, 8);

  const projectedFiles = report.files.map((f) => ({
    fileId: f.fileId,
    detectedMimeType: f.detectedMimeType,
    byteSize: f.byteSize,
    width: f.width,
    height: f.height,
    sha256: f.sha256,
  }));


  const projectedChecks = report.checks.map((c) => ({
    checkId: c.checkId,
    kind: c.kind,
    executionState: c.executionState,
    outcome: c.outcome,
    warnings: c.warnings.slice(0, 5),
    limitations: c.limitations.slice(0, 5),
    errorCode: c.errorCode,
  }));

  const projectedEvidence = report.evidence.map((ev) => ({
    evidenceId: ev.evidenceId,
    sourceCheckId: ev.sourceCheckId,
    key: ev.key,
    valueType: ev.valueType,
    value: ev.value,
    authority: ev.authority,
  }));

  return {
    schemaVersion: '2.0',
    consent: true,
    model,
    report: {
      reportId: report.reportId,
      summaryCodes: allowedSummaryCodes,
      trustPolicyId: report.trustPolicyId,
      files: projectedFiles,
      checks: projectedChecks,
      evidence: projectedEvidence,
      disclaimers: report.disclaimers.slice(0, 10),
    },
  };
}
