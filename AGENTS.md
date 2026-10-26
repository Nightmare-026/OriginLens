# OriginLens — Agent Engineering Rules

**Purpose:** Execute `OriginLens_PRD.md` (which *is* the Audited Product Specification v2.0) in small, verifiable phases without losing requirements, weakening security, inventing results, violating hackathon/provider rules, or damaging working code.

**Authority:** The PRD is the product and acceptance source of truth. Current official hackathon rules, applicable law, provider terms, and official versioned technical documentation take precedence where they impose stricter requirements. If two authoritative sources conflict or a blocking compliance fact cannot be established, stop **only** the affected workstream, document the conflict, and ask the user/organizer a specific question. Never silently choose the convenient interpretation.

**Normative terms:** `MUST` / `MUST NOT` = release-critical; `SHOULD` / `SHOULD NOT` = default practice unless an explicit reason is documented; `MAY` = optional. These rules bind every agent and sub-agent session.

---

## 0. Repository state (verified 2026-10-27)

- The repo root contains exactly two files: this `AGENTS.md` and `OriginLens_PRD.md` (~1,100 lines; title inside reads "OriginLens — Audited Product Specification v2.0"). Phase 0 artifacts live under `docs/implementation/`. Older references to `OriginLens_PRD_v2_Audited.md` are stale — always open `OriginLens_PRD.md`.
- **There is no application code yet**: no package.json, README, tests, CI, or `.git`. Phase 0 docs now exist under `docs/implementation/` (`plan.md`, `compliance-checklist.md`, `decisions.md` ADR-001, `requirements-traceability.md`, `verification-log.md`, `p1-001-model-explanation-plan.md`) — keep them current. No Meta API call is implemented; P1-001 is **BLOCKED** pending the Phase 1 gate. A fresh session MUST still read the entire PRD before planning.
- **Not a git repository.** `git status`/`git diff` safety checks cannot run until one is initialized — state that honestly instead of fabricating a baseline. If git is added later, preserve any uncommitted user work.
- Development platform is **Windows; shell is PowerShell**. Quote paths containing spaces; write commands accordingly.
- Nothing is installed. The PRD's recommended stack (Next.js + React + TypeScript, pinned `@contentauth/c2pa-web`, PRD §8) must be verified against current official docs before scaffolding.
- When scaffolding, define the PRD §19-required scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `audit`.
- PRD landmarks: §3 P0/P1/P2 scope (FR-001…FR-015, P1-001…P1-004), §14.4 the V01–V50 acceptance matrix, §19 the PRD's own coding-agent instructions, §21 the official-reference snapshot (dated 26 Oct 2026 — re-verify anything dynamic).

## 1. Product semantics — non-negotiable

Build **OriginLens, Evidence-First Media Provenance Explorer**: inspect supported image provenance evidence and compare two user-supplied images. Central values:

1. **Evidence Ledger** — every user-visible finding traces to an actual check and a structured evidence item.
2. **Provenance Delta** — compare two independent files without guessing origin, chronology, authorship, or scene truth.
3. **Honest uncertainty** — show what was checked, not checked, failed, unsupported, and what the evidence does not establish.

The app is **not** a universal AI detector, forensic certification product, truth detector, creator-identification service, or real/fake classifier.

MUST NOT:
- Present missing C2PA credentials or missing metadata as proof an image is human-made or fake.
- Treat manifest presence, successful parsing, signature validity, content binding, timestamp/revocation checks, and signer trust as interchangeable.
- Infer tampering, intent, chronology, fraud, identity, ownership, or scene truth from a hash or pixel difference alone.
- Convert unknown / skipped / unavailable / unsupported / inconclusive / failed / not-evaluated checks into a success or negative finding.
- Fabricate any SDK/provider result, test outcome, benchmark, access grant, model use, "verified" badge, or passed test.
- Implement P1/P2 features while release-critical P0 requirements or compliance blockers remain unresolved, unless the user explicitly reprioritizes.

## 2. Source-of-truth hierarchy and research discipline

Decision order: (1) applicable law, current official hackathon rules/terms for the specific service/model; (2) the complete PRD v2.0 including appendices, acceptance tests, risk register, demo script, coding-agent instructions (§19); (3) current official docs and exact installed-version type declarations; (4) existing repo behavior/tests/lockfile/patterns; (5) reputable references (OWASP, MDN); (6) community posts only as leads, never as proof.

- Read the **entire** PRD before planning. Never rely on search snippets, chat summaries, or a few headings; if it is missing, ask for the path.
- Re-check documentation at the start of each major workstream (APIs, versions, platform policy, event rules can change).
- Record material decisions in `docs/implementation/decisions.md` with exact URL, version, access date, finding, decision.
- Never invent SDK methods, endpoints, env vars, quotas, credits, model availability, or provider guarantees. Mark unsupported claims **unverified** and use a safe fallback.
- Do not copy another project's implementation/UI/assets wholesale; preserve license notices; record third-party assets.

## 3. Repo-safety protocol (before every change set)

1. Inspect structure, package manager, scripts, env-example files, existing instruction files.
2. Run `git status`/diff **if git exists**; preserve uncommitted user work — never discard, overwrite, reset, stash, or reformat unrelated changes without permission.
3. Read the relevant implementation and tests first; trace imports, callers, schemas, state flow, resource lifecycle.
4. Write a short task plan: requirement IDs, files to change, indirect impacts, acceptance tests, risks, verification commands.
5. Establish a baseline with existing checks where feasible; separate pre-existing failures from regressions.
6. Make the smallest coherent change; prefer incremental reviewable patches over rewrites.
7. Before finishing, inspect the full diff for unrelated churn, secrets, debug code, dead paths, stale docs, incomplete TODOs; rerun affected checks.

Never delete a file just because it looks unused — prove reachability first. Never run destructive commands, rewrite history, rotate credentials, deploy, publish, or submit to the hackathon without explicit user authorization.

## 4. Phase-gated execution workflow

Execute in order; each phase has a **gate** — never claim a phase complete without its evidence. Track status in `docs/implementation/plan.md` as `NOT STARTED` / `IN PROGRESS` / `BLOCKED` / `PASS` / `FAIL`; a skipped item needs a reason and cannot be called implemented.

- **Phase 0 — Bootstrap:** confirm repo and PRD path/version; read all PRD sections; inspect tree/package/lockfile/env/tests/current changes; run baseline lint/typecheck/tests/build *without* fixing unrelated problems; create the four `docs/implementation/*` files if absent. *Gate: repo state recorded, existing failures separated from new ones, every PRD requirement mappable.*
- **Phase 1 — Compliance and access gate (before any external model/provider integration):** read current official hackathon rules/waiver/submission instructions, Meta Model API terms/AUP and age/access policy; record source URLs and results in `compliance-checklist.md`. **Hard stop:** Meta Model API sign-up requires age 18+; API terms govern end users and product targeting. If eligibility/authorization is uncertain: do NOT create an account, misstate age, use borrowed credentials, bypass identity controls, or wire runtime Meta API calls; ask the organizer for an approved route; continue only with independently permitted local work; never claim Meta-model integration. Open-weight access through another provider is NOT equivalent to Muse/model API access, and a coding agent writing code is NOT a runtime integration. If event rules require a model and access is unresolved, mark the project `BLOCKED — compliance decision required`. *Gate: source-backed determination for every relevant rule, or the feature is explicitly disabled with the blocker recorded; no uncertain external service on the critical path.*
- **Phase 2 — Requirement decomposition and traceability:** fill `requirements-traceability.md`; track every P0 FR-001…FR-015 individually, P1-001…P1-004 with gates, P2 as intentionally deferred, plus pipeline stages, UX screens, data contracts, security/privacy/accessibility, edge cases, V01–V50, release gates, demo script. Each row: ID, faithful statement, PRD section, priority, implementation location, test IDs, status, evidence, blocker. Split ambiguous requirements into testable sub-requirements; never compress distinct semantics into one "done". *Gate: no PRD section or acceptance-test row unaccounted for.*
- **Phase 3 — Architecture, risk-first spikes, design decisions:** verify `@contentauth/c2pa-web` (exact pinned version), worker/WASM packaging, same-origin asset path, CSP, cleanup methods in a real Next.js production-build smoke test. Verify metadata parser, decoder, validator, test tooling against current official docs. Keep browser-first (no server image relay). ADRs for non-trivial trade-offs with rollback plan. *Gate: riskiest integration has a tested proof-of-concept or a documented fallback preserving truthful semantics.*
- **Phase 4 — Data contracts, domain logic, safe intake:** domain types, runtime validation, preflight, fingerprints, metadata extraction, execution-state handling, deterministic aggregation, error codes as separable modules before UI. Keep PRD guardrails: JPEG/PNG allowlist (WebP conditional on tested end-to-end support); reject SVG, animated formats, HEIC/HEIF, AVIF, TIFF, RAW, PDF, archives, remote URLs; max 20 MiB compressed per file, 20 MP decoded, 2 files, 1.2 MP preview budget, one session; validate size before full read; combine extension + browser MIME + bounded signature + decode result + format policy; SHA-256 from original exact bytes; treat all filename/metadata/manifest strings as untrusted and bounded; GPS hidden by default and excluded from reports; no persistence of bytes/history/metadata; execution state separate from outcome; runtime schemas at every trust boundary. *Gate: unit tests on all enum/state mappings; invalid files fail recoverably; hash tests prove original-byte semantics.*
- **Phase 5 — P0 file workflow and Evidence Ledger:** start screen (honest scope, formats/limits, one-image and compare flows, privacy notice) → preflight → SHA-256 → metadata allowlist (unverified clues) → real pinned C2PA SDK read/validate with real states/warnings, cleanup in `finally` → Evidence Ledger linking every claim to check/evidence IDs → typed progress UI (no invented percentages) → reset/clear releasing object URLs, previews, SDK objects. Independent valid work must survive a failed non-critical check. *Gate: single-file workflow passes unit/integration/E2E with one verified-C2PA fixture and one missing-manifest fixture.*
- **Phase 6 — Provenance Delta, export, fault recovery:** analyze A and B independently; compare hashes, sizes, MIME/formats, dimensions, selected metadata, C2PA findings, and preview pixel metrics only with documented normalization; never presume an original; user "original/edited" labels attributed to the user; versioned JSON report per PRD §9.6 contract, default excludes image bytes and precise GPS (`includedOriginalImage: false`, `includedPreciseGps: false`); reject malformed reports/unknown statuses/overflow/bad cross-refs/fabricated evidence IDs; stable safe error codes; cancellation, offline, missing WASM, malformed files, download failures handled; bounded retries only for transient failures, honoring `Retry-After`. *Gate: comparison, report validation/export, session clearing, fault recovery tested; a failing check neither erases independent results nor crashes.*
- **Phase 7 — P0 UX, accessibility, responsive:** no color-only status; text+icon pairing; accessible names, visible focus, keyboard reachability, announced updates; reduced-motion respected; narrow viewports without overflow; distinct UI states for queued/running/completed/skipped/cancelled/failed/timed_out vs. outcomes; no placeholder results presented as real. *Gate: keyboard-only and narrow-viewport checks pass for the primary flow.*
- **Phase 8 — Optional Meta-model explanation (P1 only):** only after Phase 1 gate is green. Model explains a validated, compact evidence summary — never a verifier; send only allowlisted bounded evidence fields/codes/IDs, never image bytes, GPS, raw metadata, manifest payloads, secrets, or prompt text; disclose provider/data/purpose/retention and require deliberate user consent before any external request; keys server-side only (never `NEXT_PUBLIC_*`, bundles, source maps, logs); validate response shape and evidence-ID references; bound output/timeouts/concurrency; treat provider responses as untrusted prompt-injection content; discard malformed/timeout/hallucinated/unknown-reference output and show a deterministic template; the model MUST NOT change outcomes, add findings, or promote trust. If inaccessible/non-compliant, disable gracefully and keep the deterministic MVP. *Gate: written compliance evidence, authorized API smoke test, schema/prompt-injection/timeout tests, secret scans, deterministic fallback, truthful UI disclosure — else P1 stays blocked and unclaimed.*
- **Phase 9 — Hardening and release candidate:** run unit/integration/E2E/accessibility/responsive/dependency-security/secret-scan/production-build checks; every V01–V50 case has explicit evidence (result, expected vs actual, tool/version/env, date); conditional provider tests are `NOT APPLICABLE` only if deliberately not integrated and production paths never show mocks; verify release gates (PRD §14.5); audit dependencies before install/submission; no flaky-test passing by blind reruns — diagnose or block release; check production build, not just dev server. *Gate: every P0 row PASS with evidence, no critical blocker, production build succeeds, limitations documented.*
- **Phase 10 — Demo, submission, final audit:** rehearse the three story beats (known credential fixture; missing/unknown evidence without false conclusions; two-file Provenance Delta) plus report export and a real safe failure; versioned fixture manifest with source/license/hash/expected results/verification method and SDK versions — never infer expectations from filenames; judge-facing summary with only actually-implemented/permitted Meta integration; verify the submission form requirements from official sources; final report separates implemented / PASS / FAIL / skipped / blocked / deferred. *Gate: artifact builds and runs, demo rehearsed, traceability complete, submission requirements met or blockers presented.*

## 5. Evidence semantics and typed state invariants

Preserve these distinctions everywhere — code, tests, UI, export:

- **Execution state** (did the check run/how it ended): `queued`, `running`, `completed`, `skipped`, `cancelled`, `failed`, `timed_out`. Never use an execution error as a content finding.
- **C2PA manifest presence:** `present`, `not_present`, `unsupported`, `error`.
- **Validation:** keep actual SDK semantics such as `valid`, `invalid`, `unknown`, `not_evaluated`, `not_applicable`; only add an adapter state where documented and necessary; disclose what the SDK cannot independently evaluate.
- **Signer trust:** `trusted`, `not_trusted`, `unknown`, `not_evaluated` under the explicitly identified trust policy; trust ≠ signature validity.
- **Metadata:** unverified clues, potentially absent/changed/copied/misleading — never cryptographic provenance.
- **Hash:** fingerprint of this exact byte version — not identity, origin, time, intent, or truth.
- **Pixel comparison:** a bounded normalized-preview measurement — no forensic conclusion, tampering finding, or authenticity probability.
- **Model explanation:** non-authoritative prose tied to existing evidence; no write access to verification state.

Enforce in runtime schemas and tests: valid ISO timestamps, well-formed hashes, allowed MIME values, safe dimension math, size/pixel bounds, bounded arrays/strings, stable unique IDs, valid evidence/check/file references, no duplicate evidence IDs, schema-version compatibility, no contradictory state combinations. Unknown new SDK/provider codes stay safely unknown — never default to `valid` or `trusted`.

## 6. Change-impact analysis (every code/config/schema/dependency change)

**Before:** identify the symbol/contract and all consumers (callers, imports, routes, shared components, UI states, serializers, validators, tests, fixtures, env vars, scripts, deploy config, docs, demo). Search the whole repo; produce a small impact list: direct, transitive, test/fixture, config/runtime, docs/demo. Determine if the change affects report schema, public claims, privacy, cleanup, dependencies, provider access, or compliance.

**During:** update every affected consumer/producer so contracts stay consistent; if a type/status changes, update runtime schemas, mappings, adapters, UI renderers, exports, fixtures, tests, docs; if a package/version/script/env var changes, update lockfile, types, setup docs, tests, deploy config, `.env.example` (no secrets); behavior changes get regression tests, acceptance mapping, and user-visible notes.

**After:** re-search for old identifiers/enums/paths/claim wording; inspect the full diff; run targeted tests, then affected checks, then phase-gate checks. If an indirect impact cannot be verified, leave the task BLOCKED/PARTIAL with what remains — never mark complete by assumption.

**Mandatory change report:** changed files grouped by reason, plus indirect files updated and which tests cover the change. No unrelated formatting churn.

## 7. Architecture and code-quality rules

- Preserve the working architecture/toolchain; refactor only to reduce a concrete evidenced risk or enable a requirement.
- Keep boundaries: intake/decoding · hashing · metadata parsing · C2PA SDK adapter · domain types/runtime schemas · deterministic aggregation · reporting · optional model adapter · UI. UI must never invent or reinterpret validator semantics.
- Strict TypeScript; no `any`, unsafe casts, or swallowed exceptions — where unavoidable at a third-party boundary, isolate in a small adapter, validate at runtime immediately, comment and test.
- Small single-purpose functions; explicit data flow; immutable result objects; stable IDs; controlled vocabularies; dependency injection at seams; deterministic core logic; domain decisions testable without rendering UI.
- Runtime schemas at every trust boundary: file-derived values, SDK output mapping, optional provider/model I/O, exported reports.
- Explicit timeouts and cancellation (`AbortController` or equivalent); clean up in `finally`/lifecycle paths; stale async results must not overwrite a newer session.
- Resource ownership explicit: release C2PA reader/SDK objects as documented, close `ImageBitmap`, revoke object URLs, cap concurrency.
- Never block the main thread with avoidable heavy work; Workers/OffscreenCanvas only when verified across target browsers, else a safe bounded fallback or `unsupported`.
- No invented progress percentages; only report progress a real operation exposes.
- Dependencies lean and exact-pinned; lockfile in sync; review install scripts and transitive risk; no library for a trivial operation.
- No telemetry, analytics, auth, database, persistence, remote image fetch, or P2 scope without a real requirement and explicit reprioritization.

## 8. Security, privacy, and safe-failure rules

- File bytes and all derived strings are hostile input: validate before expensive processing; cap compressed/decoded sizes; prevent decompression/resource-exhaustion paths; allowlist formats; never trust extension or browser MIME alone; no remote URLs.
- Never render filename/metadata/manifest/provider/model text as raw HTML; test hostile strings.
- No original bytes, precise GPS, full raw metadata, API keys, cookies, arbitrary provider payloads, or raw exception traces in logs, exports, or analytics.
- No external image transmission without prior disclosure (recipient, data categories, purpose, known retention limits) and the required user action/consent.
- Media lives in volatile session memory only; no persistent history/localStorage/IndexedDB.
- GPS hidden by default and excluded from report exports; keep `includedOriginalImage: false` and `includedPreciseGps: false` unless a valid PRD decision changes it with all privacy gates/tests updated.
- API keys server-side only; never `NEXT_PUBLIC_*`; scan diffs, bundles/source maps when available, logs, history for exposure; never paste real secrets into prompts or fixtures.
- Bounded request bodies, runtime I/O validation, timeouts, concurrency limits, rate-aware retries on any external adapter.
- Fail closed for verification claims, fail gracefully for the product: a failed C2PA/model step must not fabricate a result or destroy completed independent local evidence.
- Test CSP/security headers; never disable CSP or TLS validation globally — fix resource paths or mark the path unsupported.
- Run dependency/security audits before changes and submission; investigate severe findings; document accepted low-risk warnings.

## 9. Testing strategy and verification evidence

Tests ship with each change, not as a final pass.

- **Unit:** validators, type/format mapping, SHA-256, metadata allowlist/redaction, state mapping, aggregation, evidence IDs, report schema, retry policy, error mapping.
- **Integration:** pinned C2PA SDK against real fixtures; worker/WASM init in the real Next.js build; metadata parser; comparison pipeline; reader cleanup on success/failure; trust-resource-unavailable behavior.
- **E2E:** upload/preflight, progress, single-image report, two-image comparison, clear session, keyboard flow, narrow viewport, offline/failure, report download.
- **Security:** spoofed extension/MIME, malformed/truncated/oversized/high-pixel files, hostile filenames/metadata, XSS/report injection, secret-leak scans, dependency audit, schema rejection.
- **Manual/device:** production build, narrow viewport, keyboard-only, reduced motion, network interruption.
- **Provider-model tests only if integrated:** malformed JSON, timeout/quota/401/403/429/5xx, prompt injection, unknown evidence IDs, unsupported claims, consent behavior, deterministic fallback.

Fixtures: keep `tests/fixtures/manifest.json` with source, license, SHA-256, expected behavior, how the expectation was established, SDK/tool version, constraints. Use official/public C2PA fixtures where permitted; verify expected outputs with the pinned SDK plus a second reference validator where practical. Never label a file valid/trusted from its name or a website description. Mocks isolated, labelled, impossible to confuse with production results.

Commands/evidence: use the actual toolchain's scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `audit`). Record command, timestamp, exit status, pass/fail/skipped counts, output summary in `docs/implementation/verification-log.md`. "Server starts", a screenshot, or a type definition is not proof of working functionality. A command that cannot run is `NOT RUN` with reason and compensating verification — never PASS. Failing tests: reproduce, isolate root cause, add a regression test, fix, rerun — never delete/weaken a test to go green. Diagnose flakiness; do not blind-rerun.

**V01–V50 policy:** the PRD §14.4 matrix is the canonical acceptance list. Preserve its IDs and expected outcomes; record `PASS` / `FAIL` / `BLOCKED` / `NOT RUN` / `NOT APPLICABLE` with evidence or exact reason. `NOT APPLICABLE` only where the capability is intentionally not implemented (e.g., provider tests with no provider enabled) — never to dodge an inconvenient P0 case.

## 10. Dependencies and supply-chain hygiene

- Before adding/upgrading: identify the exact need; inspect official docs, maintenance signals, license, transitive tree, advisories, install scripts, bundle impact, runtime compatibility.
- Lowest-risk maintained dependency that meets the requirement; no speculative deps for P1/P2.
- Pin exact versions for critical SDKs; commit the lockfile; never `latest`, floating ranges, or unpinned CDN SDK/WASM assets.
- Verify each dependency's real API against its exact installed version and TypeScript declarations, in the project's actual bundler/runtime.
- Update all dependent code, adapters, tests, fixtures, docs, decision records after any version/contract change.
- No broad package upgrades alongside unrelated features. Never suppress audit results without documenting vulnerability, reachability, mitigation, owner decision, and recheck point.

## 11. UI copy, product claims, and demo integrity

- Evidence-first phrasing: "credential not found", "signature valid; signer trust unknown", "preview difference observed", "check unavailable", "this result does not establish…".
- Prohibited: "100% real", "fake image detector", "tampering confirmed", "AI probability" (unless a separately validated, permitted model truly supports a narrowly defined metric — the PRD does not authorize one), "forensically certified", "verified by Meta" without proof.
- Keep the named checker, version, trust policy, evidence IDs, warnings, and limitations discoverable in report/detail views.
- No fixed demo output or hard-coded success results in production paths; deterministic templates explain real structured evidence only.
- Demo fixtures must produce their recorded actual results; if a known fixture's behavior changes after an SDK update, investigate and re-verify before changing the expectation — never edit the expected value just to pass.
- Never imply a Meta model was used unless an authorized call was actually made and evidenced; never claim partner credits/access unless confirmed for this participant.

## 12. Scope and priority control

- P0 is mandatory; stay image-only and browser-first; protect the Evidence Ledger, Provenance Delta, report, privacy, recoverability, accessibility, testing.
- P1 is conditional — only after P0 is stable and its explicit gates pass; the Meta explanation additionally requires the Phase 1 compliance gate.
- P2 is deferred unless the user explicitly expands scope and schedule/security/legal/test impacts are evaluated first.
- Never trade correctness, security, or traceability for polish, speed, or demo spectacle. Under schedule pressure, drop optional features first — never tests, privacy boundaries, status semantics, or release gates.
- If a requirement cannot be completed: present reason, impact, risk, exact remaining files/steps, safe fallback, and whether it blocks submission. Never mark it complete to make the plan green.

## 13. When to ask the user

Ask a focused question only when a decision is genuinely blocking and cannot be settled from the repo, PRD, official rules, or authoritative docs: conflicting authorities; destructive action or public release not clearly authorized; a decision that materially changes the PRD, privacy model, audience, or scope; unconfirmable credentials/eligibility/submission ownership. Provide verified facts, options with trade-offs, and a recommendation; continue independent safe work while waiting. Do not ask questions the PRD/repo already answer.

## 14. Required agent output format

**At task start:** a short execution plan — requirement/acceptance IDs; repository facts/constraints; expected file changes with direct/indirect impact; tests/commands and exit criteria; blockers or compliance gates.

**At task end, report:**
1. Outcome: `PASS` / `PARTIAL` / `BLOCKED` / `FAIL` with scope.
2. Requirements covered (exact IDs) and traceability status.
3. Files changed, grouped by responsibility, including indirect files and why.
4. Verification: exact commands, results (`PASS`/`FAIL`/`NOT RUN`), key logs, environment limitations.
5. Security/compliance checks and any open blocker (never expose secrets).
6. Known limitations, skipped tests, unsupported states, unverified claims, exact next action.
7. Git diff summary (when git exists): no unintended changes; user work preserved.

Never claim more than the evidence proves. Keep plan and verification log current so a fresh agent can resume without chat memory.

## 15. Final Definition of Done (P0)

Complete only when **all** hold:

- Entire PRD v2 and current applicable official rules reviewed; compliance checklist source-backed.
- Every requirement, mitigation, screen/pipeline behavior, and V01–V50 case traceable; no silent omissions.
- FR-001–FR-015 implemented (or a truly unavoidable blocker explicitly documented — never false-marked complete).
- Pinned C2PA SDK tested in the real Next.js build; reader/WASM/worker lifecycle and cleanup verified.
- Intake limits, file-type verification, original-byte SHA-256, metadata privacy, Evidence Ledger, Provenance Delta, JSON report, clear-session, and recoverable errors tested.
- Unknown/missing/invalid/not-present/not-evaluated/unavailable/skipped/failed states stay distinct; nothing fabricated; no universal real/fake conclusion.
- Runtime schemas enforce contracts and cross-reference constraints.
- Responsive/keyboard/accessibility/reduced-motion verified.
- Unit/integration/E2E/security/dependency/build checks recorded; nothing silently skipped.
- No secret leak, privacy violation, unconsented external image transfer, or unexplained critical dependency finding.
- No unsupported Meta API access, age-policy bypass, provider claim, or compliance claim.
- Fixture expectations verified; demo rehearsed on the actual build.
- README/setup docs, `.env.example` (no secrets), decision logs, traceability matrix, verification log, and submission notes agree with the implementation.
- Final diff reviewed; unrelated/user-authored changes preserved.

A task is NOT done because code was generated, the app compiles, a page looks right, or the agent says so — it is done when the linked requirement is implemented, validated with evidence, and accurately documented.

## 16. Official and technical references (re-verify before reliance)

- Meta Global AI Developer Hackathon: https://dev.meta.ai/events/global-hackathon
- Meta Model API age requirement: https://dev.meta.ai/help/accounts-and-login/age-requirement · terms: https://dev.meta.ai/legal/terms-of-service
- Meta Model API quickstart: https://dev.meta.ai/docs/quickstart
- C2PA Specification 2.5: https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html
- C2PA JS SDK / `c2pa-web` browser SDK / supported formats: https://opensource.contentauthenticity.org/docs/ (see `sdk-repos/c2pa-js/packages/c2pa-web/` and `sdk-repos/c2pa-js/supported-formats/`)
- MDN Web Crypto `SubtleCrypto.digest()`: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- OWASP File Upload and Input Validation cheat sheets: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- Next.js testing guidance: https://nextjs.org/docs/app/guides/testing

**Last prepared:** 27 October 2026 (trimmed and reconciled with actual repo state; prior draft's rules preserved). Reconfirm dynamic APIs, terms, dependency versions, event requirements, and dates before reliance.