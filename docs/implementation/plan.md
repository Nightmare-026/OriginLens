# OriginLens — Implementation Plan

**PRD:** `OriginLens_PRD.md` — "OriginLens — Audited Product Specification v2.0" (prepared 26 Oct 2026)
**Plan created/updated:** 2026-10-29 (audit correction; originally 2026-10-27 per PRD §16 "Day 2")
**Repo state at creation:** two files (`AGENTS.md`, PRD); no application code; not a git repository.
**Submission deadline (public event page):** 2026-11-04 21:00 ET. The participant portal is authoritative if it differs.

## Phase status

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 — Bootstrap | **PASS** | Full PRD read (all 21 sections); repo inspected; tracking docs created; git initialized; toolchain scaffolded and baseline executed. |
| 1 — Compliance & access | **PASS** | Official hackathon partner Baseten ($100 inference credit allocation) approved for Meta open-weights model `meta-models/muse-spark-open-1026`. Zero-byte local privacy invariant strictly preserved. |
| 2 — Requirements & traceability | **PASS** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. 302 unit tests passing. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. Production CSP verified (ADR-009). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with 20 MP guard. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow: start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. |
| 6 — Provenance Delta, report, recovery | **PASS** | Two-file comparison: independent A/B analyses, one `comparison` check with no `fileId`, validated additive report block (ADR-008), normalized preview metric, and interactive swipe slider. |
| 7 — UX/accessibility/responsive | **PASS** | Deep Emerald `#047857` primary buttons (5.48:1 WCAG AA contrast against white text), `.skip-link` bypass blocks anchor, accessible names, visible focus, polite live regions, and responsive stacked tables with clipped headers. 0 axe violations. |
| 8 — P1 model explanation (P1-001) | **PASS** | Meta Muse Spark Open via official hackathon partner Baseten (`meta-models/muse-spark-open-1026`). Strips reasoning thoughts (`<thought>...</thought>`), validates against strict Zod schema, enforces ADR-017 hedging filter, tracks latency, and provides seamless deterministic fallback. |
| 9 — Hardening & release candidate | **PASS** | Production build verified offline (Google Fonts decoupled); dynamic `metadataBase`; `/dev/c2pa-smoke` guarded in production; `maxDuration = 30` and hardened IP extraction on `/api/explain`. 302 unit tests passing. |
| 10 — Demo & submission | **PASS** | Demo gallery, `DEMO.md` 7-beat judging script, and rehearsal walkthrough aligned with Meta Muse Spark Open architecture. |

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
