# OriginLens — Audit Response (superseded)

**Original date:** 27 October 2026  
**Corrected:** 29 October 2026  
**External report:** `OriginLens_Audit_Report.md`  
**Current status source:** [`docs/implementation/plan.md`](implementation/plan.md),
[`docs/implementation/requirements-traceability.md`](implementation/requirements-traceability.md), and the
2026-10-29 entry in [`docs/implementation/verification-log.md`](implementation/verification-log.md).

---

## Why this document was replaced

The original response argued that the external audit's `BLOCKED / NOT VERIFIED` result was only a network
failure in the auditor's sandbox. It then claimed that all P0 requirements and P1-001 were verified, quoted
270 unit tests and 43 E2E tests, and described a working Meta Llama integration.

A source-level audit of this repository on 2026-10-29 found that those claims were not supported:

1. **P1-001 was not verified.** No source-backed record exists for participant eligibility, accepted
   Official Rules, authorized Model API access, or a successful authorized runtime smoke test. The
   feature is **BLOCKED**, and no Meta or NVIDIA integration is claimed.
2. **Six features were unsupported.** PKI trust-anchor evaluation, remote manifest recovery, web
   provenance lookup, spectral/watermark analysis, edit-history tree, and comparative chronology were
   removed. They fabricated anchors, synthetic signals, or unsupported chronology/lineage semantics.
3. **The test counts were stale.** The current tree has 282 unit tests and 49 E2E tests, all passing as of
   2026-10-29. Historical counts are not evidence for the current tree.
4. **Privacy wording overstated the design.** The app is local-first, not "zero-knowledge": the optional
   model explanation sends bounded check data after explicit consent. It does not send image bytes,
   previews, GPS, filenames, or metadata values.
5. **Several UI/state claims were wrong.** Manifest presence was being conflated with success, `unknown`
   could render as `invalid`, and signer trust needed to stay `not_evaluated` under the configured
   no-anchor policy. Those renderings were corrected.

The original response and its test transcripts are withdrawn. They are not part of the current evidence
package and must not be quoted in a submission.

---

## Current position

- **P0:** implemented and exercised by the current unit/E2E gate, with the V01–V50 matrix tracked
  row-by-row. Rows without current evidence are not marked `PASS`.
- **P1-001:** implemented as a disabled-by-default adapter with a deterministic fallback; **provider path
  BLOCKED** by the Phase 1 compliance gate.
- **Gate results (2026-10-29):** `typecheck` PASS, `lint` PASS, unit 282/282 PASS, E2E 49/49 PASS,
  production build PASS, dependency audit 0 vulnerabilities.
- **Not verified:** manual screen-reader walkthrough; the Cerebral Valley waiver page (JavaScript-only
  shell when accessed); live model-provider authorization and terms.

OriginLens is an evidence-first provenance inspector. It does not certify authenticity, detect AI
generation, prove intent, or identify which of two files is original.
