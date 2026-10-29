# OriginLens — Hackathon Submission and Judging Audit Guide

**Project Name:** OriginLens  
**Subtitle:** Evidence-First Media Provenance Explorer  
**Repository:** [https://github.com/Nightmare-026/OriginLens](https://github.com/Nightmare-026/OriginLens)  
**Specification Reference:** `OriginLens_PRD.md` (Audited Product Specification v2.0)  
**Execution Contract:** `AGENTS.md`  
**Originally written:** 2026-10-27  
**Corrected after source audit:** 2026-10-29

---

## 1. Executive Summary

OriginLens is a browser-first media provenance inspection and comparison tool built around
**honest uncertainty** and **evidence-first reporting**.

It:
- Reads embedded **C2PA** credentials with the pinned `@contentauth/c2pa-web` WebAssembly SDK and reports
  manifest presence, manifest validation, claim-signature validation, content binding, and signer trust
  as separate states.
- Extracts non-cryptographic file and EXIF metadata clues without treating them as proof of origin.
- Presents findings in an **Evidence Ledger** where each finding links to a check ID and evidence ID.
- Computes a **Provenance Delta** between two independent images: bytes, dimensions, selected metadata,
  and a normalized preview pixel metric. It does not infer which file is original or why they differ.
- Runs intake, hashing, metadata parsing, and C2PA reading in the browser in volatile memory. Image bytes
  are not uploaded. The only outbound feature is an optional, consent-gated model explanation that sends
  bounded check data without image bytes, filenames, GPS, or metadata values.

It does **not** certify authenticity, detect AI generation, identify creators, or prove scene truth.

---

## 2. Release Gates (PRD §14.5)

| Gate | Description | Status (2026-10-29) | Evidence / limitation |
|---|---|---|---|
| **Gate 1** | All P0 requirements complete | **PARTIAL** | FR-001…FR-014 have recorded evidence; FR-015 and the V01–V50 matrix are not claimed complete. P1-001 is blocked separately. |
| **Gate 2** | V01–V50 acceptance matrix | **PARTIAL** | Many cases have explicit E2E/unit tests; the full matrix has not been re-verified row by row after the audit. No `PASS` row exists without recorded evidence. |
| **Gate 3** | No high/critical dependency vulnerabilities | **PASS** | `npm run audit` → `found 0 vulnerabilities` (2026-10-29). |
| **Gate 4** | Strict TypeScript and clean lint | **PASS** | `npm run typecheck` and `npm run lint` exit 0 (2026-10-29). |
| **Gate 5** | Production Next.js build | **PASS** | `npm run build` succeeds (2026-10-29). |
| **Gate 6** | Privacy and export invariants | **PASS** | E2E asserts `includedOriginalImage: false` and `includedPreciseGps: false`; preview pixels and report contents inspected. |
| **Gate 7** | Accessible, responsive UX | **PARTIAL** | Automated axe checks and 360 px keyboard/viewport checks pass. A manual screen-reader walkthrough was **not performed**. |
| **Gate 8** | Rehearsed judging demo | **PARTIAL** | The automated `demo-rehearsal.spec.ts` passes; the manual talk track has not been rehearsed against the audited build. |

Exact commands and results are recorded in
[`verification-log.md`](verification-log.md). This document does not substitute for that log.

---

## 3. V01–V50 Acceptance Matrix

The canonical matrix is PRD §14.4 and the tracked status is
[`requirements-traceability.md`](requirements-traceability.md). Rows are only `PASS` where the current
tree has recorded evidence; `BLOCKED`, `NOT RUN`, and `PARTIAL` are never counted as `PASS`.

Representative tested behaviour:
- **C2PA parsing and integrity:** real Adobe fixtures (valid credential), a missing-manifest fixture, and a
  byte-mutated fixture that produces `manifestValidation: invalid` with `signatureValidation: valid` and
  `contentBindingValidation: invalid`.
- **Metadata:** allowlisted EXIF extraction, GPS hidden by default, hostile-string handling, and empty
  metadata sets.
- **Intake:** 20 MiB compressed / 20 MP decoded bounds, JPEG/PNG allowlist, SVG/animated/other format
  rejection, and SHA-256 over the exact uploaded bytes.
- **Comparison:** duplicate files, re-encoded files with equal dimensions, aspect-ratio mismatch,
  EXIF orientation 6, cancellation, and one-file failure preserving the other file's evidence.
- **Report:** schema `2.0` validation, stable IDs, no image bytes, no precise GPS.
- **Accessibility:** axe checks, keyboard flow, focus handling, 360 px viewport without horizontal overflow.
- **Fault recovery:** truncated JPEG (`PIPELINE_DECODE_FAILED`), missing WASM, offline C2PA runtime,
  report-download failure, and session clearing.

---

## 4. Compliance and Model-Provider Determination (Phase 1 Gate)

**Status: BLOCKED.**

1. **Eligibility, rules, and authorized access:** no source-backed record exists in this repository for
   participant age/eligibility, accepted Official Rules, an authorized Model API key, or a successful
   authorized runtime smoke test. Earlier text in this file asserted `UNBLOCKED, IMPLEMENTED, AND
   VERIFIED` and an active Meta/NVIDIA endpoint; that statement is withdrawn.
2. **P1-001:** the optional model explanation exists as a disabled-by-default local implementation in
   `src/lib/model-explainer/` and `/api/explain`. Tests cover schema validation, request projection,
   forbidden-claim rejection, evidence-ID whitelisting, timeout handling, and deterministic fallback.
   They do **not** establish a working external provider integration.
3. **Request contents (after consent):** check IDs, kinds, execution states, outcomes, bounded warnings
   and limitation codes, evidence IDs and keys (no values), summary codes, SHA-256, detected MIME type,
   byte size, dimensions, audience mode, and the user's typed question. Filenames, image bytes, preview
   pixels, GPS, metadata values, and manifest text are excluded.
4. **Non-authoritative:** the explanation cannot add findings or change any validation, binding, or trust
   state.
5. **Provider status:** `MODEL_API_BASE_URL` defaults to a third-party OpenAI-compatible endpoint and
   `MODEL_NAME` to an open-weight model ID. That is an unverified configuration, not approved Meta Model
   API access, and must not be described as a Meta or NVIDIA integration.

P1-001 stays disabled and unclaimed until the Phase 1 gate is source-backed.

---

## 5. Fixture Inventory

All fixtures in `tests/fixtures/c2pa/` are tracked with deterministic SHA-256 hashes. Sizes and hashes
below were re-measured on 2026-10-29.

| Fixture Name | Format | Size | SHA-256 | Purpose |
|---|---|---|---|---|
| `adobe-20220124-C.jpg` | JPEG | 140,297 B | `75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864` | C2PA test fixture from Adobe/CAI |
| `adobe-20220124-C-tampered.jpg` | JPEG | 140,297 B | `be01133655c5ba6a316c67c240c1ba7ecfe65deadedef891cdd269cf008b35c8` | Derived byte-mutated scan data (V04) |
| `exif-orientation-6.jpg` | JPEG | 356 B | `2058e08e46eb3c779356f68127c5801a64a2304174c0cd341587a1e606a2e0e6` | EXIF orientation 6 fixture (V20) |
| `plain-3x2.png` | PNG | 88 B | `55da44a11728930a62c75c7607cdbd466d20f5847742c6a4f6748c28e8f89103` | Minimal PNG, no C2PA manifest |
| `plain-3x2-filtered.png` | PNG | 88 B | `7e0ee3192f407fafbe484eed266f7c0348434df2f0ef8c30a7fb4f6eb496d200` | Re-encoded PNG, different bytes (V18) |
| `plain-1x1.jpg` | JPEG | 160 B | `bdff0e0944f020878bfc277e5977ae6a598422812b68cbe67620c6de85e45045` | Minimal JPEG, no C2PA manifest |
| `truncated.jpg` | JPEG | 11 B | `23e5c96c789570b1a740a7463526bb846d97506642e12a6a5e6b9b3b7a90cd5f` | Malformed file for recovery tests |

The Adobe fixture is covered by `LICENSE-public-testfiles.txt`. Derived fixtures are reproducible with
`node tests/fixtures/generate-derived-fixtures.mjs`.

---

## 6. How to Rehearse and Evaluate the Demo

```bash
npx playwright test tests/e2e/demo-rehearsal.spec.ts
```

For manual evaluation:
1. Start the server: `npm run dev`
2. Follow the walkthrough in [`DEMO.md`](../../DEMO.md).

---

## 7. Status Summary

| Phase | Status |
|---|---|
| 0 — Bootstrap | PASS |
| 1 — Compliance and access | **BLOCKED** |
| 2 — Requirements and traceability | **PARTIAL** |
| 3 — Architecture and WASM spike | PASS |
| 4 — Data contracts and intake | PASS |
| 5 — Evidence Ledger | PASS |
| 6 — Provenance Delta and export | PASS |
| 7 — UX and accessibility | PARTIAL (manual screen-reader walkthrough not run) |
| 8 — Optional model explanation | **BLOCKED** |
| 9 — Hardening and release candidate | **PARTIAL** |
| 10 — Demo and submission | **PARTIAL** |

No submission has been made. The removed features (PKI trust anchors, remote manifest recovery, web
provenance lookup, spectral/watermark analysis, edit-history tree, chronology) are no longer part of the
product or the claims.
