# OriginLens — Implementation Plan

**PRD:** `OriginLens_PRD.md` — "OriginLens — Audited Product Specification v2.0" (prepared 26 Oct 2026)
**Plan created:** 2026-10-29; current status reconciled 2026-10-31
**Repo state at creation:** two files (`AGENTS.md`, PRD); no application code; not a git repository.
**Submission deadline (public event page):** 2026-11-04 21:00 ET. The participant portal is authoritative if it differs.

## Phase status

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 — Bootstrap | **PASS** | Full PRD read (all 21 sections); repo inspected; tracking docs created; git initialized; toolchain scaffolded and baseline executed. |
| 1 — Compliance & access | **BLOCKED** | Current public event page verified 2026-10-31; selected-participant rules/waiver still return a JS loading shell and must be checked in the participant portal. The Baseten endpoint/model are configured locally and a live smoke test succeeded (see Phase 8), but event-rule authorization and credit balance remain unverified. The configured credential was exposed in a screenshot and chat paste; it must be rotated before any public deployment. |
| 2 — Requirements & traceability | **PARTIAL** | The matrix maps FR-001…FR-015, P1-001…P1-004, P2, and V01–V50. Row evidence is historical and was not fully revalidated in this audit; see the 2026-10-31 readiness audit. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. Production CSP verified (ADR-009). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with 20 MP guard. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow: start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. |
| 6 — Provenance Delta, report, recovery | **PASS** | Two-file comparison: independent A/B analyses, one `comparison` check with no `fileId`, validated additive report block (ADR-008), normalized preview metric, and interactive swipe slider. |
| 7 — UX/accessibility/responsive | **PASS** | Deep Emerald `#047857` primary buttons (5.48:1 WCAG AA contrast against white text), `.skip-link` bypass blocks anchor, accessible names, visible focus, polite live regions, and responsive stacked tables with clipped headers. 0 axe violations across 53 E2E specs. |
| 8 — P1 model explanation (P1-001) | **IMPLEMENTED; LIVE CALL VERIFIED; COMPLIANCE GATE OPEN** | Server-side adapter verified against Baseten-hosted `meta-models/muse-spark-open-1026`: `/api/explain` returned `mode=ai_generated` in 2591 ms with valid evidence citations, and `/api/guide` returned a grounded answer in 2036 ms. Deterministic fallback, schema validation, evidence-ID allowlist, claims filter, and secret separation are tested. Still open: portal rules/authorization for the event route, and rotation of the exposed credential. Do not describe this as Meta Model API (`api.meta.ai`) access. |
| 9 — Hardening & release candidate | **PASS (gates), PARTIAL (release)** | Final run: `typecheck` 0 errors, `lint` 0 errors/warnings, `test` 326/326, `npx playwright test` 53/53 with a clean exit in 3.3 m, `build` 13 routes, `audit` 16 moderate dev-only `minimatch` advisories documented as accepted build-time risk. Release is still partial: no public deployment was verified in this session. |
| 10 — Demo & submission | **PARTIAL** | Public page confirms the Nov 4, 9:00 PM ET deadline and Indie track criteria; selected-participant submission fields/rules remain unverified. Demo materials exist and the rehearsal spec passes, but the recorded video, deployed URL, and portal submission are outstanding. See the deadline-driven action plan in the 2026-10-31 readiness audit. |

## Scope (PRD §3)

- **P0 (mandatory):** FR-001…FR-015 — image-only, browser-first intake, SHA-256, metadata allowlist, pinned C2PA inspection, Evidence Ledger, Provenance Delta, typed execution states, versioned JSON report, privacy defaults, clear session, recoverable errors, accessible responsive UI, test-backed demo.
- **P1-001 (implemented; live route verified; compliance gate open):** optional model explanation adapter, consent gate, server-side secret handling, request projection that omits image bytes and evidence values, claims scanner, and deterministic fallback. A live Baseten-hosted Muse Spark Open call was verified on 2026-10-31; event-rule authorization is still outstanding and the exposed credential must be rotated.
- **Removed 2026-10-29 (unsupported):** PKI trust-anchor evaluation, remote manifest recovery, web provenance lookup, DCT spectral/watermark analysis, edit-history tree, and comparative chronology. They fabricated or over-interpreted evidence and are not part of the product.
- **P1-002…P1-004 (conditional):** print report, WebP, extra fixtures — see traceability.
- **P2 (deferred):** watermark provider, remote URLs, video/HEIC/RAW/TIFF/PDF, accounts/history/DB/analytics, custom AI detector, asset signing, forensic certification.

## Current status and next actions

1. **Phase 1 remains BLOCKED; Phase 8 is implemented with a verified live call but its compliance gate is open; Phases 2 and 10 are PARTIAL; Phases 3-7 and the Phase 9 quality gates are PASS.**
2. **Current gate baseline (2026-10-31, final):** see entries 210-223 in `verification-log.md` and `readiness-audit-2026-10-31.md`.
3. **Next safe actions:**
   - Rotate the exposed Baseten key, then re-run one guide call and one explainer call to confirm the new secret works and stays server-side.
   - Retrieve and review the accepted official rules and confirm the Baseten route is permitted for this event.
   - Deploy a demo URL and rehearse the three story beats against that deployed build.
   - Record the 2-3 minute demo video; do not claim partner credits or Meta Model API access.
   - Complete the submission form only after the gate is green and the limitations are documented.
