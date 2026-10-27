# OriginLens — Decisions (ADRs)

Material decisions with source, date, and consequence. Newest first.

---

## ADR-009 — Production-only CSP with a Blob worker, and an explicit focus/announcement model

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

PRD §8 requires security headers to be tested rather than asserted, and PRD §5.6 requires that colour is never the only result signal, that every control has an accessible name with visible focus, that status changes are announced "without flooding announcements", and that narrow widths work without horizontal overflow.

Two constraints made the obvious implementations wrong:

1. **CSP versus static prerendering.** The app is fully prerendered (`/`, `/_not-found`, `/dev/c2pa-smoke` are static). A nonce-based `script-src` requires a per-request nonce, which a static page cannot have. Next.js also inlines its hydration bootstrap.
2. **The pinned C2PA runtime.** `@contentauth/c2pa-web@0.15.4` builds its worker from a `Blob` URL and compiles WebAssembly. A policy without `blob:` worker sources or without a WebAssembly permission would break the only real credential check, and a policy relaxed until it passes proves nothing.

For accessibility, the running screen had no `h1` at all, a completed run replaced the progress panel without telling assistive technology, and the narrow-width delta tables removed `<thead>` with `display: none`, discarding the column-header association exactly when the table stacks.

### Decision

1. **CSP is production-only.** `next.config.ts` returns security headers only when `NODE_ENV === 'production'`. The development server relies on inline/eval-based hot reloading; relaxing the shipped policy to accommodate dev tooling would stop it describing the app. This is a documented limitation, not a claim that dev is covered.
2. **Directives, with reasons.**
   - `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` — `'unsafe-inline'` is the accepted cost of the inlined bootstrap; `'wasm-unsafe-eval'` permits WebAssembly compilation; **`'unsafe-eval'` is deliberately not granted.**
   - `worker-src 'self' blob:` / `child-src 'self' blob:` — the C2PA worker is created from a Blob URL.
   - `connect-src 'self'` — the app contacts no other origin. This is the browser-level enforcement of "no external image transmission", so a future provider adapter must add its own reviewed origin rather than inheriting one.
   - `object-src 'none'`, `frame-ancestors 'none'`, `frame-src 'none'`, `base-uri 'self'`, `form-action 'none'`, `media-src 'none'`.
   - Plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.
3. **The policy is verified, not described.** The E2E suite asserts the shipped header values *and* runs a real credential inspection against `adobe-20220124-C.jpg` in the same test, failing on any `pageerror` or CSP refusal. A directive that breaks the runtime fails a test.
4. **One page heading per screen.** A single-file run uses the progress panel's title as the `h1`; a comparison renders its own page `h1` ("Comparing two files") and each file panel stays at `h2`. Every result screen has exactly one `h1`, asserted end-to-end.
5. **Announce transitions, not every render.** A persistent polite live region inside `<main>` carries one message per session transition ("Analysis started.", "Analysis complete…", "Comparison complete…", or the idle notice). Stage-by-stage progress keeps its own `aria-live` region in the progress panel, which also gains `aria-busy` while any stage is queued or running.
6. **Focus follows new content.** On a `running → ready`/`readyCompare` transition, focus moves to the result heading, which carries `tabIndex={-1}`. Changing a user original/edited label afterwards never moves focus. Error panels use `role="alert"`.
7. **Stacked tables keep their headers.** At narrow widths the delta tables switch to a stacked layout, but `<thead>` is clipped rather than `display: none`, so `scope`-based column and row header associations survive, with `data-column` supplying the visual label.
8. **Automated audit is real, and bounded.** `@axe-core/playwright@4.14.0` (axe-core 4.14.0, MPL-2.0, devDependency only) runs the WCAG 2.0/2.1 A+AA tag sets against the start screen, the evidence ledger, and the comparison screen in the production build.

### Consequences

- The shipped app has a tested CSP; the dev server does not have one, and that is stated rather than implied.
- Any new asset host, worker source, or third-party script requires a CSP change plus a re-run of the security-policy spec.
- `'unsafe-inline'` in `script-src` means the policy is not a strict CSP. It is reported as such; switching to nonces would require giving up fully static prerendering.
- axe covers only automatically detectable rules. Passing it is evidence, not a certification, and manual review remains Phase 9 work.
- The accessibility model is asserted structurally (heading counts, focus target, live-region text, tab stops with visible focus), so a regression fails a test instead of depending on review.

### Rollback

Remove `headers()` from `next.config.ts` to drop the policy (and the security-policy spec with it). The accessibility changes are independent of the CSP and can be kept on their own.

---

## ADR-008 — Provenance Delta is recorded as one `comparison` check plus an additive report block

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

PRD §9.6 fixes the report contract around one or more files, each with its own checks and evidence, but does not define how a two-file Provenance Delta is represented. Two failure modes had to be avoided:

1. Attaching the delta to one file, which would read as "this file's result" and quietly imply an ordering or a primary file.
2. Adding a second copy of the comparison facts (one in the check evidence, one in a bespoke block) that could disagree with the check.

PRD §5.5 also requires the delta to compare only recorded properties and to keep a skipped measurement explicitly skipped. The PRD says a report summary must not overstate what was established, but report-level `summaryCodes` are a single list, so a two-file report needs a rule for combining per-file summaries.

### Decision

1. **One check, owned by neither file.** The delta is a single `CheckResult` with `kind: 'comparison'` and **no** `fileId`. All of its evidence items carry `sourceCheckId` equal to that check's `checkId`, so every comparison statement resolves to the same place as any other check. The comparison checker is recorded as `originlens-provenance-delta` with the app version.
2. **Additive report block.** `reportSchema` gains an optional `comparison` object containing `fileIds` (a two-element tuple in report file order), `checkId`, `metadataFields`, and `preview`. It is **required** when the report has two files and **forbidden** when it has one. The schema version stays `2.0`: the field is additive and optional, single-file reports are byte-for-byte unchanged in shape, and no existing field changes meaning.
3. **Cross-references are enforced.** The report super-refinement requires exactly one `comparison` check, requires `comparison.checkId` to reference it, requires that check to have no `fileId`, and requires `comparison.fileIds` to equal the report's file order. `buildReport` fails closed with `PIPELINE_CONTRACT_VIOLATION` on any violation, as it already did for duplicate IDs.
4. **Session summary = intersection.** A two-file report lists a summary code only when every file's own `summaryCodes` contains it, so the report never claims one file's finding on behalf of both. `COMPARISON_SUMMARY_DISCLAIMER` states this and points readers at the per-file ledgers. `COMPARISON_REPORT_DISCLAIMER` states that the delta identifies neither an original nor an edited file.
5. **Outcome precedence.** `different` when any compared property differs; otherwise `inconclusive` when any compared input was not evaluated; otherwise `equal`. A preview skip counts as a gap **except** `identical_fingerprint` (the measurement would be redundant) and `aspect_ratio_mismatch` (stretching or cropping would invent a difference). A skipped preview is recorded as `skipped` with a stable reason and is never reported as a difference of zero.
6. **Metadata states are explicit.** Each allowlisted field is `equal`, `different`, `absent_from_both`, `present_only_in_first`, `present_only_in_second`, or `not_evaluated`. `present_only_in_*` is deliberately distinct from `different`: one file not recording a field is not the same as two files disagreeing about it.

### Consequences

- Every V17–V20, V48, V49 assertion can be read from the report without re-deriving the delta from prose.
- A consumer of schema `2.0` must tolerate the optional `comparison` field; nothing about single-file reports changes.
- The delta cannot exist without its check, and the check cannot exist without the delta, so the two cannot drift.
- A failed or cancelled File B produces no `comparison` block at all: the surviving File A result exports as an ordinary single-file report (asserted end-to-end).
- Adding a second comparison check, or attaching one to a file, is rejected by the runtime schema rather than rendered.

### Rollback

Drop the `comparison` block and export per-file reports only. That removes the report's record of the delta, so the UI could still show it but the exported artifact would no longer be auditable against the PRD §5.5 requirement.

---

## ADR-006 — Phase 5 pipeline: injected stages, PRD cancellation mapping, fail-closed report IDs

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

Phase 5 needed one orchestration path that is deterministic enough to unit-test in Node, while the real C2PA check requires a browser, WebAssembly, and a worker. The PRD also fixes two semantics that are easy to get wrong: execution state must never be confused with an outcome (PRD §9.1, §12), and report identifiers must be unique and cross-referenced (PRD §9.6). PRD §12.2 (line 797) states that work which never started is `skipped`, and only a check that started and was interrupted is `cancelled`.

### Decision

1. **Dependency injection.** `runFileAnalysis(input, deps)` receives every side-effecting operation (`readHeader`, `decodeDimensions`, `readBytes`, `sha256`, `inspectMetadata`, `inspectC2pa`, `createId`, `now`) through `AnalyzeDependencies`. `src/lib/pipeline/browser.ts` supplies the browser implementations; `tests/unit/helpers/pipeline-harness.ts` supplies deterministic fakes with a monotonic clock and sequential IDs. Unit tests therefore assert call order and inputs without mocking modules.
   - A defect found by these tests: the metadata stage called the module-level `inspectMetadata` directly instead of `deps.inspectMetadata`, which made the injected seam a lie. It is fixed, and the call-order test fails if any stage bypasses `deps` again.
2. **Cancellation.** Unstarted stages are recorded as `skipped` with an explicit limitation. Only the C2PA check, which can actually be interrupted, may be `cancelled`. Cancellation before a fingerprint exists returns `{ status: 'cancelled' }` with no ledger, because a `FileRecord` without a real SHA-256 would have to invent one. Cancellation after it keeps the partial ledger.
3. **Summary precedence** (`summarize`): validation issue → verified evidence → no supported credentials → execution gap → `evidence_incomplete` fallback. "No supported embedded credentials" requires a completed `not_present` credential check; a failed, skipped, cancelled, unknown, or unsupported check can never produce it. `summarize` requires the findings array alongside the checks, so a manifest-present-but-unverifiable file cannot be reported as absent.
4. **Report identity.** `buildReport` fails closed with `PIPELINE_CONTRACT_VIOLATION` on duplicate file/check/evidence/report identifiers, on an empty or oversized file set, or on any `reportSchema` violation. Report filenames derive only from `createdAtUtc`, never from a user-supplied name.
5. **Progress honesty.** Stage events carry only `stage`, `executionState`, optional `outcome`, and optional `errorCode`. There is no percentage field, because no stage reports one.

### Consequences

- Domain logic is testable without a browser; the real browser path is covered separately by Playwright E2E.
- Any new stage must add a dependency to `AnalyzeDependencies`, a browser implementation, and a harness fake; skipping that makes the call-order test fail rather than silently bypassing injection.
- Callers must read `status` (`ok` / `error` / `cancelled`) before touching `analysis`; a cancelled run may legitimately carry no ledger.
- A contract violation is surfaced as a safe error, never as a partial or best-effort report.

### Rollback

Replace the injected functions with direct imports and test through the browser only. That loses deterministic Node coverage of ordering, cancellation, and contract enforcement, so it should not be done without an equivalent replacement.

---

## ADR-007 — Committed PNG fixture is generated by a stored-deflate encoder

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

V02 needs a valid PNG with no embedded credential. Options were: download a public PNG (unknown provenance, drifting bytes, licence questions), check in an opaque binary with no reproducible origin, or generate one in the repository. The fixture manifest pins byte length and SHA-256 for every stored fixture, so regeneration must be byte-identical across machines.

### Decision

`tests/fixtures/generate-plain-png.mjs` writes `tests/fixtures/c2pa/plain-3x2.png` (3 × 2, truecolour RGB, no ancillary chunks) using the PNG signature, `IHDR`, a **stored** (uncompressed) deflate `IDAT` block, and `IEND`. Stored blocks avoid any dependency on the local zlib build, so the bytes are reproducible. The script prints the byte length and SHA-256 that are recorded in `tests/fixtures/manifest.json` (schema 1.3), and `tests/unit/fixtures.test.ts` re-hashes the committed file.

Phase 6 added a second encoding from the same generator: `tests/fixtures/c2pa/plain-3x2-filtered.png` writes the same pixel grid with PNG filter type 1 (Sub) on each scanline. It is the same 88 bytes long but has a different SHA-256, and `tests/unit/helpers/png-pixels.ts` — an independent scanline decoder used only by the fixture test — proves both files decode to identical pixels. That pair is what V18 needs: a real byte difference beside a preview metric of zero, with neither figure able to explain the other.

### Consequences

- The fixture has a fully documented origin and can be regenerated on any machine.
- It contains no metadata and no C2PA manifest; that is the point of V02, and it is not evidence about any real image.
- Changing the pixel pattern, dimensions, or encoder changes the hash, so the manifest entry must be updated in the same change.

### Rollback

Replace the fixture with an official, licence-cleared PNG; record its source URL, retrieval date, licence text, byte length, SHA-256, and the reference tool used to establish its expected behaviour.

---

## ADR-005 — Signer trust and revocation are `not_evaluated` unless the SDK establishes them

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

`c2pa-web@0.15.4` evaluates signer trust only against trust anchors supplied to it. This build supplies none and performs no network trust or revocation lookup, so the pinned SDK reports `signingCredential.untrusted` for *every* credential — including the public Adobe test fixture whose signature, timestamp, and content binding are all valid. The recorded output confirms this: total unique codes are 8, of which `signingCredential.untrusted` is the sole failure-group entry, alongside `signingCredential.ocsp.skipped`.

Mapping that SDK code to `not_trusted` would assert a negative trust finding the build cannot establish. The absence of configured anchors says nothing about whether the signer is trustworthy. PRD FR-006 and `AGENTS.md` §5 forbid collapsing these states, and forbid presenting a missing resource as a negative conclusion.

### Decision

`src/lib/c2pa/check.ts` derives signer trust as follows:

- `trusted` **only** when `validation_state === 'Trusted'` or a **success-group** `signingCredential.trusted` code is present.
- `not_evaluated` otherwise. This build never emits `not_trusted`, because it has no anchor material with which to reach that conclusion.
- Revocation is `revoked` only on an explicit revoked code, `not_revoked` only on an explicit `signingCredential.ocsp.good`, and `not_evaluated` otherwise.
- Every finding records `trustPolicyId: originlens-embedded-only-no-trust-anchors-v1`, and when `signingCredential.untrusted` is present the check carries a warning stating that the SDK reports every credential as untrusted because no anchors are configured.
- Positive states (`valid`, `trusted`, `not_revoked`) require the SDK's own success group; a failure code may only produce a negative state.

### Consequences

- The UI may never show a "trusted signer" badge for the shipped fixtures, and the demo script must say "signature valid; signer trust not evaluated".
- The trust policy is visible in the report, so a reader can tell what was and was not checked.
- Tests pin the behavior: recorded fixture → `not_evaluated`; synthetic `Trusted` state and success code → `trusted`; untrusted-only → `not_evaluated`.

### Rollback

Configuring real trust anchors (or a trust-list fetch) requires: anchor/licensing provenance, a disclosure and consent decision for any network lookup, updated `C2PA_LIMITATIONS`, new trust-policy ID, and rewritten tests. Until then the no-anchor policy stays.

---

## ADR-004 — Pinned C2PA WebAssembly is served same-origin and verified at build time

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

`@contentauth/c2pa-web@0.15.4` compiles a 9.0 MB WebAssembly module inside a worker. `createC2pa({ wasmSrc })` requires an explicit URL, and its `workerSrc` option requires an `https:` URL; the SDK's default worker is an inline blob worker that needs no external worker file. PRD §8 and `AGENTS.md` §10 forbid unpinned CDN/runtime assets, and a third-party script origin would complicate CSP and supply-chain review.

### Decision

1. `scripts/sync-c2pa-assets.mjs` copies `node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm` to `public/c2pa/0.15.4/c2pa_bg.wasm`, refusing to write unless the installed package version, the WASM SHA-256 (`01b8e25f…9858df`), and the SHA-512 SRI the SDK itself verifies all match the constants in `src/lib/c2pa/asset.ts`.
2. The script runs as `predev`, `prebuild`, and `pretest`, so a version bump or partial install fails loudly instead of validating with different bytes.
3. The runtime is created with only `wasmSrc` (same-origin path); no `workerSrc` is supplied, so the inline blob worker is used.
4. `tests/unit/c2pa-assets.test.ts` re-verifies the pin from disk and asserts the SRI string is present inside the installed SDK bundle, so the declared integrity value cannot drift from the shipped code.

### Consequences

- The browser fetches the WASM from this origin only; no CDN, no third-party script origin, and CSP work later has fewer exceptions to justify.
- The 9.0 MB binary is committed under `public/`. This is an accepted repository-size cost for a reproducible, same-origin runtime.
- Upgrading `c2pa-web` is a coordinated change: pin, `asset.ts` constants, sync script constants, fixtures, recorded SDK output, and trust-policy review.
- CSP is still not configured; it remains a Phase 7/9 item (see `plan.md`).

### Rollback

Point `wasmSrc` at a self-hosted path served by infrastructure, or bundle the asset through the framework's asset pipeline; either way the version, SHA-256, and SRI checks must remain in place.

---

## ADR-003 — GPS presence is reported, coordinates are never extracted

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

PRD FR-004 requires GPS to be hidden by default, with an optional reveal path. ExifReader can parse GPS rational values. Keeping coordinates out of the domain model is stricter than "hidden by default" and removes an entire class of accidental disclosure paths (UI, logs, exports, model payloads).

### Decision

`src/lib/metadata/inspect.ts` reports only `gpsPresence: 'present' | 'not_present' | 'unknown'`. It never copies GPS coordinate values into `MetadataInspection`, evidence items, logs, or reports. The report schema fixes `includedPreciseGps` to `false`.

### Consequences

- Users cannot view coordinates in this build; this is a documented limitation, not a missing feature that silently degrades.
- Any future reveal path requires an explicit product decision, consent design, redaction tests, and report/schema changes before implementation.
- `tests/unit/metadata.test.ts` asserts that serialized output contains no GPS coordinate keys or values.

### Rollback

Restore an explicit, consent-gated coordinate field in a future schema version; do not add it to the current `2.0` contract.

---

## ADR-002 — Phase 4 parser and toolchain pins

**Date:** 2026-10-27
**Status:** ACCEPTED
**Deciders:** project owner (participant) + implementation agent

### Context

Phase 4 needs a browser-compatible metadata parser, an exact-pinned toolchain, and ESLint compatible with the Next.js config. The PRD requires exact pins for critical SDKs and a lean dependency tree. Versions were read from npm registry metadata (`npm view`) on 2026-10-27, not from memory.

### Findings

- `exifreader@4.52.0` is maintained, ships browser ESM and TypeScript declarations (`exif-reader.d.ts`), and is MPL-2.0. `exifr` was last published in 2022 and is not maintained for this use.
- `eslint-config-next@16.4.3` bundles `eslint-plugin-import@2.32.0`, `eslint-plugin-jsx-a11y@6.10.2`, and an `eslint-plugin-react` whose peer ranges stop at ESLint 9. ESLint 10 therefore produces invalid peer resolutions. `eslint@9.39.5` is the newest compatible release; npm flags it as no longer supported, and `npm audit` reports 0 vulnerabilities.
- `typescript-eslint` (via the Next config) declares a TypeScript peer `<6.1`; `typescript@5.9.3` is used instead of the newer 7.x line.
- `exifreader`'s postinstall (`node bin/build.js --only-with-config`) is a no-op without a dependent config; the shipped `dist/exif-reader.js` is used. No custom build is requested.
- Vitest 5.0.5 + Vite 8.3.5 run the unit suite in a Node environment; the config is `.mts` so Vite does not warn about ESM syntax in a CommonJS-loaded file.

### Decision

Pin `exifreader@4.52.0`, `typescript@5.9.3`, `eslint@9.39.5`, `vitest@5.0.5`, `vite@8.3.5`, and the Next/React versions recorded in `package.json`. Commit `package-lock.json`. Assert the installed ExifReader version in a unit test.

### Consequences

- ESLint 9 is EOL-flagged; re-evaluate when `eslint-config-next` raises its bundled plugin peer ranges. Do not suppress the deprecation warning.
- No broad upgrades alongside unrelated features; re-audit before submission.
- The synthetic EXIF fixture's expected values are tied to ExifReader 4.52.0 and must be re-verified on upgrade.

### Rollback

Replace the parser behind `inspectMetadata` without changing its output contract; re-run the metadata tests and update the fixture manifest if bytes or expectations change.

---

## ADR-001 — P1-001 Meta-model explanation: server-side Meta Model API, Standard tier, evidence-only payload

**Date:** 2026-10-27
**Status:** PROPOSED / **BLOCKED** by Phase 1 compliance gate (`compliance-checklist.md`)
**Deciders:** project owner (participant) + implementation agent

### Context

PRD §10 defines an optional model layer that explains already-validated evidence. The official quickstart (accessed 2026-10-27) documents an OpenAI-compatible Responses API at `https://api.meta.ai/v1` with model ID `muse-spark-1.3` and `MODEL_API_KEY` authentication. The ToS (updated 2026-10-09) requires 18+ accounts/End Users, forbids under-18 targeting, restricts key sharing, and distinguishes Standard (no training on content) from Contributor (content may train models) services. The event page promotes Meta models but the Official Rules (mandatory vs. optional) are not yet confirmed.

### Options considered

| Option | Verdict |
|---|---|
| A. Server route → Meta Model API **Standard** `muse-spark-1.3` (OpenAI SDK, Responses API) | **Chosen (when gate is green).** No training on content; smallest compliant surface; documented API. |
| B. Contributor variant `muse-spark-1.3-contributor` | Rejected for product data: content may be used for training; ToS §6.2 forbids submitting sensitive/confidential/personal information. |
| C. Open-weight model via Baseten/Modal/Fireworks credits | Deferred. Not equivalent to a Muse Model API integration (PRD §10.5); event partner credits are unconfirmed for this participant. |
| D. Deterministic templates only | Current default until the gate is green. Always retained as fallback. |
| E. Browser → API directly | Rejected: exposes the key, violates key-confidentiality terms, breaks CSP/security rules. |

### Decision

When (and only when) the Phase 1 gate is green and P0 is stable:

1. **Route:** Next.js server route handler `src/app/api/explain/route.ts`, same-origin only, `POST` JSON only.
2. **SDK/client:** official `openai` Node SDK, `baseURL: https://api.meta.ai/v1`, model `muse-spark-1.3` (re-verify model ID in `/docs/models` at implementation time; never hard-code an unverified name).
3. **Auth:** `MODEL_API_KEY` in server-only env (`.env.local`, gitignored); `.env.example` holds a placeholder only. Never `NEXT_PUBLIC_*`.
4. **Input:** only the validated evidence summary — report schema version, check codes/outcomes, evidence IDs, bounded allowlisted values, warnings, limitations. **Never** image bytes, previews, precise GPS, raw metadata, manifest payloads, filenames beyond sanitized display strings, secrets, or prompt text.
5. **Bounds:** request body ≤ 64 KiB; ≤ 120 evidence items; each text value ≤ 500 chars; system+user prompt ≤ 24k chars; `max_output_tokens` ≈ 800; server timeout 20 s.
6. **Tier:** Standard mode. If the account is a Coding Harness Subscription, a subscription key may **not** be reused for the app (ToS §3.2); a separate Model API key/credits are required.
7. **Retries:** none for 400/401/403/404; one bounded retry with exponential backoff + jitter for 429/5xx, honoring `Retry-After`. No retry storms.
8. **Output validation:** Zod schema; every `evidenceId` must exist in the submitted report; unknown fields/claims reject the whole response; deterministic template fallback on any failure.
9. **Disclosure:** explicit "Explain this report" button after a privacy notice naming Meta Model API, data categories, purpose, and retention limits; no automatic call; label output "AI-generated explanation"; model cannot modify check outcomes, add findings, or promote trust.
10. **Logging:** log only status code, duration, and stable error codes — never the payload, evidence values, or key.

### Consequences

- Requires a Node/server deployment target (not static-only); if only static hosting is available, keep the feature disabled.
- Adds one external dependency (`openai`) at implementation time; pin exact version, lockfile, audit.
- The deterministic report remains the sole source of authority; the model layer is removable without changing evidence semantics.
- If the compliance gate never clears, no model route is shipped and no model use is claimed.

### Rollback

Feature flag `MODEL_EXPLANATION_ENABLED` (default `false`); deleting the route and flag restores the deterministic MVP. No evidence contract changes are involved.

### Open questions

1. Participant eligibility/authorized access (own Model API key, 18+ account).
2. Official Rules: is a Meta model integration required?
3. Standard tier confirmed in the account/dashboard.
4. Jurisdiction not in the Restricted Territories.
5. Exact model ID/version at implementation time (catalog may change).
