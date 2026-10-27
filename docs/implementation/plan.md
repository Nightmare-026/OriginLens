# OriginLens — Implementation Plan

**PRD:** `OriginLens_PRD.md` — "OriginLens — Audited Product Specification v2.0" (prepared 26 Oct 2026)
**Plan created/updated:** 2026-10-27 (PRD §16 "Day 2")
**Repo state at creation:** two files (`AGENTS.md`, PRD); no application code; not a git repository.
**Submission deadline (public event page):** 2026-11-04 21:00 ET. The participant portal is authoritative if it differs.

## Phase status

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 — Bootstrap | **PASS** | Full PRD read (all 21 sections); repo inspected; tracking docs created; git initialized (baseline docs commit `6aae2fa`); toolchain scaffolded and baseline `typecheck`/`lint`/`test`/`build`/`audit` executed 2026-10-27 (see `verification-log.md`). |
| 1 — Compliance & access | **BLOCKED** | Official sources fetched 2026-10-27 (see `compliance-checklist.md`). Confirmed: Model API sign-up/access requires age 18+; ToS §10.1 requires End Users ≥18 and forbids under-18-targeted products. **Not confirmed:** participant eligibility/authorized access, Official Rules acceptance. No runtime Meta API code written; no credentials present. |
| 2 — Requirements & traceability | **IN PROGRESS** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. Phase 5 evidence recorded for FR-001…FR-007, FR-009…FR-015 and V01, V02, V03, V05–V08, V11–V16, V21–V23, V25, V27, V33–V38, V42, V43, V45, V47, V50. Remaining open rows are Phase 6 comparison cases (V17–V20, V48, V49), the unacquired invalid-credential fixture (V04), the product cancel-control E2E (V26), and the P1 rows. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. Six E2E specs pass. **Open:** CSP is not configured (deferred to Phase 7/9). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with the 20 MP guard before a full decode, synthetic + committed fixture manifest. Unit-tested; exercised end-to-end in Phase 5. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow (`src/components/inspector/*`, `src/lib/pipeline/*`): start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. 220 unit tests (13 files) and 17 Chromium E2E specs pass against a production build; `typecheck`, `lint`, `build`, `audit` clean. Compare action is present but intentionally disabled and labelled as Phase 6. |
| 6 — Provenance Delta, report, recovery | **IN PROGRESS** | Single-file report export, download-failure recovery, offline and malformed-file recovery are done. Provenance Delta (two-file comparison), preview pixel metrics, and the product cancel-control E2E remain. |
| 7 — UX/accessibility/responsive | **IN PROGRESS** | Primary flow verified at 360 px without horizontal overflow and keyboard-only (file input via Tab, report download via Enter, visible focus); reduced-motion CSS present; status is text + badge, never colour-only. Full accessibility audit (axe, screen reader) and CSP remain. |
| 8 — P1 model explanation (P1-001) | **BLOCKED** | Needs Phase 1 green **and** P0 stability (PRD §3.2). Design ready: `p1-001-model-explanation-plan.md`. |
| 9 — Hardening & release candidate | **NOT STARTED** | Requires executable app + tests. |
| 10 — Demo & submission | **NOT STARTED** | Requires Phase 9 evidence. |

## Scope (PRD §3)

- **P0 (mandatory):** FR-001…FR-015 — image-only, browser-first intake, SHA-256, metadata allowlist, pinned C2PA inspection, Evidence Ledger, Provenance Delta, typed execution states, versioned JSON report, privacy defaults, clear session, recoverable errors, accessible responsive UI, test-backed demo.
- **P1-001 (selected, gated):** real Meta-model evidence explanation via Meta Model API, server-side only, after compliance gate + P0 stability. See `p1-001-model-explanation-plan.md`.
- **P1-002…P1-004 (conditional):** print report, WebP, extra fixtures — only after P0 with tests.
- **P2 (deferred):** watermark provider, remote URLs, video/HEIC/RAW/TIFF/PDF, accounts/history/DB/analytics, custom AI detector, asset signing, forensic certification.

## Schedule reality check

PRD §16 assumes Day 1 = Oct 26 (today is Oct 27). Remaining window to the public deadline is ~8 days. Priority order under pressure (PRD §12, §16 scope fallback):

1. Intake/preflight/SHA-256/metadata + tests (independent of external access).
2. C2PA WASM/worker spike in the real Next.js build.
3. Evidence Ledger + Provenance Delta + JSON report.
4. Accessibility/responsive + hardening.
5. P1-001 **only if** Phase 1 gate is green and P0 is stable; otherwise deterministic templates remain and no model is claimed.

## Next actions

1. **User (blocking):** confirm eligibility and authorized route — own Model API account/API key (age 18+ per current terms) or written organizer approval; confirm Official Rules were read/accepted in the participant portal. Until then P1-001 stays `BLOCKED`.
2. **Agent (next increment):** Phase 6 — Provenance Delta for two files (independent A/B analysis, hash/size/format/dimension/metadata/C2PA comparison, bounded normalized preview metrics only with documented normalization), report export for two files, and the deterministic product cancel-control E2E (V26).
3. **Then:** accessibility/responsive hardening and CSP (Phase 7), then the Phase 9 gate (full V01–V50 evidence, dependency audit, production build).
4. `npm run test:e2e` builds and starts a production server on port 3100 and runs 17 Chromium specs (6 C2PA smoke + 11 product flow). Extend it with comparison coverage in Phase 6.
5. Keep `verification-log.md`, `requirements-traceability.md`, and `plan.md` current with every executed command and its actual result.
6. Still outstanding for submission: an invalid/mutated credential fixture with an independently established expectation (V04) and a second reference validator for the credential fixtures where practical.
