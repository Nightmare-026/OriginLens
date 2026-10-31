# OriginLens — Compliance Checklist (Phase 1)

**Sources rechecked:** 2026-10-31 (Asia/Calcutta); older source entries retain their original dates.
**Checklist corrected:** 2026-10-31 after checking the current local configuration, official provider/model documents, and current official event page.
**Scope:** Model-provider integration for P1-001 ("explain validated evidence"). This checklist gates any runtime provider code.

## Determination

**P1-001 status: IMPLEMENTED; LIVE ROUTE VERIFIED; ACCESS/EVENT-RULE GATE STILL OPEN. Do not describe it as Meta Model API access.**

The current ignored `.env.local` has `MODEL_EXPLANATION_ENABLED=true`, a non-empty server-side key, Baseten's OpenAI-compatible base URL, and the exact model slug stated in the user-supplied Baseten email. On 2026-10-31 two minimal, consented live calls succeeded against `meta-models/muse-spark-open-1026`: `/api/explain` returned `mode=ai_generated` in 2591 ms with valid evidence citations, and `/api/guide` returned a grounded help answer in 2036 ms. That verifies the endpoint, model slug, request shape, and response handling. It does **not** verify account balance or event-rule authorization. On 2026-10-31 the owner was asked to rotate the key (it was visible in the supplied screenshot and pasted into chat) and **declined**; that risk is accepted and documented - the key stays server-side only, the deployment is demo-scoped, and Baseten usage is monitored. The public Meta event page is readable and current, but the selected-participant rules/waiver still require portal review; its linked public page returned a JavaScript "Loading…" shell.

What exists is an implemented adapter in `src/lib/model-explainer/` plus `/api/explain`, with strict Zod request/response schemas, a forbidden-claims scanner, evidence-ID whitelist checking, consent gating, server-side secret handling, and a deterministic fallback. Its tests exercise local contracts and fallback behaviour. They do **not** prove any external model call works. Although code defaults do not assume a provider, the current local environment is configured and enabled; treat it as an active external-inference path.

The code has no provider defaults, but the local environment currently supplies them. The configured service is Baseten's hosted inference API for Meta's open-weight Muse Spark Open model, not Meta Model API (`api.meta.ai`). Meta's current developer documentation lists Baseten as a hosted provider for Muse Spark Open, and Baseten documents the OpenAI-compatible endpoint. The user-supplied email is the only available source for the hackathon-specific `-1026` model slug, $100 credit, and 2M tokens/minute allocation; none was verified from the Baseten account or an official public event rule. Do not conflate this hosted open-weight route with Meta Model API access or apply Meta Model API terms to it without checking the applicable Muse Model License, Usage Policy, Baseten terms, and event rules.

Meta's Muse Model License requires prominent “Built with Muse Spark Open” attribution in the product UI or accompanying documentation/site/settings. The exact phrase is now present on the About page; the production browser check remains blocked. The official model card says the model is not intended for individuals under 18; confirm the audience and usage-policy obligations before release. The official event waiver page returned only a JavaScript “Loading…” shell, so its requirements remain unverified.


## Status by requirement

| # | Requirement | Status | Finding (source) |
|---|---|---|---|
| 1 | Participation/track eligibility and rules acceptance | **PARTIAL** | Public event page says the event is virtual/worldwide and free if selected; Indie is for individual builders/students. Applications closed 2026-10-25 and approval notices were due Oct 26. It also says selected participants must accept Official Rules. Public event details verified 2026-10-31; participant-specific selection, track and accepted rules still require portal confirmation. |
| 2 | Is Meta model use required or optional? | **UNVERIFIED** | Public event page promotes using Muse models and open weights, but does not state a mandatory model-integration rule. The selected-participant Official Rules/portal must resolve this; PRD risk R-02 remains open. Do not assume optional or required. |
| 3 | Participant age / identity | **UNVERIFIED for this hosted-provider route** | Meta Model API itself requires 18+; that is a distinct service. Muse Spark Open's official model card says it is not intended for individuals under 18. Baseten's current terms require account authority/capacity and impose end-user terms, but no general 18+ clause was established in this review. Confirm the applicable account eligibility and product audience against accepted Baseten terms, Muse Model License/Usage Policy, and event rules. |
| 4 | Product audience/end-user restrictions | **PARTIAL** | PRD says adult users. Muse Spark Open is not intended for under-18 individuals. Confirm and disclose adult audience before release if required by applicable terms; the linked official hackathon rules remain inaccessible. |
| 5 | Authorized credentials / access route | **BLOCKED (event authorization) / endpoint verified / rotation declined** | The configured key authenticated a live call on 2026-10-31, so it is a working Baseten credential. It was exposed in the user-supplied screenshot and chat; the owner was asked to rotate it and **declined on 2026-10-31**. Accepted risk: key stays server-side only, deployment demo-scoped, Baseten usage dashboard monitored. Ownership, credit balance, and event authorization remain unconfirmed. |
| 6 | Allowed runtime integration | **IMPLEMENTED; LIVE PATH VERIFIED; EVENT RULE UNCONFIRMED** | Server-side OpenAI-compatible adapter returns real answers from `meta-models/muse-spark-open-1026`; deterministic fallback, schema validation, evidence-ID allowlist, and claims filtering are tested. Meta developer docs list Baseten among hosted Muse Spark Open providers. Do not call it Meta Model API. Event-rule confirmation is still missing. |
| 7 | Service tier / training use | **UNVERIFIED for the hosted model route** | Meta Model API Standard/Contributor statements do not describe the Baseten hosted open-weight route. Baseten's current terms say it will not train on Customer Content, but third-party model terms and inference processing must also be checked. Do not claim a particular retention posture beyond the current applicable documents. |
| 8 | Geography | **UNVERIFIED for this hosted-provider route** | Meta Model API geographic policy is not automatically the policy for a Baseten-hosted open-weight model. Confirm applicable Baseten account restrictions, the Muse Model License/Usage Policy, and hackathon eligibility for the participant's location. A timezone reference does not establish jurisdiction. |
| 9 | Rate limits, costs, retries | **PARTIAL** | Live latency observed at 2036 ms (guide) and 2591 ms (explainer); both calls succeeded on the first attempt. The email states $100 and up to 2M TPM for the hackathon-only model, but account balance and quota are unverified. The in-memory route limiter is not a durable spend cap. |
| 10 | Data retention / disclosure | **PARTIAL** | Baseten's current terms say it will not train on Customer Content and refer to a Zero Data Retention posture only where specifically designated, with exceptions. The applicable Muse third-party model terms and this account's retention designation are not verified. Product disclosure and deliberate consent remain required by the PRD and applicable law. |
| 11 | Permitted input types | **VERIFIED (constraint)** | Only text evidence summaries; no image bytes, precise GPS, full raw metadata, secrets, or arbitrarily large manifest payloads (PRD §10.2). All untrusted text is length-bounded and marked as data, not instructions (PRD §10.4). |
| 12 | Attribution / endorsement | **PARTIAL** | Muse Model License requires prominent “Built with Muse Spark Open” wording; the About page now includes it. Avoid implying Meta endorsement or claiming partner credit beyond the supplied email/account confirmation. |
| 13 | Usage policy | **PARTIAL** | Muse Spark Open has its own Usage Policy. Review its complete current prohibitions and reconcile the product's adult-media-literacy audience and evidence-explanation scope before a live release. Meta Model API AUP terms are not assumed to govern this hosted open-weight path. |
| 14 | Submission format, deadline, licence/originality | **PARTIAL** | Current official Meta page lists the deadline as **2026-11-04 21:00 ET**, equivalent to **2026-11-05 07:30 IST** after the U.S. DST change. The participant portal remains authoritative. Submission fields, video/source/license terms still require portal review. No submission has been made. |
| 15 | Creative-credential usage | **NOT APPLICABLE** | The app will not generate or sign C2PA credentials; it only inspects supplied files (PRD §6.3, §3.3). |

## Source log

| Source | URL | Accessed | Used for |
|---|---|---|---|
| Meta hackathon event page | https://dev.meta.ai/events/global-hackathon | 2026-10-31 | Current dates/deadline, tracks, themes, public eligibility notes, selected-participant rules-acceptance requirement |
| Cerebral Valley event page | https://cerebralvalley.ai/e/meta-ai-developer-hackathon | 2026-10-27 | Dates/times, partners, eligibility, rules statement |
| CV waiver page | https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver | 2026-10-31 | **NOT RETRIEVED** — current page returned a JS shell ("Loading…"); use participant portal to view accepted rules |
| Age requirement | https://dev.meta.ai/help/accounts-and-login/age-requirement | 2026-10-27 | 18+ sign-up/access rule |
| Meta Model API ToS (updated 2026-10-09) | https://dev.meta.ai/legal/terms-of-service | 2026-10-27 | Age/end-user terms, key handling, tier/training, retention, trademarks, privacy policy |
| Meta Model API AUP | https://dev.meta.ai/legal/acceptable-use-policy | 2026-10-27 | Provenance-signal integrity, disclosure, deception rules |
| Model Designation & Geographic Use Policy (updated 2026-10-12) | https://dev.meta.ai/legal/geographic-use-policy | 2026-10-27 | Standard vs Contributor model IDs/tiers; restricted territories; India restriction for Muse Image |
| Quickstart | https://dev.meta.ai/docs/quickstart | 2026-10-27 | Base URL, Responses API, model ID `muse-spark-1.3`, `MODEL_API_KEY`, 401/404 behavior |
| Pricing and rate limits | https://dev.meta.ai/docs/pricing-rate-limits | 2026-10-27 | Pricing, rate limits, 429 backoff guidance |
| Muse Spark Open hosted deployment documentation | https://dev.meta.ai/docs/muse-spark-open/deploy | 2026-10-31 | Baseten listed as a hosted provider; standard model identifier and serving options |
| Muse Spark Open model/license documentation | https://dev.meta.ai/docs/muse-spark-open | 2026-10-31 | Open-weight model deployment, model license, usage-policy reference, and hosted-provider distinction |
| Baseten Chat Completions API | https://docs.baseten.co/reference/inference-api/chat-completions | 2026-10-31 | OpenAI-compatible base URL, server-side API key, and chat completion request contract |
| Baseten Terms and Conditions | https://www.baseten.co/terms-and-conditions/ | 2026-10-31 | Customer authority, third-party model terms, data handling, and no-training statements |

## Open blockers (must be resolved by the participant)

1. **Eligibility/access:** verify Baseten credential ownership and exact model entitlement, participant eligibility, location, model-license terms. Rotation of the exposed key was declined by the owner on 2026-10-31 (accepted risk; keep the key server-side, deployment demo-scoped, monitor usage).
2. **Official Rules:** retrieve/read/accept in the portal; confirm whether a Meta model integration is mandatory.
3. **Jurisdiction:** confirm the participant's location is not a Restricted Territory.
4. **Submission requirements:** confirm format, source/video, licence/originality terms from the portal.

Until these are closed, do not use or claim the configured external model path beyond the demo scope. The deterministic implementation remains available and is the submission fallback.
