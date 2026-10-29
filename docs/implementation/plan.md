# OriginLens — Implementation Plan

**PRD:** `OriginLens_PRD.md` — "OriginLens — Audited Product Specification v2.0" (prepared 26 Oct 2026)
**Plan created/updated:** 2026-10-29 (audit correction; originally 2026-10-27 per PRD §16 "Day 2")
**Repo state at creation:** two files (`AGENTS.md`, PRD); no application code; not a git repository.
**Submission deadline (public event page):** 2026-11-04 21:00 ET. The participant portal is authoritative if it differs.

## Phase status

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 — Bootstrap | **PASS** | Full PRD read (all 21 sections); repo inspected; tracking docs created; git initialized (baseline docs commit `6aae2fa`); toolchain scaffolded and baseline `typecheck`/`lint`/`test`/`build`/`audit` executed 2026-10-27 (see `verification-log.md`). |
| 1 — Compliance & access | **BLOCKED** | No source-backed record of authorized Model API access, eligibility confirmation, or an authorized runtime smoke test exists in this repository. Earlier text claiming a confirmed 18+ participant and an active NVIDIA/Meta endpoint was not supported by recorded evidence and has been withdrawn. `/api/explain` remains server-side and disabled by default. Do not claim Meta API integration or model use. |
| 2 — Requirements & traceability | **PARTIAL** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. Several historic PASS claims were not re-verified after the 2026-10-29 audit removed six unsupported features; see the audit entry in `verification-log.md`. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. The CSP gap noted here was closed in Phase 7: the production policy permits `worker-src 'self' blob:` and `'wasm-unsafe-eval'` and is verified by a real credential inspection (ADR-009). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with the 20 MP guard before a full decode, synthetic + committed fixture manifest. Unit-tested; exercised end-to-end in Phase 5. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow (`src/components/inspector/*`, `src/lib/pipeline/*`): start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. 220 unit tests (13 files) and 17 Chromium E2E specs passed against a production build at the time; `typecheck`, `lint`, `build`, `audit` clean. Phase 6 extended the same workflow with a two-file mode. |
| 6 — Provenance Delta, report, recovery | **PASS** | Two-file comparison landed: independent A/B analyses, one `comparison` check with no `fileId`, a validated additive report block (ADR-008), the allowlisted metadata and seven C2PA state comparisons, and a bounded normalized preview metric (`originlens-preview-rgb-mae/1`, 1.2 MP cap, 16/255 channel threshold) that is skipped with a stable reason instead of invented. User original/edited labels are recorded as the user's assertion only. E2E adds 9 comparison specs (V17, V18, V19, V26, V48, V49, two-file report, File B failure, 360 px). Full run: 259 unit tests (15 files), 26 Chromium specs, `typecheck`/`lint`/`build`/`audit` clean. |
| 7 — UX/accessibility/responsive | **PASS** | One `h1` per screen; a persistent polite live region announces each session transition while the progress panel keeps its own stage announcements and gains `aria-busy`; a completed run moves focus to the result heading, and label changes never move it; error panels use `role="alert"`. Narrow-width delta tables clip `<thead>` instead of removing it, so `scope` header associations survive the stacked layout. A production-only CSP plus `nosniff`/`DENY`/`no-referrer`/`Permissions-Policy`/COOP/CORP is shipped and verified by completing a real WebAssembly credential inspection under it (ADR-009). axe-core 4.14.0 reports 0 WCAG 2.0/2.1 A+AA violations on the start screen, ledger, and comparison screen. |
| 8 — P1 model explanation (P1-001) | **BLOCKED** | The adapter, schemas, claims scanner, consent UI, and deterministic fallback exist in `src/lib/model-explainer/` and `/api/explain`, and the request projection now omits evidence values and filenames. No authorized live provider call has been evidenced, and the Phase 1 compliance gate is not green, so the provider path is unverified. Tests exercise schema/privacy/fallback behavior only; they do not prove a working external model. |
| 9 — Hardening & release candidate | **PARTIAL** | The 2026-10-29 audit removed six unsupported features (PKI trust anchors, remote recovery, web provenance, spectral/watermark analysis, edit-history tree, chronology) and corrected state/claims handling. Full gate results are recorded in `verification-log.md`; V01–V50 rows are only PASS where the current tree has evidence. |
| 10 — Demo & submission | **PARTIAL** | Demo gallery, `DEMO.md`, and the automated 6-beat rehearsal exist; the automated rehearsal passed against the audited production build on 2026-10-29. The manual talk track has not been rehearsed. No submission has been made. The removed features are no longer claimed. |

## Scope (PRD §3)

- **P0 (mandatory):** FR-001…FR-015 — image-only, browser-first intake, SHA-256, metadata allowlist, pinned C2PA inspection, Evidence Ledger, Provenance Delta, typed execution states, versioned JSON report, privacy defaults, clear session, recoverable errors, accessible responsive UI, test-backed demo.
- **P1-001 (implemented, provider path BLOCKED):** optional model explanation adapter, consent gate, server-side secret handling, request projection that omits image bytes and evidence values, claims scanner, and deterministic fallback. No live provider call is claimed; Phase 1 compliance remains open.
- **Removed 2026-10-29 (unsupported):** PKI trust-anchor evaluation, remote manifest recovery, web provenance lookup, DCT spectral/watermark analysis, edit-history tree, and comparative chronology. They fabricated or over-interpreted evidence and are not part of the product.
- **P1-002…P1-004 (conditional):** print report, WebP, extra fixtures — see traceability.
- **P2 (deferred):** watermark provider, remote URLs, video/HEIC/RAW/TIFF/PDF, accounts/history/DB/analytics, custom AI detector, asset signing, forensic certification.

## Current status and next actions

1. **Phases 0 and 3–7 retain their recorded PASS evidence. Phase 1 is BLOCKED, Phase 8 is BLOCKED, and Phases 2, 9, and 10 are PARTIAL.** No row is upgraded without current-tree evidence.
2. **Current gate baseline (2026-10-29):** see the audit entry at the end of `verification-log.md` for exact commands and results.
3. **Next safe actions:**
   - Re-run the full gate (`typecheck`, `lint`, `test`, `test:e2e`, `build`, `audit`) after any further change.
   - Rehearse the three story beats against the audited build.
   - Do not claim Meta API access, model use, or partner credits without source-backed authorization.
   - Complete the submission form only after the gate is green and the limitations are documented.
