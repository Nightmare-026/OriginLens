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
| 2 — Requirements & traceability | **IN PROGRESS** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. Module-level `PARTIAL` statuses updated 2026-10-27; end-to-end rows remain unverified. |
| 3 — Architecture & spikes | **IN PROGRESS** | Next.js 16.4.3 + React 19.3.1 + TypeScript 5.9.3 scaffold builds in production mode. Riskiest spike — pinned `c2pa-web` WASM/worker in the real build — is **NOT RUN**. |
| 4 — Data contracts & safe intake | **IN PROGRESS** | Implemented and unit-tested: intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, synthetic fixture manifest. Browser decode wiring and aggregation are pending. |
| 5 — P0 workflow & Evidence Ledger | **NOT STARTED** | Depends on Phases 3–4. |
| 6 — Provenance Delta, report, recovery | **NOT STARTED** | Depends on Phase 5. |
| 7 — UX/accessibility/responsive | **NOT STARTED** | Applies throughout; gate at Phase 9. |
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
2. **Agent (next increment):** run the pinned `c2pa-web` 0.15.4 WASM/worker spike in the real Next.js production build — same-origin asset path, CSP, reader cleanup in `finally`, and trust-resource-unavailable behavior. Record V22–V24/V50 evidence, or document the tested fallback. No C2PA capability may be claimed before this passes.
3. **Then:** wire browser decode + preflight into the single-file workflow and Evidence Ledger (Phase 5), followed by Provenance Delta/report (Phase 6).
4. Add Playwright and execute the E2E flow; `npm run test:e2e` currently exits 1 by design.
5. Keep `verification-log.md`, `requirements-traceability.md`, and `plan.md` current with every executed command and its actual result.
