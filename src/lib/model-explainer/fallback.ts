import type { ExplainRequest, ExplainResponse } from './schema';

/**
 * Generates a deterministic, rule-based fallback explanation.
 * This guarantees that the user always gets a truthful, structured explanation
 * without crashing or displaying errors, even when the model API is offline,
 * rate-limited, rejected for forbidden claims, or unconfigured.
 */
export function generateDeterministicFallback(
  request: ExplainRequest,
  reason: string = 'Offline / deterministic mode',
): ExplainResponse {
  const report = request.report;
  const nowUtc = new Date().toISOString();

  // Find SHA-256 evidence item if present
  const sha256Item = report.evidence.find((e) => e.key === 'sha256' || e.valueType === 'hash');
  const c2paCheck = report.checks.find((c) => c.kind === 'c2pa');
  const metadataCheck = report.checks.find((c) => c.kind === 'metadata');
  const comparisonCheck = report.checks.find((c) => c.kind === 'comparison');

  const supports: ExplainResponse['whatThisSupports'] = [];
  const unknowns: ExplainResponse['whatRemainsUnknown'] = [];

  if (sha256Item) {
    supports.push({
      evidenceIds: [sha256Item.evidenceId],
      text: 'Original uploaded byte integrity is cryptographically fingerprinted via SHA-256 hash.',
    });
  }

  if (c2paCheck && c2paCheck.executionState === 'completed') {
    const c2paEvidence = report.evidence.filter((e) => e.sourceCheckId === c2paCheck.checkId);
    const evIds = c2paEvidence.map((e) => e.evidenceId).slice(0, 3);
    if (c2paCheck.outcome === 'present' || c2paCheck.outcome === 'valid') {
      supports.push({
        evidenceIds: evIds.length > 0 ? evIds : [report.evidence[0]?.evidenceId ?? 'ev_fallback'],
        text: 'C2PA Content Credentials manifest was found and parsed using the standard trust policy.',
      });
    } else {
      supports.push({
        evidenceIds: evIds.length > 0 ? evIds : [report.evidence[0]?.evidenceId ?? 'ev_fallback'],
        text: 'No embedded C2PA provenance manifest was detected in this file.',
      });
    }
  }

  if (metadataCheck && metadataCheck.executionState === 'completed') {
    const metaEv = report.evidence.filter((e) => e.sourceCheckId === metadataCheck.checkId);
    if (metaEv.length > 0) {
      supports.push({
        evidenceIds: metaEv.map((e) => e.evidenceId).slice(0, 3),
        text: 'Allowlisted EXIF/TIFF metadata fields were successfully parsed and extracted.',
      });
    }
  }

  // Limitations / Unknowns
  unknowns.push({
    evidenceIds: [],
    text: 'Absence of C2PA Content Credentials does not establish whether an asset was AI-generated or human-made.',
  });

  if (metadataCheck) {
    unknowns.push({
      evidenceIds: [],
      text: 'Extracted metadata fields are unverified and may have been modified, stripped, or copied by intermediate tools.',
    });
  }

  if (comparisonCheck) {
    unknowns.push({
      evidenceIds: [],
      text: 'Provenance Delta measurements quantify pixel differences in display previews, but do not infer intent, chronology, or editing authorship.',
    });
  }

  // Summary statement based on summaryCodes
  let summary = 'Structured provenance analysis completed for this media session.';
  if (report.summaryCodes.includes('verified_provenance_evidence_found')) {
    summary =
      'Cryptographic provenance credentials were found and verified. The file carries verifiable provenance assertions.';
  } else if (report.summaryCodes.includes('no_supported_embedded_credentials')) {
    summary =
      'No embedded C2PA Content Credentials were found. The file has ordinary file metadata but lacks cryptographic origin proofs.';
  } else if (report.summaryCodes.includes('validation_issues_require_attention')) {
    summary =
      'Provenance credentials were detected but encountered validation warnings under the configured trust policy.';
  }

  const nextChecks: ExplainResponse['nextChecks'] = [
    {
      text: 'Compare with another version to see Provenance Delta differences.',
      capabilityId: 'compare_two_files',
    },
    {
      text: 'Review the Evidence Ledger for specific cryptographic attributes.',
      capabilityId: 'view_c2pa_details',
    },
  ];

  return {
    mode: 'deterministic_fallback',
    modelUsed: 'rule-based-deterministic-template',
    generatedAtUtc: nowUtc,
    evidenceAttribution: 'Deterministic evidence explanation (rule-based template)',
    plainLanguageSummary: summary,
    whatThisSupports: supports.length > 0 ? supports : [
      {
        evidenceIds: [report.evidence[0]?.evidenceId ?? 'ev_default'],
        text: 'File properties and fingerprints were cataloged in the Evidence Ledger.',
      },
    ],
    whatRemainsUnknown: unknowns,
    nextChecks,
    reason,
  };
}
