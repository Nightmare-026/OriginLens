# OriginLens — Verification Log

Honest record of commands/checks actually executed. `NOT RUN` and `PARTIAL` rows are never counted as `PASS`.

## 2026-10-27 — Phase 0/1 bootstrap

**Environment:** Windows, PowerShell; working dir `D:\Projects\OriginLens`; no git repository.

| # | Command / action | Result | Evidence |
|---|---|---|---|
| 1 | Directory listing (`Get-ChildItem -Force`) | PASS — repo contained exactly `AGENTS.md` and `OriginLens_PRD.md` (no hidden files, no `.git`) | file list |
| 2 | `git rev-parse --is-inside-work-tree` | `not-a-git-repo` — git-based safety checks cannot run until a repo is initialized | command output |
| 3 | Read PRD lines 1–120, 121–844, 845–1130 | PASS — all 21 sections read; title "OriginLens — Audited Product Specification v2.0", prepared 26 Oct 2026 | read output |
| 4 | Fetch `https://dev.meta.ai/events/global-hackathon` | PASS — event dates (Oct 26–Nov 4; submissions Nov 4, 9:00 PM ET), tracks/themes, model ecosystem framing, "Official Rules … must be accepted" | page content |
| 5 | Fetch `https://dev.meta.ai/help/accounts-and-login/age-requirement` | PASS — "at least 18 years of age to sign-up and access Model API platform" | page content |
| 6 | Fetch `https://dev.meta.ai/legal/terms-of-service` | PASS — ToS last updated 2026-10-09; §10.1 End Users ≥18, no under-18 targeting; key-sharing and Coding-Harness key limits; tier/training terms; §7 no trademark license | page content |
| 7 | Fetch `https://dev.meta.ai/legal/acceptable-use-policy` | PASS — provenance-signal integrity, disclosure, deception prohibitions | page content |
| 8 | Fetch `https://dev.meta.ai/docs/quickstart` | PASS — base URL `https://api.meta.ai/v1`, Responses API, model `muse-spark-1.3`, `MODEL_API_KEY`; 401/404 behaviors | page content |
| 9 | Fetch `https://dev.meta.ai/docs/pricing-rate-limits` | PASS — Standard $1.25/$4.25 per 1M tokens; 3,000 RPM / 4M TPM; 429 backoff + `Retry-After` | page content |
| 10 | Fetch `https://dev.meta.ai/legal/geographic-use-policy` | PASS — Standard/Contributor model designations; Restricted Territories; Muse Image not available in India | page content |
| 11 | Fetch `https://cerebralvalley.ai/e/meta-ai-developer-hackathon` | PASS — dates, Indie track judging, eligibility, rules publication statement | page content |
| 12 | Fetch `https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver` | **NOT RETRIEVED** — page returned a JS shell ("Loading…"); no waiver text accessible | page content |
| 13 | Secret-like-value scan (`Get-ChildItem` + `Select-String` patterns for `sk-`, `ghp_`, `AKIA`, `api_key=…`, `secret=…`) | PASS — `no-secret-like-values-found` across repo files | command output |
| 14 | `docs/implementation/*` creation | PASS — plan, compliance checklist, decisions (ADR-001), requirements traceability, verification log created | file listing after write |
| 15 | `npm/pnpm install`, `lint`, `typecheck`, `test`, `test:e2e`, `build`, `audit` | **NOT RUN** — no `package.json`, no toolchain, no application code exists | repo state |

**Status:** Phase 0 gate PASS. Phase 1 gate **BLOCKED** — authorized Meta access/eligibility and Official Rules acceptance unconfirmed (see `compliance-checklist.md`). No runtime Meta API code written; no credentials present; no model use claimed.

## 2026-10-27 — P0 scaffold + Phase 4 module increment

**Environment:** Windows PowerShell; working dir `D:\Projects\OriginLens`; git repo initialized; Node v24.22.1; npm 12.2.1.

| # | Command / action | Result | Evidence |
|---|---|---|---|
| 16 | `npm install --no-fund --no-audit` | PASS — 363 packages installed; `npm ls --all` reported no `invalid`/`UNMET DEPENDENCY` rows after pinning `eslint@9.39.5` (required by the ESLint ≤9 peer ranges of plugins bundled in `eslint-config-next@16.4.3`) | install output; `npm ls --all` |
| 17 | Review of blocked install scripts (`exifreader@4.52.0`, `unrs-resolver@1.12.2`) | PASS — `exifreader` postinstall is a no-op unless a dependent config exists (`bin/build.js --only-with-config`), and the shipped `dist/exif-reader.js` is used; `unrs-resolver` Windows binding `node_modules/@unrs/resolver-binding-win32-x64-msvc/resolver.win32-x64-msvc.node` exists. Neither script is needed. | file inspection |
| 18 | `npm audit --audit-level=low`; `npm run audit` | PASS — `found 0 vulnerabilities` | command output |
| 19 | `npm run typecheck` | PASS — `tsc --noEmit`, no diagnostics | exit 0 |
| 20 | `npm run lint` | PASS — `eslint .`, 0 errors and 0 warnings | exit 0 |
| 21 | `npm test` | PASS — 5 files, 102 tests passed (intake 26, SHA-256 7, metadata 12, results 53, fixture manifest 4); Vitest 5.0.5 | Vitest output |
| 22 | `npm run build` | PASS — Next.js 16.4.3 production build; `/` and `/_not-found` prerendered as static content | build output |
| 23 | Next.js automatic `tsconfig.json` adjustment | RECORDED — Next set `jsx: react-jsx` and added `.next/dev/types/**/*.ts`; diff reviewed and kept | `tsconfig.json` |
| 24 | Secret scan of `src/`, `tests/`, `docs/`, root config files, `.next` JS/maps/JSON, and git history | PASS — no secret found. The only bundle match was the internal module name `sk-async-storage-instance` in Turbopack `.nft.json` file lists; confirmed a false positive. | scan output |
| 25 | ExifReader 4.52.0 behavior probes (synthetic EXIF JPEG, plain JPEG/PNG, random bytes, truncated EXIF) | PASS — allowlisted EXIF fields parse; plain JPEG/PNG parse with no allowlist fields; random bytes throw a generic `Error`; truncated EXIF returns `FileType` only. Expectations are encoded in unit tests. | probe output |
| 26 | `npm run test:e2e` | **NOT RUN** — the script intentionally exits 1 with "Playwright is not configured yet (Phase 5)". E2E is not claimed. | script definition |
| 27 | C2PA `c2pa-web` WASM/worker spike in the production build | **NOT RUN** — next increment (Phase 3 risk spike). No C2PA code exists and no C2PA capability is claimed. | repo state |

**Status:** Phase 3 `IN PROGRESS` — the pinned Next.js scaffold builds, but the C2PA/WASM integration is unverified. Phase 4 `IN PROGRESS` — intake, fingerprint, metadata allowlist, and result/report contracts have unit evidence; browser decode, aggregation, and UI are not built. Phase 1 remains **BLOCKED**. No Meta API call made and no model integration claimed.

Final rerun immediately before commit (2026-10-27): `npm test` 102/102 PASS, `npm run typecheck` PASS, `npm run lint` PASS (0 warnings), `npm run build` PASS.

## 2026-10-27 — Phase 3 C2PA spike and adapter

**Environment:** Windows PowerShell; working dir `D:\Projects\OriginLens`; Node v24.22.1; npm 12.2.1; `@contentauth/c2pa-web@0.15.4`; Chromium 1248 via Playwright 1.64.1.

| # | Command / action | Result | Evidence |
|---|---|---|---|
| 28 | Review of installed `c2pa-web@0.15.4` package metadata, exports, and `dist/lib/*.d.ts` | PASS — `createC2pa({ wasmSrc })` returns a handle with `dispose()`; `Reader.fromBlob(c2pa, format, blob)` returns `null` only when no manifest is found and throws otherwise; `free()` releases a reader. Package exports `./package.json` and `./resources/c2pa.wasm`; dependencies are `highgain`, `c2pa-types 0.7.6`, `c2pa-utilities 0.3.2`, `c2pa-wasm 0.13.3` | package metadata + type declarations |
| 29 | `node scripts/sync-c2pa-assets.mjs` (wired to `predev`/`prebuild`/`pretest`) | PASS — copied `dist/resources/c2pa_bg.wasm` to `public/c2pa/0.15.4/c2pa_bg.wasm`: 9,049,453 bytes, SHA-256 `01b8e25f637aaa3fe197bc5646ce114810db4789db19af7e1f6bfebe9e9858df`, SHA-512 SRI matches the value embedded in the SDK bundle. The script refuses to write on any version/digest mismatch | script output; `tests/unit/c2pa-assets.test.ts` |
| 30 | Real-browser probe of the pinned SDK against `adobe-20220124-C.jpg` (temporary dev route, since deleted) | PASS — `validation_state: "Valid"`; success codes `timeStamp.validated`, `timeStamp.trusted`, `claimSignature.insideValidity`, `claimSignature.validated`, `assertion.hashedURI.match`, `assertion.dataHash.match`; informational `signingCredential.ocsp.skipped`; failure `signingCredential.untrusted` (no trust anchors configured); actions `c2pa.created`, `c2pa.drawing`; no ingredients. Output committed verbatim as `tests/fixtures/c2pa/adobe-20220124-C.sdk-0.15.4-manifest-store.json` (5,005 bytes, SHA-256 `9c7a1cf3…72f6a`, BOM removed only) | probe output; fixture manifest `referenceOutputs` |
| 31 | Real-browser probe with `plain-1x1.jpg` and `truncated.jpg` | PASS — plain JPEG returns `null` (`NO_MANIFEST`); truncated JPEG throws `C2pa(InvalidAsset("Could not parse input JPEG"))`, which the adapter records as `C2PA_READ_FAILED`, not as a content finding | probe output; `tests/e2e/c2pa-smoke.spec.ts` |
| 32 | `npm run typecheck` | PASS — `tsc --noEmit`, no diagnostics | exit 0 |
| 33 | `npm run lint` | PASS — `eslint .`, 0 errors and 0 warnings | exit 0 |
| 34 | `npm test` | PASS — 9 files, 167 tests (adds `c2pa-map` 16, `c2pa-check` 22, `c2pa-session` 16, `c2pa-assets` 7, and grows the fixture-manifest suite from 4 to 8); Vitest 5.0.5 | Vitest output |
| 35 | `npm run test:e2e` | PASS — 6/6 Chromium specs against a production build started on port 3100 (`npm run build && npm start`): credential fixture, missing manifest, malformed-file recovery, missing-WASM recovery, three independent repeated runs, session clear | Playwright output, 17.4 s |
| 36 | `npm run build` | PASS — Next.js 16.4.3 (Turbopack) production build; `/`, `/_not-found`, `/dev/c2pa-smoke` prerendered as static content | build output |
| 37 | `npm run audit` | PASS — `found 0 vulnerabilities` | command output |
| 38 | Fixture manifest v1.1 | PASS — C2PA fixture bytes, recorded SDK output, and reference extract are hash- and length-verified by `tests/unit/fixtures.test.ts`; no fixture claims `signerTrust: trusted`, and every manifest-present fixture names `originlens-embedded-only-no-trust-anchors-v1` | test output |
| 39 | Playwright artifact handling | PASS — `test-results/`, `playwright-report/`, `blob-report/` added to `.gitignore`; first-run failure artifacts deleted after diagnosis | `.gitignore`; `git status` |
| 40 | CSP integration | **NOT RUN** — no Content-Security-Policy is configured. The current app is static and same-origin; nonce-based CSP conflicts with static prerendering. Recorded as a Phase 7/9 item; CSP is **not** claimed | `next.config.ts` |
| 41 | Product Evidence Ledger UI for C2PA findings | **NOT RUN** — the adapter is exercised only through the developer harness `/dev/c2pa-smoke`. No user-facing C2PA result exists yet | route list |

**Corrections made during this increment (recorded so they are not mistaken for passing first time):**

1. The first `test:e2e` run failed before running any test: Playwright loaded the TypeScript spec as CommonJS, so `import.meta.url` threw `SyntaxError: Cannot use 'import.meta' outside a module`. Fixed by resolving fixture paths from the resolved Playwright config file.
2. The next run failed 6/6 on fixture lookup because `config.rootDir` is the test directory, not the project root; fixed to derive the project root from `configFile`.
3. The following run passed 3/6: the "wait for a new report" poll treated an empty report (`checkId: ''`) as a different check. Fixed so a missing report keeps polling; 6/6 then passed.
4. `typecheck` initially failed in `tests/unit/fixtures.test.ts` because a Node `Buffer` is typed over `ArrayBufferLike`, not `ArrayBuffer`; fixed by copying file bytes into a fresh `Uint8Array`.

**Status:** Phase 3 gate **PASS** for the C2PA integration (tested proof-of-concept in the real production build, ADR-004/ADR-005). CSP and the product Evidence Ledger flow remain open and are not claimed. Phase 1 remains **BLOCKED**; no Meta API call was made and no model integration is claimed.

## 2026-10-27 — Phase 5 single-file workflow and Evidence Ledger

**Environment:** Windows PowerShell; working dir `D:\Projects\OriginLens`; Node v24.22.1; npm 12.2.1; Next.js 16.4.3; `@contentauth/c2pa-web@0.15.4`; Chromium 1248 via Playwright 1.64.1.

| # | Command / action | Result | Evidence |
|---|---|---|---|
| 42 | `npm run typecheck` | PASS — `tsc --noEmit`, no diagnostics after the pipeline, UI, report, and test additions | exit 0 |
| 43 | `npm run lint` | PASS — `eslint .`, 0 errors and 0 warnings | exit 0 |
| 44 | `npm test` | PASS — 13 files, 220 tests: adds `pipeline-analyze` 24, `pipeline-summary` 13, `report-build` 6, `inspector-labels` 10, and grows the fixture suite to 7; Vitest 5.0.5 | Vitest output |
| 45 | `npm run test:e2e` | PASS — 17/17 Chromium specs against a production build on port 3100: 6 C2PA smoke + 11 product-flow (verified fixture, missing manifest, PNG, malformed recovery, report download, download failure, offline, inspect-another, clear session, keyboard, 360 px) | Playwright output, 33.7 s |
| 46 | `npm run build` | PASS — Next.js 16.4.3 (Turbopack); `/`, `/_not-found`, `/dev/c2pa-smoke` prerendered as static content; no server route added | build output |
| 47 | `npm run audit` (`npm audit --audit-level=high`) | PASS — `found 0 vulnerabilities` | command output |
| 48 | Pipeline defect found by the new call-order test | **CORRECTED** — the metadata stage called the module-level `inspectMetadata` instead of `deps.inspectMetadata`, so an injected parser was ignored. Fixed; `harness.calls` now pins the exact order `readHeader → decodeDimensions → readBytes → sha256 → inspectMetadata → inspectC2pa` | `tests/unit/pipeline-analyze.test.ts` |
| 49 | Cancellation semantics aligned with PRD §12.2 (line 797) | **CORRECTED** — work that never started is `skipped`; only an interrupted C2PA check is `cancelled`; a late inspection that returns a real result is recorded. Documented in ADR-006 | `src/lib/pipeline/analyze.ts`; unit tests |
| 50 | Screen B fidelity (PRD §5.2) | **CORRECTED** — the progress panel withheld the display name and byte size until the intake stage completed, and the heading reads "Validating the selected file" until then | `progress-panel.tsx`, `workflow.tsx` |
| 51 | Deterministic PNG fixture (V02) | PASS — `node tests/fixtures/generate-plain-png.mjs` writes an 88-byte 3 × 2 RGB PNG, SHA-256 `55da44a11728930a62c75c7607cdbd466d20f5847742c6a4f6748c28e8f89103`; stored-deflate blocks make the bytes zlib-independent (ADR-007). ExifReader 4.52.0 probe returns PNG header tags only, so the allowlist yields 0 fields | generator output; fixture manifest v1.2; `tests/unit/fixtures.test.ts` |
| 52 | Real-browser PNG credential check (V02) | PASS — the same fixture in the product flow yields `not_present` with `4 of 4 checks completed`; recorded in the fixture manifest `expected` block | Playwright `inspect.spec.ts` |
| 53 | Offline degradation (V25) | PASS — `context.setOffline(true)` after page load: SHA-256 and metadata complete, the credential check fails with `C2PA_RUNTIME_UNAVAILABLE`, headline `Evidence incomplete`, no fabricated result | Playwright `inspect.spec.ts` |
| 54 | Report download failure (V35) | PASS — `URL.createObjectURL` forced to throw for the JSON blob: `download-error` shown, ledger and fingerprint intact, control still enabled | Playwright `inspect.spec.ts` |
| 55 | Secret scan (V43) | PASS — tracked + untracked source scanned for credential-shaped assignments: none; no `NEXT_PUBLIC_` reference; `.next/static` contains no secret-shaped string or private key | scan output |
| 56 | Content-Security-Policy | **NOT RUN** — still unconfigured; Phase 7/9 item. Not claimed | `next.config.ts` |
| 57 | Provenance Delta / two-file comparison (FR-008, V17–V20, V48, V49) | **NOT RUN** — action rendered but disabled and labelled as not enabled in this build | `start-screen.tsx` |
| 58 | Product cancel-control E2E (V26) | **NOT RUN** — pipeline cancellation semantics are unit-tested; no browser test drives the Cancel control deterministically yet | `tests/e2e/inspect.spec.ts` |
| 59 | Invalid/mutated credential fixture (V04) | **NOT RUN** — no fixture acquired; listed in `pendingCategories` | fixture manifest |

**Corrections made during this increment (recorded so they are not mistaken for passing first time):**

1. The first product-flow E2E run failed one spec on the trust label: the test expected "Not evaluated under the configured policy", but `TRUST_LABELS.not_evaluated` is exactly "Not evaluated" (the policy is shown in its own row). The expectation was corrected to the shipped label; the label itself was left unchanged.
2. A second spec failed on an ambiguous text locator ("Absence is not evidence…" appears in two panels); it was narrowed to the `limitations` test id.
3. `typecheck` failed in the new harness because `new Uint8Array(n)` is typed `Uint8Array<ArrayBufferLike>`, which is not a `BlobPart`; fixed by typing the helper as `Uint8Array<ArrayBuffer>`.
4. A report test reused sequential IDs across two analyses, which `buildReport` rejected as a duplicate-ID contract violation. The harness gained a `startId` offset, and a separate test now pins the rejection as intended behaviour.
5. An `unsupported` credential inspection produces a structured finding whose presence is `unsupported` and whose components are all `not_evaluated`; the initial test asserted `finding === null` and was corrected to the real contract.
6. The first summary-copy test banned the word "tampering" outright, which rejected the accurate sentence "not proof of intent, deception, or tampering". The assertion now targets claim language ("100%", "probability", "deepfake", "forensically certified", "verified by meta") and separately requires an explicit limitation.

**Status:** Phase 5 gate **PASS** for the single-file workflow, Evidence Ledger, report export, and recovery paths (PRD §5.1–§5.4, §5.6 primary flow). Phase 6 (Provenance Delta) is **IN PROGRESS**. Phase 1 and P1-001 remain **BLOCKED**; no Meta API call was made, no model integration exists, and no model use is claimed.

## Pending verification (must be filled with actual outputs)

- Dependency audit before submission (V42): clean on 2026-10-27; rerun on the final dependency tree.
- Secret scans after any server route or API-key integration is added (V43).
- Content-Security-Policy for the production build (Phase 7/9).
- Provenance Delta E2E, product cancel control, and duplicate/alternate-encoding comparison cases (V17–V20, V26, V48, V49).
- Invalid/mutated credential fixture (V04) and a second reference validator for the credential fixtures.
- All V01–V50 rows with expected vs. actual, tool/version, environment, date.
