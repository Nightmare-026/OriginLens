# OriginLens readiness audit — 2026-10-31 (updated 23:20 IST; final gate pass + owner decisions)

## Verdict

**CODE AND QUALITY GATES: READY. SUBMISSION: NOT YET READY.** The application now passes every
automated gate with a clean exit: 326 unit/integration tests, 53 Playwright specs (including
accessibility, 360 px layouts, security policy, C2PA real-runtime, and the full demo rehearsal), a
production build, and lint/typecheck. The live Baseten path was verified end to end for both the
explainer and the new site-wide guide, and the full gate remained green after the final docs pass
(2026-10-31 23:13 IST). What is missing is not code: the exposed credential will **not** be rotated
(owner decision, risk accepted and documented below), the participant-portal rules check is still
outstanding, the public deployment is owner-managed, and the recorded demo video still needs its
checklist review.

No audit can predict or guarantee a hackathon placing. The public event page describes the Indie track
as judged on creativity, technical ambition, and whether the project works. OriginLens has a real
differentiator in its Evidence Ledger and Provenance Delta, and now also a grounded, consent-gated
help guide. The remaining risk is presentation and compliance, not engineering.

This file supersedes the earlier same-day draft, which reported 49 E2E cases with an unverified runner
exit and no live provider call. Both of those gaps are now closed and recorded in
`verification-log.md` entries 210-223.

## Scope and repository state

- Read the complete `OriginLens_PRD.md` and reconciled it with the implementation, the plan, the
  compliance checklist, and the verification log.
- Inspected the model provider layer, `/api/explain`, `/api/guide`, the consent UI, the guide widget,
  the claims filter, environment handling, tests, and package scripts.
- The repo is on `main` with pre-existing uncommitted user work (including `src/app/globals.css`
  gradient edits, About page copy, and `playwright.config.ts`). All of it was preserved.
- `.env.local` is ignored and not tracked. It contains the Baseten key. The owner was asked to rotate
  it (it was shown in a screenshot and pasted into chat) and **declined rotation on 2026-10-31**. The
  risk is accepted for this submission: the key stays server-side only, the deployment is demo-scoped
  and rate-limited, and Baseten usage should be monitored on the dashboard. Rotate it as soon as
  convenient and before any real public traffic. This audit no longer treats rotation as a release
  blocker; it is a documented accepted risk.

## Fresh verification (2026-10-31, final run)

| Check | Result | Evidence / limitation |
|---|---|---|
| `npm run typecheck` | PASS | exit 0. |
| `npm run lint` | PASS | exit 0, no warnings. |
| `npm test` | PASS | 21 files, 326 tests passed. |
| `npm run build` | PASS | Next.js 16.4.3 production build, 13 routes including `/api/guide`. |
| `npx playwright test` | PASS | 53/53 in 3.3 m with a clean final summary and exit status. Playwright browser v1248 installed locally. |
| `npm run audit` | 16 moderate, dev-only | All one `minimatch <11.0.1` ReDoS (GHSA-g3hv-75wg-m249) reached only through ESLint/`typescript-eslint` devDependencies. Not shipped at runtime; no product input reaches `minimatch`. Fix requires a breaking ESLint major and is deliberately deferred, not hidden. |
| Client bundle secret scan | PASS (unchanged) | The configured key value is not present in `.next/static`; `.env.local` is untracked. The key was pasted into chat and shown in a screenshot; the owner declined rotation on 2026-10-31 - accepted risk, documented, demo-scoped deployment only. |
| Live Baseten `/api/explain` | PASS | `mode=ai_generated`, `modelUsed=meta-models/muse-spark-open-1026`, 2591 ms, cited `ev_...` IDs that exist in the request, no prohibited verdict claim. |
| Live Baseten `/api/guide` | PASS | `mode=ai_generated`, same model, 2036 ms, grounded answer about C2PA/trust, server-attached allowlisted links. |
| Guide fallback path | PASS | E2E runs with `MODEL_EXPLANATION_ENABLED=false` and asserts the reviewed reference answer, so the widget never goes dark. |
| Manual screen reader/device walkthrough | NOT RUN | Automated axe/WCAG checks and keyboard E2E pass; a human screen-reader pass is still outstanding. |
| Official public event page | VERIFIED | Indie judging criteria and the Nov 4, 2026 9:00 PM ET deadline. |
| Selected-participant rules / waiver | BLOCKED | The linked Cerebral Valley waiver still returns only a JavaScript loading shell. Retrieve the accepted rules from the participant portal. |

## Provider and model assessment

- Baseten's docs support the configured OpenAI-compatible pattern: `https://inference.baseten.co/v1`,
  server-side key, chat completions. Meta lists Baseten among hosted Muse Spark Open providers.
- The hackathon-specific `meta-models/muse-spark-open-1026` slug is confirmed by a live call, not just
  by the supplied email. The credit amount and TPM allocation remain unverified.
- This is a Baseten-hosted open-weight path, **not** Meta Model API (`api.meta.ai`). Keep the products
  and terms distinct in all submission copy.
- Muse Spark Open always reasons: `reasoning_content` is separate from `content`, and reasoning tokens
  count against `max_tokens`. The shared provider layer therefore uses `max_tokens=3000`,
  `reasoning_effort=low`, a 45 s client timeout, and a 60 s route `maxDuration`. Budgets that were fine
  for non-reasoning models returned empty content at 800 tokens - that was a real defect, now fixed.
- The official Muse Model License requires prominent "Built with Muse Spark Open" attribution. The
  About page carries it, and the guide consent panel names the provider and model.
- Server routes keep the key server-side, validate payloads with strict Zod schemas, require same-origin
  requests and explicit consent, cap body size at 8 KiB, and rate-limit in memory (20 requests / 5 min).
  **The in-memory limiter is not a durable multi-instance quota or a spend cap.** For a public
  deployment this is the main residual abuse risk and should be replaced with a shared store or a
  provider-side budget.
- The explainer sends summary codes, file fingerprint and properties, check states, evidence
  identifiers/keys, and the user question. The guide sends only the question and a coarse page id.
  Neither sends image bytes, previews, filenames, GPS, raw metadata values, or manifest text.

## Claims filter correction (why it mattered)

The original filter split on every comma, so a legitimate list such as "does not decide whether an
image is real, fake, AI-generated, or trustworthy" was read as three separate verdicts and rejected.
It also rejected three of the product's own reviewed guide answers, which would have pushed real user
questions to the deterministic fallback for no safety benefit.

The rewritten filter scopes negations to a clause, distinguishes denial of a negative verdict ("is not
fake", permitted) from denial of a positive verdict ("is not authentic", still rejected because it
asserts the opposite verdict), and only treats the ordinary adjective "real" as a verdict in predicate
position. Six regression tests cover the new semantics; all 22 claims tests pass.

## Site-wide guide: implemented

The guide the earlier draft recommended deferring is implemented and tested, because the product
owner explicitly asked for it and it reuses the same safety machinery as the explainer:

1. Bottom-right, keyboard-accessible launcher in the shared layout, on every page.
2. Separate `/api/guide` contract and prompt - never `/api/explain`, which is bound to a validated report.
3. Answers grounded in `src/lib/guide/content.ts`, a versioned, human-reviewed topic file. No tools, no
   web access, no file access, no authority over a verifier result.
4. Outbound payload is only the question plus a coarse page id, after a "Start guide" consent step.
5. Provider and data categories disclosed before first use; answers labelled "AI-generated" or
   "Reviewed reference"; related links attached server-side from an allowlist.
6. Request/output bounds, same-origin check, 8 KiB cap, in-memory rate limit, schema validation,
   prohibited-claim filter, and markup/link rejection.
7. Covered by unit, route, and E2E tests, including axe, Escape/focus-return, and 360 px overflow.

Residual risk: cost/abuse at public scale (shared-store quota needed), and a human screen-reader pass
is still outstanding.

## Deadline-driven action plan

The official event page lists project submission due **Nov 4, 2026 at 9:00 PM ET** (Nov 5 at 7:30 AM
IST; U.S. daylight time ends Nov 1). It describes the Indie criteria as creativity, technical ambition,
and whether it works. This is not a scoring guarantee or a complete submission contract; the
participant portal and accepted rules control.

| When (IST) | Priority | Action / exit evidence |
|---|---|---|
| **Oct 31 (done)** | P0 | Full gate re-run after final docs pass: typecheck 0, lint 0, 326/326 unit tests. Diff reviewed; no unrelated churn; pre-existing user edits preserved. |
| **Oct 31 (decision)** | P0 | Key rotation **declined by owner** - accepted risk, recorded in this audit. Key stays server-side only; deployment demo-scoped; Baseten usage dashboard monitored. |
| **Nov 1** | P0 | Owner deploys a public demo URL from this exact build (checklist in `demo-and-submission-guide.md`). Re-run the smoke checks against the deployed URL, not just localhost. Confirm the deployed env has `MODEL_EXPLANATION_ENABLED=true` and the key stays server-side. |
| **Nov 1** | P0 | In the participant portal, retrieve and accept the Official Rules; verify selected status, track, model-use requirements, permitted Baseten route, submission fields, video/code requirements, attribution, and originality clauses. Save a private copy. |
| **Nov 2** | P0 | Manual pass on the production build: verified C2PA fixture, missing/unknown evidence, two-file delta, JSON export, clear/reset, one recoverable failure, keyboard-only, 360 px, and one screen-reader spot check. Fix only release-blocking defects. |
| **Nov 2-3** | P0 | Review the already-recorded 2-3 minute video against the demo checklist: (1) known credential fixture with named checks; (2) missing evidence with no fake/real conclusion; (3) Provenance Delta + JSON export; (4) the guide answering a real question and refusing an off-topic one; audio quality; under the portal limit. Re-record only if a beat is missing or unclear. |
| **By Nov 4, 18:00 IST** | P0 | Freeze scope. Verify README, `.env.example` (no secrets), attribution, architecture diagram, live URL, video link, and every portal field. Submit early and save the receipt - the hard deadline is Nov 5, 07:30 IST. |

## Remaining blockers / next safe actions

1. **Read the accepted rules in the participant portal.** Confirm model-use requirements, attribution,
   submission format, and that the Baseten route is permitted. This is the only true external blocker
   left.
2. **Deploy a public demo URL** (owner-managed; checklist in `demo-and-submission-guide.md`) and re-run
   the smoke checks against the deployed build.
3. **Review the already-recorded demo video** against the 8-beat checklist.
4. **Accepted risk, not a blocker:** the Baseten key was screenshot-exposed and rotation was declined by
   the owner on 2026-10-31. Keep the key server-side only, keep the deployment demo-scoped, watch the
   Baseten usage dashboard, and rotate as soon as convenient.
5. **Manual screen-reader pass** on the primary inspection flow and the guide.
6. **Replace the in-memory rate limiter with a shared store or provider-side budget** before any real
   public traffic, or keep the deployment clearly demo-scoped.
7. **Schedule the ESLint/minimatch upgrade** as a separate, tested change after submission.

## Current uncommitted work

Pre-existing user edits (including the `globals.css` gradient work, About copy, and
`playwright.config.ts`) were preserved. This session added the shared model-provider layer, the guide
(content, schema, prompt, service, route, widget), the claims-filter rewrite and tests, the guide unit
/ route / E2E tests, README accuracy corrections, and updates to the plan, verification log, and this
record. No secret value is recorded here.
