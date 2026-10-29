import type { ExplainRequest, ExplainResponse } from './schema';

/**
 * Generates a deterministic, rule-based fallback explanation.
 *
 * The template only restates check states that are present in the request and
 * cites evidence identifiers that actually exist in that request. It never
 * invents a finding, an evidence ID, or a trust conclusion.
 */
export function generateDeterministicFallback(
  request: ExplainRequest,
  reason: string = 'Offline / deterministic mode',
): ExplainResponse {
  const report = request.report;
  const nowUtc = new Date().toISOString();

  const sha256Item = report.evidence.find((e) => e.key === 'sha256' || e.valueType === 'hash');
  const c2paCheck = report.checks.find((c) => c.kind === 'c2pa');
  const metadataCheck = report.checks.find((c) => c.kind === 'metadata');
  const comparisonCheck = report.checks.find((c) => c.kind === 'comparison');

  const evidenceIdsFor = (checkId: string): string[] =>
    report.evidence
      .filter((e) => e.sourceCheckId === checkId)
      .map((e) => e.evidenceId)
      .slice(0, 3);

  const supports: ExplainResponse['whatThisSupports'] = [];
  const unknowns: ExplainResponse['whatRemainsUnknown'] = [];

  if (sha256Item) {
    supports.push({
      evidenceIds: [sha256Item.evidenceId],
      text: 'A SHA-256 fingerprint was computed over the uploaded bytes. It identifies this exact byte version and does not establish origin, authorship, or whether the scene is true.',
    });
  }

  if (c2paCheck && c2paCheck.executionState === 'completed') {
    const evIds = evidenceIdsFor(c2paCheck.checkId);
    if (evIds.length > 0) {
      if (c2paCheck.outcome === 'present') {
        supports.push({
          evidenceIds: evIds,
          text: 'The credential checker read an embedded C2PA manifest. Manifest presence is reported separately from manifest validation, claim-signature validation, asset binding, and signer trust.',
        });
      } else if (c2paCheck.outcome === 'not_present') {
        supports.push({
          evidenceIds: evIds,
          text: 'The credential checker completed and found no supported embedded C2PA manifest in this file version. Absence is not evidence that the image is unedited, human-made, or trustworthy.',
        });
      } else if (c2paCheck.outcome === 'unsupported') {
        unknowns.push({
          evidenceIds: evIds,
          text: 'The credential checker does not support this file format, so embedded credentials were not evaluated.',
        });
      } else {
        unknowns.push({
          evidenceIds: evIds,
          text: 'The credential check did not reach a supported conclusion for this file, so no credential finding is stated.',
        });
      }
    }
  } else if (c2paCheck) {
    unknowns.push({
      evidenceIds: [],
      text: `The credential check ended as ${c2paCheck.executionState.replace('_', ' ')}, so no credential conclusion is available.`,
    });
  }

  if (metadataCheck && metadataCheck.executionState === 'completed') {
    const metaEv = evidenceIdsFor(metadataCheck.checkId);
    if (metaEv.length > 0) {
      supports.push({
        evidenceIds: metaEv,
        text: 'Allowlisted embedded metadata fields were extracted. These values are unverified clues and can be absent, copied, edited, or misleading.',
      });
    }
  }

  unknowns.push({
    evidenceIds: [],
    text: 'Absence of a C2PA credential does not establish whether an image was AI-generated, edited, or human-made.',
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
      text: 'Provenance Delta measurements quantify differences in the displayed preview and recorded properties. They do not establish intent, chronology, authorship, or which file is original.',
    });
  }

  // Summary statement derived only from the primary summary code.
  const primaryCode = report.summaryCodes[0];
  let summary: string;

  switch (primaryCode) {
    case 'verified_provenance_evidence_found':
      summary =
        'The configured validator reports an embedded credential whose manifest, claim signature, and asset binding validate for this exact file version. Signer trust and revocation are not established by this result.';
      break;
    case 'no_supported_embedded_credentials':
      summary =
        'No supported embedded C2PA credential was found in this file version. This does not establish how the image was made, whether it was edited, or whether the scene is true.';
      break;
    case 'validation_issues_require_attention':
      summary =
        'At least one credential validation component did not validate. That is a finding about the credential, not proof of intent, deception, or tampering.';
      break;
    case 'evidence_incomplete':
    default:
      summary =
        'At least one check did not complete, was skipped, or was unsupported, so the evidence is incomplete. No conclusion is drawn from a check that did not produce a result.';
      break;
  }

  if (request.audience === 'forensic') {
    summary = `Technical summary: ${summary}`;
  } else if (request.audience === 'newsroom') {
    summary = `Newsroom brief: ${summary}`;
  }

  if (request.userQuery) {
    summary += ` (Question asked: "${request.userQuery}")`;
  }

  const nextChecks: ExplainResponse['nextChecks'] = [
    {
      text: 'Compare with another file to see which recorded properties differ.',
      capabilityId: 'compare_two_files',
    },
    {
      text: 'Review the Evidence Ledger for the checks, evidence IDs, and validator status codes behind this result.',
      capabilityId: 'view_c2pa_details',
    },
  ];

  return {
    mode: 'deterministic_fallback',
    modelUsed: 'rule-based-deterministic-template',
    generatedAtUtc: nowUtc,
    evidenceAttribution: 'Deterministic explanation generated from check states and evidence identifiers',
    plainLanguageSummary: summary,
    whatThisSupports: supports,
    whatRemainsUnknown: unknowns,
    nextChecks,
    reason,
  };
}
