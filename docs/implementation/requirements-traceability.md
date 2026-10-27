# OriginLens — Requirements Traceability

**PRD:** `OriginLens_PRD.md` v2.0 (26 Oct 2026)
**Status date:** 2026-10-27
**Legend:** `NOT STARTED` = no implementation; `PARTIAL` = tested module-level implementation exists but the end-to-end requirement/scenario is not executable yet; `PASS` = implemented and verified with recorded evidence; `NOT RUN` = test not executed; `BLOCKED` = cannot proceed; `N/A` = capability deliberately not implemented (reason given). `NOT RUN` and `PARTIAL` are never counted as `PASS`. No row may be marked `PASS` without evidence in `verification-log.md`.

## P0 — Required MVP

| ID | Requirement (faithful short form) | PRD | Planned location | Tests | Status |
|---|---|---|---|---|---|
| FR-001 | Single-image intake; recoverable, specific feedback for invalid inputs | §3.1, §5.2 | `src/lib/intake`, `src/components/inspector` | V01, V11–V16 | PASS — start screen accepts one file, shows scope/limits, and displays a recoverable error panel with a safe code (`error-panel`/`error-code`). E2E: truncated JPEG → `PIPELINE_DECODE_FAILED`, session stays usable; unit: SVG/extension/MIME/signature rejections. |
| FR-002 | Preflight checks byte limit, format policy, signature/MIME consistency, decode result, pixel limit before expensive work | §3.1, §7 Stage 1 | `src/lib/intake`, `src/lib/pipeline` | V11–V16 | PASS — pipeline rejects `FILE_TOO_LARGE` before `readHeader`, `PIXEL_LIMIT_EXCEEDED` before `readBytes`, and format/signature mismatches before decode (pipeline unit tests with injected deps); browser decoder reports dimensions before forcing a full decode. |
| FR-003 | SHA-256 of original uploaded bytes, not preview/transform | §3.1, §7 Stage 2 | `src/lib/fingerprint`, `src/lib/pipeline` | V21 | PASS — the pipeline hashes exactly the `ArrayBuffer` read from the selected `File` and fails closed when its length differs from `file.size`; E2E shows the recorded fixture hash for both JPEG and PNG. |
| FR-004 | Metadata allowlist shown as unverified clues; GPS hidden by default | §3.1, §7 Stage 3 | `src/lib/metadata`, `src/components/inspector/ledger.tsx` | V07, V08, V16 | PASS — ledger shows only allowlisted fields, each labelled unverified; only GPS presence is reported; report fixes `includedPreciseGps: false`. Unit tests prove no coordinate keys/values are extracted or serialized. |
| FR-005 | Real pinned C2PA SDK inspection; actual validator states/warnings preserved | §3.1, §7 Stage 4 | `src/lib/c2pa`, `src/lib/pipeline` | V03, V22–V24, V27, V50 | PASS — the product ledger is driven by `@contentauth/c2pa-web@0.15.4` in a real Chromium production build; recorded SDK codes, warnings and limitations are displayed; reader freed in `finally`; missing-WASM and offline failures are typed check failures. |
| FR-006 | Manifest/signature/content-binding validity and signer trust remain separate | §3.1, §6.2 | `src/lib/c2pa`, `src/lib/results`, `src/components/inspector` | V05, V06, V27 | PASS — ledger renders manifest validation, claim signature, asset binding, signer trust, timestamp and revocation as separate rows; E2E shows signature/binding `Valid` with trust `Not evaluated` under `originlens-embedded-only-no-trust-anchors-v1` (ADR-005). |
| FR-007 | Evidence Ledger: every displayed finding references a real check + structured evidence | §3.1, §2.1, §5.4 | `src/components/inspector`, `src/lib/results` | V03, V33 | PASS — each check row exposes checker name/version, execution state, outcome, warnings, limitations and its evidence items with IDs; the canonical evidence list equals the per-check evidence and every `sourceCheckId` resolves (unit), and report cross-references validate. |
| FR-008 | Provenance Delta: compare two files by hash, dimensions, properties, selected metadata, supported preview | §3.1, §5.5, §7 Stage 6 | `src/lib/compare`, `src/components/provenance-delta` | V17–V20, V48, V49 | NOT STARTED — the compare action is rendered but disabled and explicitly labelled as not enabled in this build. No comparison logic or preview metric exists. |
| FR-009 | Typed execution states distinct from result outcomes | §3.1, §9.1, §12 | `src/lib/results`, `src/lib/pipeline` | V26, V27, V33 | PASS — execution state is separate from outcome in schemas, progress UI and ledger; unstarted work is `skipped` and only an interrupted check is `cancelled` (PRD §12.2 line 797, ADR-006); a failed check carries `errorCode` and no outcome. |
| FR-010 | Versioned JSON report download; print view optional only if tested | §3.1, §9.6, §7 Stage 8 | `src/lib/report`, `src/components/inspector` | V33–V35, V43 | PASS — `buildReport` produces schema `2.0` validated by `reportSchema`, fails closed on duplicate IDs or out-of-range files, and the E2E downloads a report whose bytes contain no image data and fixed `false` export flags. Print view not implemented (optional). |
| FR-011 | Privacy defaults: no login, no persistent media history, no server image upload | §3.1, §11.2 | `src/app`, `src/lib/security` | V08, V43, V44 | PASS — static browser-only build with no API route, auth, telemetry, storage or remote fetch; media lives in component state and is discarded on reset/refresh. Secret scan and production build inspected. |
| FR-012 | Clear session releases object URLs, SDK objects, preview resources | §3.1, §5.4, §7 Stage 8 | `src/components/inspector`, `src/lib/c2pa` | V36 | PASS — `clear-session` and `inspect-another` abort the run, bump the run token, and dispose the C2PA runtime (E2E: start screen returns, ledger removed); the decoder revokes its object URL in `finally`; reader lifecycle unit-tested (success/exception/timeout/cancel). |
| FR-013 | Recoverable errors: a failing non-critical check preserves independent results | §3.1, §12.2 | `src/lib/pipeline`, `src/components/inspector` | V15, V22, V25, V26 | PASS — unit matrix keeps completed metadata when C2PA fails, keeps a completed credential check when metadata fails, turns thrown SDK exceptions into `C2PA_INTERNAL_ERROR`; E2E covers malformed file, offline runtime, and download failure without losing the on-screen result. |
| FR-014 | Accessible responsive UI: keyboard + narrow viewport | §3.1, §5.6 | UI components, `src/app/globals.css` | V37, V38 | PASS (primary flow) — E2E: file input reachable by Tab, report download reachable and focused, activated with Enter; 360 px viewport has no horizontal overflow before or after analysis; status is text + badge, never colour-only; `prefers-reduced-motion` honoured. Automated axe and screen-reader passes remain Phase 7/9. |
| FR-015 | Test-backed demo: all release-critical tests pass, fixture provenance recorded | §3.1, §14 | `tests/fixtures/manifest.json`, `tests/**` | V01–V50 | PASS — 220 unit tests (13 files) and 17 Chromium E2E specs pass against a production build; fixture manifest v1.2 records byte length + SHA-256 for every stored fixture, the recorded SDK output, and the no-anchor trust policy. |

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

Statuses reflect the 2026-10-27 Phase 5 increment. `PARTIAL` means module-level or harness-level tests exist while the end-to-end product scenario remains unverified; no row is `PASS` without recorded evidence in `verification-log.md`.

| ID | Scenario | Status / note |
|---|---|---|
| V01 | Valid JPEG within limits | PASS — E2E: `adobe-20220124-C.jpg` is accepted, the ledger shows `image/jpeg`, `W × H px`, the recorded SHA-256, and `4 of 4 checks completed` |
| V02 | Valid PNG, no embedded manifest | PASS — E2E: committed `plain-3x2.png` (88 B, SHA-256 `55da44a1…f89103`) yields `not_present`, `3 × 2 px`, and a complete hash/metadata record |
| V03 | Known supported C2PA fixture | PASS — E2E product ledger reproduces the recorded SDK outcome exactly: `present`, manifest/signature/binding `Valid`, trust `Not evaluated`, codes contain `claimSignature.validated` |
| V04 | Invalid credential fixture | NOT RUN — no invalid/mutated credential fixture acquired yet; it is an explicit entry in `pendingCategories` |
| V05 | Valid signature, unknown signer trust | PASS — E2E: `c2pa-signature` = `Valid` and `c2pa-binding` = `Valid` while `c2pa-trust` = `Not evaluated`, shown in separate rows |
| V06 | Trust resources unavailable | PASS — no trust anchors or trust fetch are configured, so trust and revocation render `Not evaluated` and no trusted badge exists (E2E + ADR-005). There is no configured-anchor path that could become unavailable |
| V07 | Missing metadata | PASS — E2E: plain JPEG and PNG produce `No selected metadata fields were found…` with no fabricated fields, dates, or camera values |
| V08 | GPS metadata hidden/excluded | PASS — E2E `metadata-gps` states presence only; unit tests prove no coordinate key/value is extracted or serialized; the report fixes `includedPreciseGps: false` (ADR-003) |
| V09 | No provider configured | N/A — no provider adapter is integrated (P2 deferred); the ledger states that only the listed checks ran and anything unlisted was not evaluated |
| V10 | Model explainer unavailable → deterministic fallback | N/A — no model explainer is integrated (P1-001 blocked); the deterministic template is the only explanation path and is asserted in E2E |
| V11 | File > 20 MiB rejected before full processing | PASS — pipeline unit test: `FILE_TOO_LARGE` returned before `readHeader`, with zero dependency calls |
| V12 | File > 20 MP rejected before high-memory allocation | PASS — pipeline unit test: 6000 × 4000 → `PIXEL_LIMIT_EXCEEDED` with no `readBytes`; `validateDimensions` uses checked math. The guard prevents this app's full decode/canvas allocation; it cannot prevent the browser from parsing an image header |
| V13 | Extension/MIME mismatch handled safely | PASS — pipeline unit test: PNG bytes named `photo.jpg` → `FORMAT_MISMATCH` before decode; unit matrix covers extension, MIME, and signature disagreement |
| V14 | Unsupported format clear result | PASS — pipeline unit test: SVG bytes named `image.jpg` → `UNSUPPORTED_FORMAT` before `readHeader`; signature table covers GIF/WebP/HEIC/AVIF/TIFF/PDF/archive |
| V15 | Corrupt/truncated file recoverable | PASS — E2E: `truncated.jpg` → error panel `PIPELINE_DECODE_FAILED`, no ledger, and a later valid file analyzes normally |
| V16 | Hostile filename/metadata escaped | PASS — sanitizers strip control/bidi characters and bound length (unit); all displayed text goes through React escaping and no raw-HTML sink exists in `src/`. No dedicated XSS E2E |
| V17 | Duplicate exact file | NOT RUN — Phase 6 (Provenance Delta) |
| V18 | Same image, different encoding | NOT RUN — Phase 6 |
| V19 | Different dimensions/aspect ratios | NOT RUN — Phase 6 |
| V20 | EXIF orientation/color handling differs | NOT RUN — Phase 6 |
| V21 | SHA-256 from original bytes (not preview) | PASS — pipeline unit test hashes exactly the buffer read from the `File` and fails closed on a length mismatch; E2E hashes equal the values computed directly from the committed fixture files |
| V22 | SDK WASM resource missing | PASS — smoke E2E points the session at a missing WASM path → `C2PA_RUNTIME_UNAVAILABLE`, no finding, later session succeeds; offline E2E reaches the same typed failure |
| V23 | Reader cleanup after success | PASS — unit lifecycle test proves exactly one `free()` per reader across repeated/overlapping runs; smoke E2E keeps three consecutive runs independent. No heap/worker instrumentation |
| V24 | Reader cleanup after exception | PASS — unit tests free the reader when `manifestStore()` rejects, when `fromBlob` rejects (no reader), and when `free()` itself throws (outcome kept) |
| V25 | Browser offline | PASS — E2E: after `context.setOffline(true)`, hash + metadata complete, the credential check fails with `C2PA_RUNTIME_UNAVAILABLE`, headline is `Evidence incomplete`, and no result is fabricated |
| V26 | User cancels during work | PARTIAL — pipeline semantics unit-tested (unstarted = `skipped`, interrupted = `cancelled`, partial ledger kept); the Cancel control exists in the progress panel but no deterministic E2E drives it yet (Phase 6) |
| V27 | Unknown SDK code stays unknown | PASS — an unrecognized code is preserved in `sdkCodes`, flagged as needing interpretation, and cannot set a state (unit, synthetic code). No real fixture produces one yet |
| V28 | Provider 429 bounded retry | N/A — no third-party provider integrated (P2 deferred) |
| V29 | Provider 401/403 no retry, no secret exposure | N/A — same as V28 |
| V30 | Provider 5xx/timeout preserves local results | N/A — same as V28 |
| V31 | Invalid provider schema rejected | N/A — same as V28 |
| V32 | Unknown provider field stable | N/A — same as V28 |
| V33 | Report passes runtime schema/references | PASS — E2E downloads the report and re-parses it against `reportSchema`; unit tests prove the JSON round trip, schema version, and that every evidence/check/file reference resolves |
| V34 | Report with bad status/reference blocked | PASS — `buildReport` fails closed (`PIPELINE_CONTRACT_VIOLATION`) on duplicate IDs, out-of-range file counts, or schema violations, and the download handler renders that as `download-error` without discarding the ledger (same rendering path as the V35 E2E) |
| V35 | Report download failure handled | PASS — E2E forces `URL.createObjectURL` to throw for the JSON blob: `download-error` appears, the ledger and fingerprint stay intact, and the button remains enabled |
| V36 | Clear session releases resources | PASS — E2E: `clear-session` returns to the start screen, removes the ledger, shows the notice, and disposes the runtime; the decoder revokes its object URL in `finally`; reader disposal unit-tested |
| V37 | Mobile viewport without overflow | PASS — E2E at 360 × 800 px: no horizontal overflow before or after analysis |
| V38 | Keyboard-only flow | PASS — E2E: file input reached with Tab, report download focusable with visible focus and activated by Enter |
| V39 | Model invents unsupported claim → rejected | N/A — P1 blocked; no model output path exists |
| V40 | Model emits unknown evidence ID → rejected | N/A — P1 blocked |
| V41 | Model malformed JSON/timeout → template | N/A — P1 blocked |
| V42 | Critical dependency audit issue blocks release | PASS — `npm run audit` reports `found 0 vulnerabilities` on the current tree (2026-10-27); rerun required before submission |
| V43 | API secret scan (bundle, maps, history) | PASS — source, untracked files and `.next/static` scanned 2026-10-27: no credential-shaped assignment, no `NEXT_PUBLIC_`, no private key. Rerun after any server route |
| V44 | External-call disclosure + consent precede outbound call | N/A — no outbound call is implemented; required before any P1 integration |
| V45 | No check yields a finding → coverage insufficient | PASS — `summarize` never returns an empty list and reports `evidence_incomplete` when the credential check is unsupported, failed, skipped, or cancelled (unit matrix); unsupported fixture path asserted end-to-end in the pipeline tests |
| V46 | Two providers disagree → separate results | N/A — no providers integrated |
| V47 | Timezones stored UTC, display labelled | PARTIAL — report/evidence timestamps must be exact ISO UTC (unit) and `formatUtcInstant` labels UTC (unit); the ledger displays no timestamps at all, so there is no mislabelled value to test |
| V48 | Same filename, different files separated | NOT RUN — Phase 6 |
| V49 | User original/edited labels marked user-supplied | NOT RUN — Phase 6 |
| V50 | Unsupported C2PA variant doesn't break other checks | PASS — E2E with the truncated JPEG: the credential check fails with a safe code while the hash/metadata checks stay completed; the pipeline contract test records an `unsupported` outcome as `evidence_incomplete`, never as "no credentials" |

## Non-functional requirements carried into every task

Security/privacy/accessibility/consent requirements from PRD §11–§13 and `AGENTS.md` §8 are release-critical constraints, not optional polish. Any change touching intake, C2PA mapping, report export, or the model route must update the corresponding V01–V50 rows with actual evidence before being called complete.
