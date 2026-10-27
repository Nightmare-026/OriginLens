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
| 2 — Requirements & traceability | **IN PROGRESS** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. Phase 7 evidence recorded for FR-014 and V37/V38. Remaining open rows: V04 (unacquired invalid-credential fixture), V20 (no decodable non-upright-orientation fixture), V47 (no displayed timestamps to mislabel), and the P1 rows. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. The CSP gap noted here was closed in Phase 7: the production policy permits `worker-src 'self' blob:` and `'wasm-unsafe-eval'` and is verified by a real credential inspection (ADR-009). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with the 20 MP guard before a full decode, synthetic + committed fixture manifest. Unit-tested; exercised end-to-end in Phase 5. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow (`src/components/inspector/*`, `src/lib/pipeline/*`): start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. 220 unit tests (13 files) and 17 Chromium E2E specs passed against a production build at the time; `typecheck`, `lint`, `build`, `audit` clean. Phase 6 extended the same workflow with a two-file mode. |
| 6 — Provenance Delta, report, recovery | **PASS** | Two-file comparison landed: independent A/B analyses, one `comparison` check with no `fileId`, a validated additive report block (ADR-008), the allowlisted metadata and seven C2PA state comparisons, and a bounded normalized preview metric (`originlens-preview-rgb-mae/1`, 1.2 MP cap, 16/255 channel threshold) that is skipped with a stable reason instead of invented. User original/edited labels are recorded as the user's assertion only. E2E adds 9 comparison specs (V17, V18, V19, V26, V48, V49, two-file report, File B failure, 360 px). Full run: 259 unit tests (15 files), 26 Chromium specs, `typecheck`/`lint`/`build`/`audit` clean. Open: V20 needs a committed decodable fixture with a non-upright orientation. |
| 7 — UX/accessibility/responsive | **PASS** | One `h1` per screen; a persistent polite live region announces each session transition while the progress panel keeps its own stage announcements and gains `aria-busy`; a completed run moves focus to the result heading, and label changes never move it; error panels use `role="alert"`. Narrow-width delta tables clip `<thead>` instead of removing it, so `scope` header associations survive the stacked layout. A production-only CSP plus `nosniff`/`DENY`/`no-referrer`/`Permissions-Policy`/COOP/CORP is shipped and verified by completing a real WebAssembly credential inspection under it (ADR-009). axe-core 4.14.0 reports 0 WCAG 2.0/2.1 A+AA violations on the start screen, ledger, and comparison screen. 10 new E2E specs; full run 36/36. **Open:** manual screen-reader walkthrough not performed. |
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
2. **Agent (next increment):** Phase 9 — hardening and release candidate: complete the V01–V50 evidence rows, rerun the dependency audit and secret scan on the final tree, verify the production build, and rehearse the demo. Close V04 and V20 with real fixtures or record them as accepted limitations, and perform the manual screen-reader walkthrough.
3. Keep the PRD's V01–V50 matrix the single source of acceptance; a `PARTIAL` row is never counted as `PASS`.
4. `npm run test:e2e` builds and starts a production server on port 3100 and runs 36 Chromium specs (6 C2PA smoke + 9 comparison + 11 product flow + 10 accessibility/security).
5. Keep `verification-log.md`, `requirements-traceability.md`, and `plan.md` current with every executed command and its actual result.
6. Still outstanding for submission: an invalid/mutated credential fixture with an independently established expectation (V04), a decodable non-upright-orientation fixture (V20), a manual screen-reader walkthrough, and a second reference validator for the credential fixtures where practical.
