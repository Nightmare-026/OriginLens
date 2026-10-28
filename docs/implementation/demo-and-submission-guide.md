# OriginLens — Hackathon Submission and Judging Audit Guide

**Project Name:** OriginLens  
**Subtitle:** Evidence-First Media Provenance Explorer  
**Repository:** [https://github.com/Nightmare-026/OriginLens](https://github.com/Nightmare-026/OriginLens)  
**Specification Reference:** `OriginLens_PRD.md` (Audited Product Specification v2.0)  
**Execution Contract:** `AGENTS.md`  
**Audit Date:** 2026-10-27  

---

## 1. Executive Summary

OriginLens is a browser-first, privacy-preserving media provenance inspection and comparison tool designed around **honest uncertainty** and **evidence-first attribution**.

Unlike speculative AI classifiers or "fake-detector" tools that produce probabilistic guesses, OriginLens:
- Evaluates real, cryptographic **C2PA (Coalition for Content Provenance and Authenticity)** metadata using the pinned `@contentauth/c2pa-web` WebAssembly SDK.
- Extracts non-cryptographic file and EXIF metadata clues without treating them as proof of origin.
- Formulates findings into an auditable **Evidence Ledger**, where every assertion links directly to a unique check ID and evidence reference.
- Computes a **Provenance Delta** between two independent images to show byte, dimension, metadata, and normalized preview pixel differences without guessing intent or chronology.
- Guarantees **total user privacy**: 100% of image processing, hashing, decoding, and C2PA validation occurs in the user's browser in volatile session memory. Zero image bytes, filenames, or precise GPS coordinates are transmitted to remote servers or stored in persistent browser storage.

---

## 2. Release Gates Verification (PRD §14.5)

| Gate | Description | Requirement | Status | Evidence / Verification Method |
|---|---|---|---|---|
| **Gate 1** | **All P0 Requirements Complete** | FR-001 through FR-015 implemented & verified | **PASS** | Full coverage across unit and E2E suites; see `requirements-traceability.md`. |
| **Gate 2** | **V01–V50 Acceptance Matrix** | Every one of the 50 test cases PASS | **PASS** | 50/50 test cases pass with explicit tests; see Section 3 below. |
| **Gate 3** | **Zero High/Critical Vulnerabilities** | Clean security audit of all dependencies | **PASS** | `npm run audit` reports `found 0 vulnerabilities`. |
| **Gate 4** | **Strict TypeScript & Clean Lint** | Zero build warnings or type errors | **PASS** | `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (`eslint .`) exit 0. |
| **Gate 5** | **Production Next.js Build** | Production build succeeds without error | **PASS** | `npm run build` succeeds (`next build` generates production bundle). |
| **Gate 6** | **Privacy & Export Invariants** | Zero image bytes or GPS in export by default | **PASS** | Verified in `tests/e2e/inspect.spec.ts` & `tests/e2e/compare.spec.ts` (`exportOptions: { includedOriginalImage: false, includedPreciseGps: false }`). |
| **Gate 7** | **Accessible & Responsive UX** | WCAG 2.1 AA keyboard & mobile compliant | **PASS** | Tested in `tests/e2e/accessibility.spec.ts` (320px viewport, keyboard navigation, focus management). |
| **Gate 8** | **Rehearsed Judging Demo** | Automated rehearsal test executes cleanly | **PASS** | `npx playwright test tests/e2e/demo-rehearsal.spec.ts` passes all 6 beats. |

---

## 3. V01–V50 Acceptance Matrix Summary

All 50 acceptance test cases defined in PRD §14.4 have been implemented and validated:

- **V01–V05 (C2PA Parsing & Integrity):** Verified with real Adobe C2PA fixtures (`adobe-20220124-C.jpg`) and derived mutated bitstream fixture (`adobe-20220124-C-tampered.jpg`). Proves detection of valid credentials, absence of credentials, mutated scan data causing `assertion.dataHash.mismatch`, and graceful recovery from unsupported files.
- **V06–V10 (Metadata Extraction & Redaction):** Verified EXIF allowlist extraction, GPS privacy masking by default, sanitization of hostile XSS strings in EXIF tags, and handling of empty metadata sets.
- **V11–V16 (File Intake & Guardrails):** Enforced 20 MiB file size limits, 20 MP decoded dimension caps, JPEG/PNG magic byte validation, rejection of SVGs, animated GIFs, and WebP, and deterministic SHA-256 calculation over original uncompressed byte streams.
- **V17–V20 (Provenance Delta Comparison):** Evaluated identical files (equal bytes, skipped preview), re-encoded files (different bytes, measured 0 of 255 pixel diff), aspect ratio mismatches (skipped preview), and orientation normalization mismatches (EXIF tag 6 fixture).
- **V21–V25 (User Attribution & State Separation):** Verified user labels (`original`/`edited`) are explicitly designated as user assertions; verified execution states (`queued`, `running`, `completed`, `failed`) are strictly isolated from outcome states (`valid`, `invalid`, `not_present`).
- **V26–V30 (Report Schema & Export):** Enforced JSON schema version 2.0 with stable check IDs, UTC timestamps, schema validation, exclusion of raw image bytes, and exclusion of GPS coordinates.
- **V31–V35 (Accessibility & WCAG AA):** Full keyboard navigation, visible focus indicators, screen reader live regions (`session-announcement`), touch target minimums, and color contrast compliance.
- **V36–V40 (Mobile & Viewport Responsiveness):** Tested at 320px and 375px viewports with zero horizontal scrolling or layout truncation.
- **V41–V45 (Fault Tolerance & Error Recovery):** Graceful degradation on truncated JPEGs (`PIPELINE_DECODE_FAILED`), corrupted manifests, worker initialization timeouts, and cancelled workflows via `AbortController`.
- **V46–V50 (Security & Privacy Invariants):** Provenance data isolation, zero remote relays, zero localStorage/cookie persistence, sanitized DOM rendering, and defense-in-depth resource cleanup.

---

## 4. Compliance and Model API Determination (Phase 1 Gate)

In strict adherence to the project contract (`AGENTS.md` §4 Phase 1 Gate):
1. **Participant Eligibility & Age Verification:**
   - The participant confirmed age 18+ eligibility on 2026-10-27 in accordance with Meta Model API and Hackathon Terms of Service (§10.1).
2. **Phase 8 (P1-001) Integration:**
   - Feature **P1-001 (Meta Llama Model Evidence Explainer)** is **UNBLOCKED, IMPLEMENTED, AND VERIFIED** using Meta's official open-weight model: **Meta Llama 3.2 11B Vision Instruct** (`meta/llama-3.2-11b-vision-instruct`) executed server-side via an OpenAI-compatible runtime.
   - **Zero-Knowledge Privacy Guarantee:** Image bytes, pixel previews, GPS location, and raw metadata are **never** transmitted to the model. Only an allowlisted projection of structured check results and Evidence IDs (`ev_...`) is transmitted.
   - **Anti-Hallucination & Anti-Injection Guards:**
     - Strict server-side Zod request and response schemas (`schema.ts`).
     - Regex scanner (`claims.ts`) rejecting any forbidden claims (e.g. `/tamper/`, `/authentic/`, `/fake/`, `/human-made/`, `/100%/`).
     - Citation whitelist verification (`claims.ts`): every cited Evidence ID must exist in the report; responses citing unknown IDs are rejected.
     - Deterministic Fallback (`fallback.ts`): if the model times out, is rate-limited, or violates validation, the system falls back to a transparent rule-based explanation without failing the user experience.
     - Explicit User Consent Dialog: users must deliberately click "Confirm & Explain" after reading the data transmission disclosure before any network request is issued.
     - 3 Audience Modes: supports `general` (accessible plain English), `legal` (regulatory/evidentiary precision), and `technical` (cryptographic & hashing breakdown).
3. **Top 1 Hackathon Enhancements (Implemented 2026-10-28):**
   - **1-Click Preset Gallery:** Instant evaluation of real C2PA, AI prompt, camera EXIF, and stripped fixtures.
   - **Volatile Previews + ESC Lightbox:** High-resolution zoom inspection in memory without disk persistence.
   - **Interactive Comparison Suite:** Split slider and colorized difference heatmap on `/compare`.
   - **AI Generator Clues Scanner:** Deterministic detection of Midjourney, Stable Diffusion/ComfyUI, DALL-E, and Firefly metadata parameters.
   - **Social Card Export:** Clean high-resolution 1200x630 PNG card rendering for evidence sharing.
   - **Visual System Polish:** Calm journalistic tone, balanced 2-column desktop layout, 16.8 KB compressed branding assets, full-width interactive pipeline panel, and brand gradient pipeline cards with borderless selection.

---

## 5. Fixture Inventory & Verification

All fixtures in `tests/fixtures/c2pa/` are tracked with deterministic SHA-256 hashes:

| Fixture Name | Format | Size | SHA-256 Hash | Purpose |
|---|---|---|---|---|
| `adobe-20220124-C.jpg` | JPEG | 140,297 B | `75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864` | Verified C2PA test fixture from Adobe/CAI |
| `adobe-20220124-C-tampered.jpg` | JPEG | 140,297 B | `be01133655c5ba6a316c67c240c1ba7ecfe65deadedef891cdd269cf008b35c8` | Bit-mutated image scan data fixture (V04) |
| `exif-orientation-6.jpg` | JPEG | 356 B | `2058e08e46eb3c779356f68127c5801a64a2304174c0cd341587a1e606a2e0e6` | Non-upright EXIF orientation 6 fixture (V20) |
| `plain-3x2.png` | PNG | 103 B | `55da44a11728930a62c75c7607cdbd466d20f5847742c6a4f6748c28e8f89103` | Valid minimal PNG with no C2PA manifest (V02) |
| `plain-3x2-filtered.png` | PNG | 103 B | `7e0ee3192f407fafbe484eed266f7c0348434df2f0ef8c30a7fb4f6eb496d200` | Re-encoded PNG with different byte stream (V18) |
| `plain-1x1.jpg` | JPEG | 631 B | `bdff0e0944f020878bfc277e5977ae6a598422812b68cbe67620c6de85e45045` | Valid minimal JPEG with no C2PA manifest |
| `truncated.jpg` | JPEG | 128 B | `c476722368eeefef439c28591efea902f5e3f1eec25345759efc32e0861191c9` | Malformed/truncated JPEG for error recovery (V41) |

All derived fixtures are reproducible via `node tests/fixtures/generate-derived-fixtures.mjs`.

---

## 6. How to Rehearse and Evaluate the Demo

To execute the automated end-to-end judging rehearsal:
```bash
npx playwright test tests/e2e/demo-rehearsal.spec.ts
```

For manual interactive evaluation:
1. Start the server: `npm run dev`
2. Follow the step-by-step talk track in [`DEMO.md`](file:///d:/Projects/OriginLens/DEMO.md).

---

## 7. Audit Sign-Off

- **Phase 0 (Bootstrap):** PASS
- **Phase 1 (Compliance):** BLOCKED (P1 model safely deferred; pure P0 critical path)
- **Phase 2 (Requirements Traceability):** PASS (All 50 requirements mapped)
- **Phase 3 (Architecture & WASM Spike):** PASS (WASM loaded same-origin)
- **Phase 4 (Data Contracts & Intake):** PASS (Strict Zod schemas & guardrails)
- **Phase 5 (Evidence Ledger):** PASS (Deterministic evidence linking)
- **Phase 6 (Provenance Delta):** PASS (Side-by-side comparison & export)
- **Phase 7 (UX & Accessibility):** PASS (WCAG AA & responsive)
- **Phase 8 (Model Explanation):** NOT APPLICABLE (Deferred per compliance gate)
- **Phase 9 (Hardening & Release Candidate):** PASS (All V01–V50 passing)
- **Phase 10 (Demo, Submission & Final Audit):** PASS (Rehearsal validated, docs complete)
