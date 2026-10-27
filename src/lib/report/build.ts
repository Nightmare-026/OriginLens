import { C2PA_TRUST_POLICY_ID } from '@/lib/c2pa/asset';
import type { IdPrefix } from '@/lib/results/ids';
import {
  reportSchema,
  type CheckResult,
  type EvidenceItem,
  type OriginLensReport,
  type C2paFinding,
} from '@/lib/results/schemas';
import { APP_VERSION } from '@/lib/security/limits';
import { pipelineError } from '@/lib/pipeline/errors';
import { summarize } from '@/lib/pipeline/summary';
import type { FileAnalysis } from '@/lib/pipeline/types';

/**
 * Report export, PRD 9.6 and 7 Stage 8.
 *
 * The report is built from structured objects, validated as a whole, and
 * re-validated after JSON serialization. It never contains image bytes or GPS
 * coordinates, and it states that it is not a signed certificate.
 */

export const REPORT_DISCLAIMERS = [
  'This report is an app-generated summary of checks that ran in this browser. It is not a digitally signed forensic certificate, and the downloaded file can be edited afterwards.',
  'No image bytes and no precise GPS coordinates are included in this report.',
  'Absence of an embedded credential is not evidence that an image is unedited, human-made, or true.',
  'Check outcomes describe only the checks that actually ran. They do not establish origin, authorship, chronology, intent, or scene truth.',
] as const;

export type ReportInput = Readonly<{
  analyses: readonly FileAnalysis[];
  now: Date;
  createId: (prefix: IdPrefix) => string;
}>;

export type ReportBuildResult =
  | Readonly<{ status: 'ok'; report: OriginLensReport; json: string }>
  | Readonly<{
      status: 'error';
      error: ReturnType<typeof pipelineError>;
    }>;

function contractFailure(): ReportBuildResult {
  return { status: 'error', error: pipelineError('PIPELINE_CONTRACT_VIOLATION') };
}

export function buildReport(input: ReportInput): ReportBuildResult {
  if (input.analyses.length < 1 || input.analyses.length > 2) {
    return contractFailure();
  }

  const files = input.analyses.map((analysis) => analysis.file);
  const checks: CheckResult[] = input.analyses.flatMap((analysis) => analysis.checks);
  const evidence: EvidenceItem[] = input.analyses.flatMap((analysis) => analysis.evidence);
  const findings: C2paFinding[] = input.analyses.flatMap((analysis) =>
    analysis.finding === null ? [] : [analysis.finding],
  );

  const draft: unknown = {
    schemaVersion: '2.0',
    appVersion: APP_VERSION,
    reportId: input.createId('rpt'),
    createdAtUtc: input.now.toISOString(),
    files,
    checks,
    evidence,
    summaryCodes: summarize({ checks, findings }),
    trustPolicyId: C2PA_TRUST_POLICY_ID,
    disclaimers: [...REPORT_DISCLAIMERS],
    exportOptions: {
      includedOriginalImage: false,
      includedPreciseGps: false,
    },
  };

  const parsed = reportSchema.safeParse(draft);

  if (!parsed.success) {
    return contractFailure();
  }

  const json = JSON.stringify(parsed.data, null, 2);
  const roundTrip = reportSchema.safeParse(JSON.parse(json) as unknown);

  if (!roundTrip.success) {
    return contractFailure();
  }

  return { status: 'ok', report: roundTrip.data, json };
}

/** A filename derived only from the report timestamp, never from user input. */
export function reportFileName(report: OriginLensReport): string {
  return `originlens-report-${report.createdAtUtc.replace(/[:.]/g, '-')}.json`;
}
