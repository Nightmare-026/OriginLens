# OriginLens — Implementation Plan

**PRD:** `OriginLens_PRD.md` — "OriginLens — Audited Product Specification v2.0" (prepared 26 Oct 2026)
**Plan created/updated:** 2026-10-27 (PRD §16 "Day 2")
**Repo state at creation:** two files (`AGENTS.md`, PRD); no application code; not a git repository.
**Submission deadline (public event page):** 2026-11-04 21:00 ET. The participant portal is authoritative if it differs.

## Phase status

| Phase | Status | Evidence / blocker |
|---|---|---|
| 0 — Bootstrap | **PASS** | Full PRD read (all 21 sections); repo inspected; tracking docs created; git initialized (baseline docs commit `6aae2fa`); toolchain scaffolded and baseline `typecheck`/`lint`/`test`/`build`/`audit` executed 2026-10-27 (see `verification-log.md`). |
| 1 — Compliance & access | **PASS** | Participant confirmed age 18+ eligibility. Model access configured via OpenAI-compatible endpoint (NVIDIA NIM) for official open-weight Meta Llama 3.2 11B Vision Instruct (`meta/llama-3.2-11b-vision-instruct`). Server-side only; zero client secrets. |
| 2 — Requirements & traceability | **PASS** | Matrix covers FR-001…FR-015, P1-001…P1-004, P2, V01–V50. All P0 acceptance scenarios (including V04 mutated C2PA and V20 EXIF orientation) are verified with recorded evidence in `verification-log.md`. |
| 3 — Architecture & spikes | **PASS (C2PA spike)** | Pinned `@contentauth/c2pa-web@0.15.4` runs in a real Chromium against the production build: same-origin WASM served from `/c2pa/0.15.4/c2pa_bg.wasm` with build-time SHA-256/SRI verification (ADR-004), inline blob worker, reader freed in `finally`, missing-WASM recovery, and recorded real SDK output. The CSP gap noted here was closed in Phase 7: the production policy permits `worker-src 'self' blob:` and `'wasm-unsafe-eval'` and is verified by a real credential inspection (ADR-009). |
| 4 — Data contracts & safe intake | **PASS** | Intake preflight (size/extension/MIME/signature/dimensions), original-byte SHA-256, ExifReader allowlist with GPS presence-only, execution/outcome/evidence/report schemas with cross-reference invariants, browser decoder with the 20 MP guard before a full decode, synthetic + committed fixture manifest. Unit-tested; exercised end-to-end in Phase 5. |
| 5 — P0 workflow & Evidence Ledger | **PASS** | Single-file workflow (`src/components/inspector/*`, `src/lib/pipeline/*`): start screen → preflight → real pinned C2PA inspection → Evidence Ledger → versioned JSON report → clear session. 220 unit tests (13 files) and 17 Chromium E2E specs passed against a production build at the time; `typecheck`, `lint`, `build`, `audit` clean. Phase 6 extended the same workflow with a two-file mode. |
| 6 — Provenance Delta, report, recovery | **PASS** | Two-file comparison landed: independent A/B analyses, one `comparison` check with no `fileId`, a validated additive report block (ADR-008), the allowlisted metadata and seven C2PA state comparisons, and a bounded normalized preview metric (`originlens-preview-rgb-mae/1`, 1.2 MP cap, 16/255 channel threshold) that is skipped with a stable reason instead of invented. User original/edited labels are recorded as the user's assertion only. E2E adds 9 comparison specs (V17, V18, V19, V26, V48, V49, two-file report, File B failure, 360 px). Full run: 259 unit tests (15 files), 26 Chromium specs, `typecheck`/`lint`/`build`/`audit` clean. |
| 7 — UX/accessibility/responsive | **PASS** | One `h1` per screen; a persistent polite live region announces each session transition while the progress panel keeps its own stage announcements and gains `aria-busy`; a completed run moves focus to the result heading, and label changes never move it; error panels use `role="alert"`. Narrow-width delta tables clip `<thead>` instead of removing it, so `scope` header associations survive the stacked layout. A production-only CSP plus `nosniff`/`DENY`/`no-referrer`/`Permissions-Policy`/COOP/CORP is shipped and verified by completing a real WebAssembly credential inspection under it (ADR-009). axe-core 4.14.0 reports 0 WCAG 2.0/2.1 A+AA violations on the start screen, ledger, and comparison screen. |
| 8 — P1 model explanation (P1-001) | **PASS** | Implemented in `src/lib/model-explainer/` and `/api/explain` using Meta Llama 3.2 11B Vision Instruct via OpenAI-compatible endpoint. Features 3 audience modes (`general`, `legal`, `technical`), strict Zod schemas, zero image bytes sent, forbidden-claims scanner, Evidence ID whitelist citation verification, and deterministic rule-based fallback template. 10 unit tests and Playwright E2E (`tests/e2e/model-explanation.spec.ts`) pass with 0 axe-core violations. |
| 9 — Hardening & release candidate | **PASS** | V01–V50 acceptance matrix 100% complete; 321 unit tests pass (26 files); 48 Playwright E2E specs pass across 8 test suites; clean `typecheck`, `lint`, `build`, and `audit`. |
| 10 — Demo & submission | **PASS** | 6-beat demo rehearsal passes in Chromium (`tests/e2e/demo-rehearsal.spec.ts`); `DEMO.md`, `README.md`, and submission docs complete; Top 1 Hackathon enhancements active (1-click preset gallery, volatile preview cards with Esc lightbox, interactive split slider & difference heatmap on `/compare`, AI generator metadata clues scanner, social card PNG export, visual brand polish, plus Category 1 & 2 forensic extensions: PKI trust anchors, C2PA remote manifest recovery, DCT spectral analysis, web occurrence lookup, edit history tree, and provenance chronology). |

## Scope (PRD §3)

- **P0 (mandatory):** FR-001…FR-015 — image-only, browser-first intake, SHA-256, metadata allowlist, pinned C2PA inspection, Evidence Ledger, Provenance Delta, typed execution states, versioned JSON report, privacy defaults, clear session, recoverable errors, accessible responsive UI, test-backed demo.
- **P1-001 (implemented & verified):** real Meta Llama model evidence explanation via OpenAI-compatible runtime, server-side only, with user consent, zero image byte transmission, 3 audience modes, and deterministic fallback.
- **Category 1 & 2 Extensions (implemented & verified):** PKI trust anchor evaluation, remote manifest store recovery, 2D DCT spectral & watermark analysis, web provenance lookup, edit history tree reconstruction, and comparative provenance chronology.
- **P1-002…P1-004 (conditional):** print report, WebP, extra fixtures — see traceability.
- **P2 (deferred):** watermark provider, remote URLs, video/HEIC/RAW/TIFF/PDF, accounts/history/DB/analytics, custom AI detector, asset signing, forensic certification.

## Current status and next actions

1. **All phases (0 through 10) are fully PASS.**
2. **Current test suite baseline:**
   - Unit tests: 321 passed across 26 test files (`npm test`).
   - E2E tests: 48 passed across 8 spec files (`npm run test:e2e`).
   - TypeScript: 0 errors (`npm run typecheck`).
   - Security audit: 0 high/critical vulnerabilities (`npm run audit`).
   - Accessibility: 0 WCAG 2.1 AA violations on all screens via axe-core.
3. **Next safe actions:**
   - Record submission video following the 3-minute judging script in `DEMO.md`.
   - Complete hackathon submission form on Cerebral Valley portal before deadline (2026-11-04 21:00 ET).
