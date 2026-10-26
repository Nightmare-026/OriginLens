# OriginLens — Decisions (ADRs)

Material decisions with source, date, and consequence. Newest first.

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
