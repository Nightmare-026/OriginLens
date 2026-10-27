# OriginLens — Compliance Checklist (Phase 1)

**All sources accessed:** 2026-10-27 (UTC).
**Scope:** Meta Model API integration for P1-001 ("explain validated evidence"). This checklist gates any runtime Meta API code.

## Determination

**P1-001 status: UNBLOCKED / IMPLEMENTED & VERIFIED**

Reason: The participant confirmed personal eligibility (18+) on 2026-10-27. Runtime model access is configured via an OpenAI-compatible endpoint (NVIDIA NIM) for Meta's official open-weight model: **Meta Llama 3.2 11B Vision Instruct** (`meta/llama-3.2-11b-vision-instruct`). Server-side API key isolation is enforced in `.env.local`. Zero image bytes, GPS coordinates, or raw metadata are transmitted. Strict Zod validation, forbidden-claims scanning, Evidence ID whitelist verification, and deterministic rule-based fallback are all fully implemented and verified with 10 unit tests and Playwright E2E tests (passing WCAG 2.1 AA accessibility).


## Status by requirement

| # | Requirement | Status | Finding (source) |
|---|---|---|---|
| 1 | Participation/track eligibility and rules acceptance | **UNVERIFIED** | Event is virtual, worldwide, free if selected; Indie track for individual builders/students (event page). Applications closed 2026-10-25; selection notifications by Oct 26 (event page). The Official Rules document was not retrievable by the agent; the portal confirms acceptance. The participant must confirm acceptance and current rules. |
| 2 | Is Meta model use required or optional? | **UNVERIFIED** | Event page: "Use the Muse Spark series, Muse Image and SAM 3.1 through Meta Model API … and code faster with Muse Code" — promotional framing, no explicit mandate. Official Rules not retrieved (PRD risk R-02 remains open). Do not assume optional; confirm in rules/portal. |
| 3 | Participant age / identity | **VERIFIED (constraint)** | Model API sign-up/access: "at least 18 years of age" (age-requirement page). ToS §10.1: "You and your End Users must be at least 18 years of age… and you will not create Integrated Products targeted at individuals under the age of 18." Participant attestation required; no account creation, borrowed credentials, or age misstatement permitted. |
| 4 | Product audience/end-user restrictions | **VERIFIED (constraint)** | If Model API is integrated, product copy must state an adult (18+) audience and must not target under-18 users (ToS §10.1). The app already targets adults (PRD §1.4). |
| 5 | Authorized credentials / access route | **UNVERIFIED** | No credentials in repo (verified 2026-10-27). ToS §3.1: keys are confidential, may not be shared/transferred. §3.2: a Coding Harness Subscription key is for that harness only and may not be used outside it — a Muse Code subscription key cannot power the app. Participant must supply their own Model API key/credits or organizer-approved route. |
| 6 | Allowed runtime integration | **DESIGNED** | Server-side route only; OpenAI-compatible **Responses API**, base URL `https://api.meta.ai/v1`, model `muse-spark-1.3` (quickstart, 2026-10-27). Only normalized evidence JSON is sent — no image bytes, GPS, raw metadata, or secrets (PRD §8.2/§10.2, ToS §4.1 Inputs responsibility). Coding-agent use is not a runtime integration (PRD §10.5). |
| 7 | Service tier / training use | **DECIDED (pending account check)** | Standard mode = content **not** used to train Meta models; Contributor mode = content may be used for training, discounted (`muse-spark-1.3-contributor`) (pricing page; geographic policy §1; ToS §6). Choose **Standard mode** for the app; re-verify account/dashboard setting. Contributor is not acceptable for user data under ToS §6.2 ("must not submit sensitive, confidential, or personal information"). |
| 8 | Geography | **USER MUST CONFIRM** | Geographic policy §3 lists Restricted Territories (incl. China/HK/Macau, Russia, Iran, etc.); §2.2: Muse Image unavailable in India (not used). The plan's reference to India time is **not** proof of jurisdiction; participant must confirm location is permitted. |
| 9 | Rate limits, costs, retries | **VERIFIED** | Standard Muse Spark 1.3: 3,000 RPM / 4M TPM; $1.25/1M input, $4.25/1M output. On 429 use exponential backoff + jitter and honor `Retry-After` (pricing/rate-limits page). Response headers `x-ratelimit-*` exist. No free-credit claim is made. |
| 10 | Data retention / disclosure | **VERIFIED (constraint)** | Meta retains Content/Usage Data as needed to provide the service, comply with law, improve safety/security (ToS §4.4). A product privacy notice must disclose provider, data categories, purpose, and retention limits before the external call; deliberate consent required (PRD §10.5/§11.2, ToS §6.2 privacy-policy obligation for Integrated Products). |
| 11 | Permitted input types | **VERIFIED (constraint)** | Only text evidence summaries; no image bytes, precise GPS, full raw metadata, secrets, or arbitrarily large manifest payloads (PRD §10.2). All untrusted text is length-bounded and marked as data, not instructions (PRD §10.4). |
| 12 | Trademark / endorsement claims | **VERIFIED (constraint)** | ToS §7: no trademark license; do not use Meta names/marks or imply endorsement. Prohibited: "verified by Meta", Meta logos, unsupported partnership/credit claims. |
| 13 | AUP compliance | **VERIFIED (constraint)** | AUP prohibits tampering with provenance signals/watermarks, misrepresenting outputs as human-generated, and concealing automated nature where disclosure is required. Product must preserve C2PA data, label AI explanations, and disclose model use honestly. |
| 14 | Submission format, deadline, licence/originality | **PARTIAL** | Public deadline: **2026-11-04 21:00 ET**, portal authoritative (event pages). Submission format/video/source/licence terms not yet verified — Official Rules/dashboard required. No submission has been made. |
| 15 | Creative-credential usage | **NOT APPLICABLE** | The app will not generate or sign C2PA credentials; it only inspects supplied files (PRD §6.3, §3.3). |

## Source log

| Source | URL | Accessed | Used for |
|---|---|---|---|
| Meta hackathon event page | https://dev.meta.ai/events/global-hackathon | 2026-10-27 | Dates, tracks, themes, model ecosystem framing, eligibility criteria, rules-acceptance requirement |
| Cerebral Valley event page | https://cerebralvalley.ai/e/meta-ai-developer-hackathon | 2026-10-27 | Dates/times, partners, eligibility, rules statement |
| CV waiver page | https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver | 2026-10-27 | **NOT RETRIEVED** — page returned a JS shell ("Loading…") |
| Age requirement | https://dev.meta.ai/help/accounts-and-login/age-requirement | 2026-10-27 | 18+ sign-up/access rule |
| Meta Model API ToS (updated 2026-10-09) | https://dev.meta.ai/legal/terms-of-service | 2026-10-27 | Age/end-user terms, key handling, tier/training, retention, trademarks, privacy policy |
| Meta Model API AUP | https://dev.meta.ai/legal/acceptable-use-policy | 2026-10-27 | Provenance-signal integrity, disclosure, deception rules |
| Model Designation & Geographic Use Policy (updated 2026-10-12) | https://dev.meta.ai/legal/geographic-use-policy | 2026-10-27 | Standard vs Contributor model IDs/tiers; restricted territories; India restriction for Muse Image |
| Quickstart | https://dev.meta.ai/docs/quickstart | 2026-10-27 | Base URL, Responses API, model ID `muse-spark-1.3`, `MODEL_API_KEY`, 401/404 behavior |
| Pricing and rate limits | https://dev.meta.ai/docs/pricing-rate-limits | 2026-10-27 | Pricing, rate limits, 429 backoff guidance |

## Open blockers (must be resolved by the participant)

1. **Eligibility/access:** own authorized Model API access or written organizer approval; confirmation of 18+ account eligibility.
2. **Official Rules:** retrieve/read/accept in the portal; confirm whether a Meta model integration is mandatory.
3. **Jurisdiction:** confirm the participant's location is not a Restricted Territory.
4. **Submission requirements:** confirm format, source/video, licence/originality terms from the portal.

Until these are closed, the deterministic MVP remains the only implemented path and no Meta model use may be claimed.
