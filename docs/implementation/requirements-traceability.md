# OriginLens — Requirements Traceability

**PRD:** `OriginLens_PRD.md` v2.0 (26 Oct 2026)
**Status date:** 2026-10-27
**Legend:** `NOT STARTED` = no implementation; `PARTIAL` = tested module-level implementation exists but the end-to-end requirement/scenario is not executable yet; `PASS` = implemented and verified with recorded evidence; `NOT RUN` = test not executed; `BLOCKED` = cannot proceed; `N/A` = capability deliberately not implemented (reason given). `NOT RUN` and `PARTIAL` are never counted as `PASS`. No row may be marked `PASS` without evidence in `verification-log.md`.

## P0 — Required MVP

| ID | Requirement (faithful short form) | PRD | Planned location | Tests | Status |
|---|---|---|---|---|---|
| FR-001 | Single-image intake; recoverable, specific feedback for invalid inputs | §3.1, §5.2 | `src/lib/intake`, `src/app/page.tsx` | V01, V11–V16 | PARTIAL — preflight and sanitized display names exist; start page is informational only; no file picker or results UI |
| FR-002 | Preflight checks byte limit, format policy, signature/MIME consistency, decode result, pixel limit before expensive work | §3.1, §7 Stage 1 | `src/lib/intake` | V11–V16 | PARTIAL — `preflightFile` enforces size → extension/MIME → signature → dimensions with 26 unit tests; browser decode result not wired |
| FR-003 | SHA-256 of original uploaded bytes, not preview/transform | §3.1, §7 Stage 2 | `src/lib/fingerprint` | V21 | PARTIAL — `sha256Hex` matches published vectors and hashes only the exact view; not yet bound to an uploaded `File` |
| FR-004 | Metadata allowlist shown as unverified clues; GPS hidden by default | §3.1, §7 Stage 3 | `src/lib/metadata` | V07, V08, V16, V22 (GPS export) | PARTIAL — ExifReader allowlist, GPS presence-only, and text sanitization unit-tested; no UI or report export |
| FR-005 | Real pinned C2PA SDK inspection; actual validator states/warnings preserved | §3.1, §7 Stage 4 | `src/lib/c2pa` | V03, V04, V22–V24, V27, V50 | NOT STARTED — no C2PA SDK dependency or code |
| FR-006 | Manifest/signature/content-binding validity and signer trust remain separate | §3.1, §6.2 | `src/lib/c2pa`, `src/lib/results` | V05, V06, V27 | PARTIAL — runtime schema models each state separately and rejects dependent findings without a present manifest; no SDK mapping |
| FR-007 | Evidence Ledger: every displayed finding references a real check + structured evidence | §3.1, §2.1, §5.4 | `src/components/evidence-ledger`, `src/lib/results` | V03, V33 | PARTIAL — `CheckResult`/`EvidenceItem` contracts and report cross-reference validation tested; ledger UI not built |
| FR-008 | Provenance Delta: compare two files by hash, dimensions, properties, selected metadata, supported preview | §3.1, §5.5, §7 Stage 6 | `src/lib/compare`, `src/components/provenance-delta` | V17–V20, V48, V49 | NOT STARTED |
| FR-009 | Typed execution states distinct from result outcomes | §3.1, §9.1, §12 | `src/lib/results` | V26, V27, V33 | PARTIAL — execution state is separate from outcome; completed/outcome and failed/errorCode invariants unit-tested; no execution engine |
| FR-010 | Versioned JSON report download; print view optional only if tested | §3.1, §9.6, §7 Stage 8 | `src/lib/report` | V33–V35, V43 | PARTIAL — versioned `2.0` report schema validates, and byte/GPS export literals are fixed `false`; serializer/download not built |
| FR-011 | Privacy defaults: no login, no persistent media history, no server image upload | §3.1, §11.2 | `src/app`, `src/lib/security` | V08, V43, V44 | PARTIAL — no server upload, telemetry, auth, or persistence code; start page states browser-first; no file workflow to verify |
| FR-012 | Clear session releases object URLs, SDK objects, preview resources | §3.1, §5.4, §7 Stage 8 | `src/lib/security`, UI | V36 | NOT STARTED — no session resources acquired yet |
| FR-013 | Recoverable errors: a failing non-critical check preserves independent results | §3.1, §12.2 | `src/lib/results`, UI | V15, V22, V25, V26 | PARTIAL — metadata parser failures become typed non-critical results; pipeline/UI recovery not built |
| FR-014 | Accessible responsive UI: keyboard + narrow viewport | §3.1, §5.6 | UI components | V37, V38 | PARTIAL — static shell has semantic landmarks, visible focus, reduced-motion CSS, and fluid width; primary flow and keyboard E2E absent |
| FR-015 | Test-backed demo: all release-critical tests pass, fixture provenance recorded | §3.1, §14 | `tests/fixtures/manifest.json`, `tests/**` | V01–V50 | PARTIAL — 102 unit tests pass and synthetic fixtures are hash-recorded; C2PA fixtures and E2E absent |

## P1 — Conditional (after P0 stable)

| ID | Requirement | Gate | Status |
|---|---|---|---|
| P1-001 | Meta-model evidence explanation: structured schema, server-side secrets, output validation, timeout, deterministic fallback | Phase 1 compliance green (age 18+, authorized access, rules) + P0 stable | **BLOCKED** — design in `decisions.md` ADR-001 and `p1-001-model-explanation-plan.md`; no code, no credentials |
| P1-002 | Print-friendly report | Tested browsers; sensitive fields excluded | NOT STARTED |
| P1-003 | WebP input | Decoder + pinned C2PA behavior verified with fixtures | NOT STARTED |
| P1-004 | Extra fixture families | Expectations established via trusted reference validation | NOT STARTED |

## P2 — Deferred (intentionally not implemented)

Watermark provider API; remote URL/crawling/reverse-image search; video/audio/animated/HEIC/HEIF/RAW/TIFF/PDF/SVG/archives; accounts/history/collaboration/DB/analytics; custom AI detector or AI-probability score; editing/signing assets; legal/forensic certification. (PRD §3.3.)

## Pipeline stages and screens (cross-cutting, traced above)

| PRD item | Covered by |
|---|---|
| Stage 0 consent/eligibility gates | FR-011, FR-015; P1 gate |
| Stage 1 intake/validation | FR-001, FR-002 |
| Stage 2 fingerprint | FR-003 |
| Stage 3 metadata | FR-004 |
| Stage 4 C2PA | FR-005, FR-006 |
| Stage 5 optional provider adapter | Deferred (P2); no adapter integrated |
| Stage 6 Provenance Delta | FR-008 |
| Stage 7 deterministic aggregation | FR-007, FR-009, FR-013 |
| Stage 8 report export | FR-010, FR-012 |
| Screen A Start | FR-001, FR-011, FR-014 |
| Screen B Preflight | FR-001, FR-002 |
| Screen C Progress | FR-009, FR-013 |
| Screen D Evidence Ledger report | FR-005–FR-010, FR-013 |
| Screen E Two-file comparison | FR-008 |
| Visual/accessibility §5.6 | FR-014 |

## V01–V50 acceptance matrix (PRD §14.4)

Statuses reflect the 2026-10-27 module increment. `PARTIAL` means module-level tests exist while the end-to-end scenario remains unverified; no row is `PASS` without recorded evidence.

| ID | Scenario | Status / note |
|---|---|---|
| V01 | Valid JPEG within limits | NOT RUN |
| V02 | Valid PNG, no embedded manifest | NOT RUN |
| V03 | Known supported C2PA fixture | NOT RUN — fixture not yet acquired/verified |
| V04 | Invalid credential fixture | NOT RUN |
| V05 | Valid signature, unknown signer trust | NOT RUN |
| V06 | Trust resources unavailable | NOT RUN |
| V07 | Missing metadata | PARTIAL — plain JPEG/PNG return no allowlisted fields without failing; app scenario not built |
| V08 | GPS metadata hidden/excluded | PARTIAL — unit test proves coordinates are never extracted or serialized; report schema fixes precise-GPS export to `false`; no UI/export |
| V09 | No provider configured | NOT RUN |
| V10 | Model explainer unavailable → deterministic fallback | NOT RUN — P1 blocked; fallback required when/if enabled |
| V11 | File > 20 MiB rejected before full processing | PARTIAL — `validateDeclaredFile` rejects before any body read (unit test) |
| V12 | File > 20 MP rejected before high-memory allocation | PARTIAL — `validateDimensions` rejects with checked math (unit test); browser decode not wired |
| V13 | Extension/MIME mismatch handled safely | PARTIAL — extension, browser MIME, and signature disagreement rejected in unit tests |
| V14 | Unsupported format clear result | PARTIAL — GIF/WebP/HEIF/AVIF/TIFF/PDF/SVG/archive signatures map to `UNSUPPORTED_FORMAT` |
| V15 | Corrupt/truncated file recoverable | PARTIAL — short headers and unparseable metadata fail recoverably in module tests; full decode absent |
| V16 | Hostile filename/metadata escaped | PARTIAL — filename/metadata sanitizers strip control/bidi characters and bound length; not rendered in the DOM |
| V17 | Duplicate exact file | NOT RUN |
| V18 | Same image, different encoding | NOT RUN |
| V19 | Different dimensions/aspect ratios | NOT RUN |
| V20 | EXIF orientation/color handling differs | NOT RUN |
| V21 | SHA-256 from original bytes (not preview) | PARTIAL — hashes only the exact supplied byte view; published SHA-256 vectors pass; not yet bound to upload |
| V22 | SDK WASM resource missing | NOT RUN |
| V23 | Reader cleanup after success | NOT RUN |
| V24 | Reader cleanup after exception | NOT RUN |
| V25 | Browser offline | NOT RUN |
| V26 | User cancels during work | NOT RUN |
| V27 | Unknown SDK code stays unknown | NOT RUN |
| V28 | Provider 429 bounded retry | N/A — no third-party provider integrated (P2 deferred) |
| V29 | Provider 401/403 no retry, no secret exposure | N/A — same as V28 |
| V30 | Provider 5xx/timeout preserves local results | N/A — same as V28 |
| V31 | Invalid provider schema rejected | N/A — same as V28 |
| V32 | Unknown provider field stable | N/A — same as V28 |
| V33 | Report passes runtime schema/references | PARTIAL — valid report fixture and JSON round trip validated; no download path |
| V34 | Report with bad status/reference blocked | PARTIAL — 53 contract tests reject bad hashes/timestamps/MIME, duplicate IDs, dangling references, and export-flag violations |
| V35 | Report download failure handled | NOT RUN |
| V36 | Clear session releases resources | NOT RUN |
| V37 | Mobile viewport without overflow | NOT RUN |
| V38 | Keyboard-only flow | NOT RUN |
| V39 | Model invents unsupported claim → rejected | NOT RUN — P1 blocked |
| V40 | Model emits unknown evidence ID → rejected | NOT RUN — P1 blocked |
| V41 | Model malformed JSON/timeout → template | NOT RUN — P1 blocked |
| V42 | Critical dependency audit issue blocks release | PARTIAL — `npm audit` reports 0 vulnerabilities on 2026-10-27; rerun on the final dependency tree |
| V43 | API secret scan (bundle, maps, history) | PASS — source/docs/`.next` JS+map+JSON files and git history scanned 2026-10-27 with no secret found; one confirmed false positive (`sk-async-storage-instance`); rerun after any server route |
| V44 | External-call disclosure + consent precede outbound call | N/A — no outbound calls implemented; required before any P1 integration |
| V45 | No check yields a finding → coverage insufficient | NOT RUN |
| V46 | Two providers disagree → separate results | N/A — no providers integrated |
| V47 | Timezones stored UTC, display labelled | PARTIAL — report/evidence timestamps require exact ISO UTC; display labelling not built |
| V48 | Same filename, different files separated | NOT RUN |
| V49 | User original/edited labels marked user-supplied | NOT RUN |
| V50 | Unsupported C2PA variant doesn't break other checks | NOT RUN |

## Non-functional requirements carried into every task

Security/privacy/accessibility/consent requirements from PRD §11–§13 and `AGENTS.md` §8 are release-critical constraints, not optional polish. Any change touching intake, C2PA mapping, report export, or the model route must update the corresponding V01–V50 rows with actual evidence before being called complete.
