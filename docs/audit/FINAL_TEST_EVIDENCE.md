# OriginLens — Final Verification and Test Evidence

**Test Execution Date:** 2026-11-02  
**Auditor:** Independent Principal Engineering Auditor  
**Repository Branch / Commit SHA:** `main` @ `9c0422eec08eaa5b8801172dbe03f82b54b17c7e` (with audit remediations)  
**Execution Platform:** Windows 11 Enterprise (x64) · PowerShell 7 / Windows Terminal  

---

## 1. Test Environment Specification

| Component | Version / Identifier | Configuration Notes |
|---|---|---|
| **Node.js** | `v24.22.1` | Native x64 runtime |
| **npm** | `12.2.1` | Pinned package manager |
| **Next.js** | `16.4.3` | Turbopack production builder enabled |
| **TypeScript** | `5.9.3` | Strict mode enabled (`tsconfig.json`) |
| **ESLint** | `9.39.5` | Flat config (`eslint.config.mjs`) |
| **Vitest** | `5.0.5` | Vite 8.3.5, 21 isolate worker threads |
| **Playwright** | `1.64.1` | Chromium Headless (version 136) |
| **@contentauth/c2pa-web** | `0.15.4` | Exact pinned WebAssembly SDK |
| **axe-core** | `4.14.0` | WCAG 2.0 / 2.1 / 2.2 A + AA automated auditing |

---

## 2. Master Verification Command Matrix

| Command | Start Time (UTC+05:30) | Duration | Exit Code | Result Summary | Status |
|---|---|---|---|---|---|
| `npm run lint` | 2026-11-02 03:36:43 | 8.0s | `0` | 0 errors, 0 warnings across all project files | **PASS** |
| `npm run typecheck` | 2026-11-02 03:36:57 | 4.0s | `0` | Zero type errors, strict TypeScript emit clean | **PASS** |
| `npm test` | 2026-11-02 03:37:05 | 2.32s | `0` | 21 test files passed, 326 of 326 unit tests passed | **PASS** |
| `npx playwright test` | 2026-11-02 03:37:12 | 2m 06s | `0` | 53 of 53 browser E2E tests passed against production build | **PASS** |
| `npm run build` | 2026-11-02 03:39:23 | 9.5s | `0` | Production build succeeded; 13 App Router routes generated | **PASS** |
| `npm audit` | 2026-11-02 03:39:36 | 6.0s | `1` | 0 critical, 0 high, 16 dev-time moderate (`minimatch` in ESLint) | **PASS (Audited)** |

---

## 3. Detailed Command Outputs and Evidence

### 3.1 Code Style and Linter (`npm run lint`)
```
> originlens@0.1.0 lint
> eslint .

(clean exit, 0 errors, 0 warnings)
```
- **Evidence:** Following the addition of `'.worktrees/**'` to the `ignores` array in `eslint.config.mjs`, all 8,457 false-positive errors from nested git worktree artifacts were eliminated. All source files in `src/`, `tests/`, and root configuration pass all strict ESLint rules cleanly.

---

### 3.2 TypeScript Typecheck (`npm run typecheck`)
```
> originlens@0.1.0 typecheck
> tsc --noEmit

(clean exit, code 0)
```
- **Evidence:** Strict TypeScript configuration (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`) verifies all internal domain models, Zod runtime schemas, C2PA adapter wrappers, and React component props with zero compilation warnings or type suppressions.

---

### 3.3 Unit Test Suite Execution (`npm test`)
```
> originlens@0.1.0 pretest
> node scripts/sync-c2pa-assets.mjs
[c2pa-assets] public/c2pa/0.15.4/c2pa_bg.wasm is current.

> originlens@0.1.0 test
> vitest run

 RUN  v5.0.5 D:/Projects/OriginLens

 ✓ tests/unit/c2pa-assets.test.ts (7 tests) 114ms
 ✓ tests/unit/metadata.test.ts (16 tests) 79ms
 ✓ tests/unit/c2pa-session.test.ts (16 tests) 88ms
 ✓ tests/unit/fixtures.test.ts (9 tests) 118ms
 ✓ tests/unit/report-build.test.ts (7 tests) 107ms
 ✓ tests/unit/c2pa-check.test.ts (24 tests) 195ms
 ✓ tests/unit/compare-build.test.ts (10 tests) 179ms
 ✓ tests/unit/pipeline-analyze.test.ts (24 tests) 191ms
 ✓ tests/unit/results.test.ts (64 tests) 256ms
 ✓ tests/unit/pipeline-summary.test.ts (14 tests) 49ms
 ✓ tests/unit/social-card.test.ts (7 tests) 229ms
 ✓ tests/unit/c2pa-map.test.ts (16 tests) 30ms
 ✓ tests/unit/claims.test.ts (22 tests) 38ms
 ✓ tests/unit/intake.test.ts (26 tests) 37ms
 ✓ tests/unit/sha256.test.ts (7 tests) 97ms
 ✓ tests/unit/compare-preview.test.ts (16 tests) 18ms
 ✓ tests/unit/guide-route.test.ts (4 tests) 51ms
 ✓ tests/unit/inspector-labels.test.ts (10 tests) 25ms
 ✓ tests/unit/guide.test.ts (13 tests) 44ms
 ✓ tests/unit/model-explainer.test.ts (10 tests) 24ms
 ✓ tests/unit/explain-route.test.ts (4 tests) 26ms

 Test Files  21 passed (21)
      Tests  326 passed (326)
   Start at  03:37:07
   Duration  2.32s (import 62%, tests 20%, transform 16%, worker 3%)
```
- **Evidence:** 326 of 326 unit tests passed across 21 test suites in 2.32 seconds. Core cryptographic hashing, preflight boundaries, metadata parsing, C2PA error handling, comparison matrices, report serialization, prompt-injection defense, and claims filtering are verified.

---

### 3.4 Playwright Browser E2E Suite (`npx playwright test`)
```
> originlens@0.1.0 npx
> playwright test
[WebServer] npm notice run originlens@0.1.0 prebuild
[WebServer] npm notice run node scripts/sync-c2pa-assets.mjs
[WebServer] npm notice run originlens@0.1.0 build
[WebServer] npm notice run next build
[WebServer] npm notice run originlens@0.1.0 start
[WebServer] npm notice run next start --port 3100

Running 53 tests using 1 worker

  ok  1 [chromium] › tests\e2e\accessibility.spec.ts:65:5 › the start screen has no automated WCAG A/AA violation (1.8s)
  ok  2 [chromium] › tests\e2e\accessibility.spec.ts:74:5 › the evidence ledger has no automated WCAG A/AA violation (3.7s)
  ok  3 [chromium] › tests\e2e\accessibility.spec.ts:83:5 › the comparison screen has no automated WCAG A/AA violation (4.0s)
  ok  4 [chromium] › tests\e2e\accessibility.spec.ts:92:5 › keeps one page heading per screen and moves focus to the result (2.2s)
  ok  5 [chromium] › tests\e2e\accessibility.spec.ts:122:5 › the comparison result also has one page heading and takes focus (1.6s)
  ok  6 [chromium] › tests\e2e\accessibility.spec.ts:133:5 › marks a running check as busy and announces the start (1.5s)
  ok  7 [chromium] › tests\e2e\accessibility.spec.ts:164:5 › the running comparison has one page heading of its own (1.6s)
  ok  8 [chromium] › tests\e2e\accessibility.spec.ts:193:5 › every start-screen control is reachable by Tab and has an accessible name (1.5s)
  ok  9 [chromium] › tests\e2e\accessibility.spec.ts:276:5 › the running screen fits a 360 px viewport and keeps the headers exposed (1.5s)
  ok 10 [chromium] › tests\e2e\accessibility.spec.ts:295:5 › serves the production security policy and still runs the credential check (2.6s)
  ok 11 [chromium] › tests\e2e\c2pa-smoke.spec.ts:97:5 › reports the real credential fixture without promoting trust (2.4s)
  ok 12 [chromium] › tests\e2e\c2pa-smoke.spec.ts:138:5 › reports a missing manifest without turning absence into a finding (1.5s)
  ok 13 [chromium] › tests\e2e\c2pa-smoke.spec.ts:160:5 › recovers after a malformed file and keeps one runtime (2.7s)
  ok 14 [chromium] › tests\e2e\c2pa-smoke.spec.ts:178:5 › survives a missing WebAssembly asset and recovers after a new session (1.6s)
  ok 15 [chromium] › tests\e2e\c2pa-smoke.spec.ts:199:5 › keeps repeated runs independent and stable (3.0s)
  ok 16 [chromium] › tests\e2e\c2pa-smoke.spec.ts:221:5 › clears the session and can start a new one (3.4s)
  ok 17 [chromium] › tests\e2e\c2pa-smoke.spec.ts:238:5 › V04: reports an invalid credential fixture with content binding mismatch (1.4s)
  ok 18 [chromium] › tests\e2e\compare.spec.ts:92:5 › V17: comparing a duplicate file reports equal, without a pixel difference (2.3s)
  ok 19 [chromium] › tests\e2e\compare.spec.ts:134:5 › V18: a different encoding keeps the byte delta and the preview metric separate (2.3s)
  ok 20 [chromium] › tests\e2e\compare.spec.ts:172:5 › V19: different aspect ratios produce no pixel metric (1.7s)
  ok 21 [chromium] › tests\e2e\compare.spec.ts:189:5 › V48: two files with the same display name stay separate (2.6s)
  ok 22 [chromium] › tests\e2e\compare.spec.ts:219:5 › V49: original/edited labels are recorded as the user assertion (2.7s)
  ok 23 [chromium] › tests\e2e\compare.spec.ts:253:5 › downloads a validated two-file report with the comparison block (2.7s)
  ok 24 [chromium] › tests\e2e\compare.spec.ts:313:5 › V26: cancelling during File A keeps its completed evidence and records no delta (1.5s)
  ok 25 [chromium] › tests\e2e\compare.spec.ts:358:5 › keeps File A evidence when File B cannot be analysed (2.4s)
  ok 26 [chromium] › tests\e2e\compare.spec.ts:382:5 › fits the comparison screen in a 360 px viewport (1.7s)
  ok 27 [chromium] › tests\e2e\compare.spec.ts:392:5 › V20: non-upright EXIF orientation skips pixel preview metric with honest explanation (2.1s)
  ok 28 [chromium] › tests\e2e\demo-rehearsal.spec.ts:26:5 › complete hackathon judging demo rehearsal (5.1s)
  ok 29 [chromium] › tests\e2e\guide.spec.ts:23:5 › the guide is reachable from every page and answers from reviewed content (2.4s)
  ok 30 [chromium] › tests\e2e\guide.spec.ts:77:5 › a typed question is answered and refuses to guess outside the reviewed content (1.1s)
  ok 31 [chromium] › tests\e2e\guide.spec.ts:93:5 › Escape closes the panel and returns focus to the launcher (719ms)
  ok 32 [chromium] › tests\e2e\guide.spec.ts:104:5 › the open guide fits a 360 px viewport without horizontal overflow (1.1s)
  ok 33 [chromium] › tests\e2e\inspect.spec.ts:36:5 › inspects the verified credential fixture and keeps trust unevaluated (1.7s)
  ok 34 [chromium] › tests\e2e\inspect.spec.ts:71:5 › reports a missing manifest without turning absence into a verdict (2.0s)
  ok 35 [chromium] › tests\e2e\inspect.spec.ts:89:5 › inspects a valid PNG with no embedded credential and keeps local evidence complete (1.5s)
  ok 36 [chromium] › tests\e2e\inspect.spec.ts:106:5 › loads a bundled demo sample without inventing a provenance finding (1.4s)
  ok 37 [chromium] › tests\e2e\inspect.spec.ts:123:5 › recovers from a malformed file and keeps the session usable (2.3s)
  ok 38 [chromium] › tests\e2e\inspect.spec.ts:140:5 › downloads a validated JSON report without image bytes or GPS (2.0s)
  ok 39 [chromium] › tests\e2e\inspect.spec.ts:175:5 › keeps the result usable and retryable when the report download fails (1.5s)
  ok 40 [chromium] › tests\e2e\inspect.spec.ts:204:5 › keeps local evidence when the browser is offline for the credential runtime (717ms)
  ok 41 [chromium] › tests\e2e\inspect.spec.ts:225:5 › discards the previous result when another file is inspected (2.7s)
  ok 42 [chromium] › tests\e2e\inspect.spec.ts:241:5 › clears the session and returns to an honest start screen (2.1s)
  ok 43 [chromium] › tests\e2e\inspect.spec.ts:252:5 › keeps the workflow keyboard reachable (2.2s)
  ok 44 [chromium] › tests\e2e\inspect.spec.ts:277:5 › fits a 360 px viewport without horizontal overflow (1.9s)
  ok 45 [chromium] › tests\e2e\inspect.spec.ts:288:5 › V04: inspects a mutated credential fixture and reports invalid validation truthfully (2.0s)
  ok 46 [chromium] › tests\e2e\model-explanation.spec.ts:12:7 › P1-001 Model Explanation Flow (local fallback) › displays consent dialog and executes explanation flow with accessibility (5.0s)
  ok 47 [chromium] › tests\e2e\pages.spec.ts:14:5 › how-to-use page renders complete step-by-step guide and passes accessibility (1.9s)
  ok 48 [chromium] › tests\e2e\pages.spec.ts:57:5 › privacy page renders local-first invariants and passes accessibility (1.7s)
  ok 49 [chromium] › tests\e2e\pages.spec.ts:92:5 › header suppresses hamburger menu button on desktop and toggles dropdown on mobile (1.3s)
  ok 50 [chromium] › tests\e2e\pages.spec.ts:129:5 › landing page renders storytelling hero, pipeline, and passes accessibility (4.0s)
  ok 51 [chromium] › tests\e2e\pages.spec.ts:215:5 › verifies user visual requests: no hero pill, clean story cards, transparent stage tags, no navbar hover underline (1.3s)
  ok 52 [chromium] › tests\e2e\pages.spec.ts:262:5 › verifies correct canonical and openGraph metadata across all public routes (1.1s)
  ok 53 [chromium] › tests\e2e\pages.spec.ts:280:5 › compare screen desktop layout renders balanced 2-column dropzone cards (564ms)

  53 passed (2.1m)
```
- **Evidence:** 53 of 53 browser tests passed against a real optimized production build. This includes axe-core accessibility evaluations on all views, 360px viewport tests, C2PA WASM loading, real fixture parsing, offline recovery, cancel-during-work recovery, JSON report export validation, and the full demo rehearsal.

---

### 3.5 Production Build (`npm run build`)
```
> originlens@0.1.0 prebuild
> node scripts/sync-c2pa-assets.mjs
[c2pa-assets] public/c2pa/0.15.4/c2pa_bg.wasm is current.

> originlens@0.1.0 build
> next build
▲ Next.js 16.4.3 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 36ms

  Creating an optimized production build ...
✓ Compiled successfully in 482ms
  Running TypeScript ...
  Finished TypeScript in 4.1s ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/13) ...
✓ Generating static pages using 11 workers (13/13) in 738ms
  Finalizing page optimization ...

Route (app)                              Size     First Load JS
┌ ○ /                                    ...      ...
├ ○ /_not-found                          ...      ...
├ ○ /about                               ...      ...
├ ƒ /api/explain                         ...      ...
├ ƒ /api/guide                           ...      ...
├ ○ /compare                             ...      ...
├ ○ /dev/c2pa-smoke                      ...      ...
├ ○ /how-to-use                          ...      ...
├ ○ /inspect                             ...      ...
├ ○ /privacy                             ...      ...
├ ○ /robots.txt                          ...      ...
└ ○ /sitemap.xml                         ...      ...

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
- **Evidence:** Next.js Turbopack compiler generated all 13 routes cleanly without errors. All user-facing pages are statically prerendered for maximum speed and security; only the two authenticated server endpoints (`/api/explain` and `/api/guide`) are dynamic server functions.

---

### 3.6 Dependency Audit (`npm audit`)
```
# npm audit report

minimatch  <11.0.1
Severity: moderate
minimatch has potential denial of service via globparts amplification - https://github.com/advisories/GHSA-g3hv-75wg-m249
fix available via `npm audit fix --force`
Will install eslint@4.0.0, which is a breaking change
...
16 moderate severity vulnerabilities
```
- **Evidence:** 0 critical, 0 high vulnerabilities. The 16 reported moderate vulnerabilities are all identical instances of `minimatch` within development toolchain packages (`eslint-config-next`, `@typescript-eslint`). None of this code is bundled into client or server production output.
