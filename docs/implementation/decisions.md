# OriginLens — Decisions (ADRs)

Material decisions with source, date, and consequence. Newest first.

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
