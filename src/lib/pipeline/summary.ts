import type {
  C2paFinding,
  CheckResult,
  SummaryCode,
} from '@/lib/results/schemas';

/**
 * Deterministic aggregation, PRD 7 Stage 7.
 *
 * Rules are derived only from typed checks and typed C2PA findings. No prose,
 * model output, provider result, or majority vote can influence a summary, and
 * no rule can produce an authenticity verdict. Order is significant: the first
 * code is the headline shown above the ledger.
 */

export const SUMMARY_HEADLINES: Readonly<Record<SummaryCode, string>> = {
  verified_provenance_evidence_found: 'Verified provenance evidence found',
  no_supported_embedded_credentials: 'No supported embedded credentials found',
  evidence_incomplete: 'Evidence incomplete',
  validation_issues_require_attention: 'One or more validation issues require attention',
};

export const SUMMARY_DESCRIPTIONS: Readonly<Record<SummaryCode, string>> = {
  verified_provenance_evidence_found:
    'The configured validator reports an embedded credential whose manifest, claim signature, and asset binding validate for this exact file version. This says nothing about truth, intent, or signer trust.',
  no_supported_embedded_credentials:
    'This check found no supported embedded credential in the supplied file. External and durable credentials were not searched, and absence does not prove the image is unedited, human-made, or trustworthy.',
  evidence_incomplete:
    'One or more checks did not complete or did not produce a supported outcome. Missing coverage is not evidence for or against the image.',
  validation_issues_require_attention:
    'The validator reported at least one failed validation component. That is a finding about the credential, not proof of intent, deception, or tampering.',
};

export type SummaryInput = Readonly<{
  checks: readonly CheckResult[];
  findings: readonly C2paFinding[];
}>;

export type Coverage = Readonly<{
  total: number;
  completed: number;
  skipped: number;
  cancelled: number;
  failed: number;
  timedOut: number;
  /** Completed checks that reported an unsupported outcome. */
  unsupported: number;
  /** Completed checks that reported an inconclusive outcome. */
  inconclusive: number;
}>;

export function buildCoverage(checks: readonly CheckResult[]): Coverage {
  let completed = 0;
  let skipped = 0;
  let cancelled = 0;
  let failed = 0;
  let timedOut = 0;
  let unsupported = 0;
  let inconclusive = 0;

  for (const check of checks) {
    switch (check.executionState) {
      case 'completed':
        completed += 1;
        if (check.outcome === 'unsupported') {
          unsupported += 1;
        }
        if (check.outcome === 'inconclusive') {
          inconclusive += 1;
        }
        break;
      case 'skipped':
        skipped += 1;
        break;
      case 'cancelled':
        cancelled += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'timed_out':
        timedOut += 1;
        break;
      case 'queued':
      case 'running':
        // A finished analysis must not contain queued or running checks. They
        // are counted in the total but never as completed coverage.
        break;
    }
  }

  return {
    total: checks.length,
    completed,
    skipped,
    cancelled,
    failed,
    timedOut,
    unsupported,
    inconclusive,
  };
}

function hasValidationIssue(finding: C2paFinding): boolean {
  return (
    finding.manifestValidation === 'invalid' ||
    finding.signatureValidation === 'invalid' ||
    finding.contentBindingValidation === 'invalid' ||
    finding.timestampValidation === 'invalid' ||
    finding.revocationStatus === 'revoked'
  );
}

function hasVerifiedEvidence(finding: C2paFinding): boolean {
  return (
    finding.manifestPresence === 'present' &&
    finding.manifestValidation === 'valid' &&
    finding.signatureValidation === 'valid' &&
    finding.contentBindingValidation === 'valid'
  );
}

function hasExecutionGap(check: CheckResult): boolean {
  if (
    check.executionState === 'failed' ||
    check.executionState === 'timed_out' ||
    check.executionState === 'cancelled' ||
    check.executionState === 'skipped' ||
    check.executionState === 'queued' ||
    check.executionState === 'running'
  ) {
    return true;
  }

  return check.outcome === 'unsupported' || check.outcome === 'inconclusive';
}

/**
 * Produces the ordered, de-duplicated summary code list for one analysis
 * session. The list is never empty: a result that reaches no supported
 * conclusion is reported as incomplete rather than as a success or failure.
 */
export function summarize(input: SummaryInput): readonly SummaryCode[] {
  const codes: SummaryCode[] = [];
  const push = (code: SummaryCode) => {
    if (!codes.includes(code)) {
      codes.push(code);
    }
  };

  const validationIssue = input.findings.some(hasValidationIssue);
  const verified = input.findings.some(hasVerifiedEvidence);
  const incomplete = input.checks.some(hasExecutionGap);

  const c2paChecks = input.checks.filter((check) => check.kind === 'c2pa');
  const noSupportedCredentials =
    c2paChecks.length > 0 &&
    c2paChecks.every(
      (check) => check.executionState === 'completed' && check.outcome === 'not_present',
    );

  if (validationIssue) {
    push('validation_issues_require_attention');
  }

  if (verified) {
    push('verified_provenance_evidence_found');
  }

  if (!validationIssue && !verified && noSupportedCredentials) {
    push('no_supported_embedded_credentials');
  }

  if (incomplete) {
    push('evidence_incomplete');
  }

  if (codes.length === 0) {
    // Reached when a manifest is present but no supported conclusion was
    // established, or when no credential check produced coverage at all.
    push('evidence_incomplete');
  }

  return codes;
}
