# OriginLens — Repository, PRD & Hackathon Readiness Audit

**Audit date:** 27 October 2026  
**Repository supplied:** https://github.com/Nightmare-026/OriginLens  
**Specification reviewed:** `OriginLens_PRD.md`, version 2.0, prepared 26 October 2026 (1,130 rendered lines)  
**Audit status:** **PARTIAL — implementation verification blocked by repository retrieval**  
**Important:** This is an evidence-bounded audit, not a claim that the application passes or fails requirements whose implementation could not be inspected.

## 1. Executive result

The PRD defines a thoughtful, privacy-conscious image-provenance product: local file preflight, exact-byte SHA-256, allowlisted metadata, C2PA validation with distinct trust states, an Evidence Ledger, a two-file Provenance Delta, JSON reporting, explicit cleanup, safe recovery, accessibility, and 50 acceptance scenarios.

However, I could not retrieve the target repository's source tree in this environment. A shallow Git clone failed because the runtime could not resolve `github.com`; direct GitHub and raw-file opens returned retrieval/cache errors; search did not expose the requested repository's files. These failures **do not prove** that the repository is private, missing, or defective. They mean implementation claims cannot honestly be verified from available evidence.

| Question | Evidence-based status |
|---|---|
| Does the PRD describe a coherent and bounded MVP? | **Mostly yes**, with important release/compliance decisions still open |
| Does the repository implement FR-001–FR-015? | **Not verified** — source files unavailable for review |
| Were V01–V50 executed against the implementation? | **No** — not run; no test output was available |
| Does the build, typecheck, lint, dependency audit, or E2E suite pass? | **Unknown** — not executed |
| Is the app accessible, responsive, secure, and usable in practice? | **Unknown** — no implementation or live app could be inspected |
| Is full compliance with current hackathon rules proven? | **Not yet** — the event overview is accessible, but the full participant rules/submission portal were not independently inspected here |

**No PASS verdict is justified.** At present, the right overall status is **BLOCKED / NOT VERIFIED**, not “compliant” and not “failed.”

## 2. Evidence and method

### Sources actually reviewed

1. The full uploaded OriginLens PRD v2.0, including requirements FR-001–FR-015, P0/P1/P2 scope, typed schemas, security/privacy controls, edge cases, V01–V50, release gates, demo script, risk register, and coding-agent instructions.
2. The public Meta Global AI Developer Hackathon event page: https://dev.meta.ai/events/global-hackathon
3. Meta Model API age/help documentation: https://dev.meta.ai/help/accounts-and-login/age-requirement
4. Meta Model API Terms of Service (last updated 9 October 2026): https://dev.meta.ai/legal/terms-of-service
5. Search results for projects sharing the “OriginLens” / “Origin Lens” name, including https://github.com/slegarraga/originlens-ai-image-detector and https://github.com/aloth/origin-lens.

### Evidence that was not available

- Latest commit SHA/date and complete repository tree.
- README, `package.json`, lockfile, source code, tests, GitHub Actions, deployment configuration, dependency inventory, screenshots, and production URL.
- Build/test output, browser console/network traces, Lighthouse/axe results, or verified test-fixture results.
- The full current participant Official Rules and submission portal checklist.

As a result, the requirement tables below state **what must be checked** and the current verification status; they do not invent code-level findings.

## 3. PRD-to-implementation coverage matrix

The following P0 requirements are all release-critical. Each remains **NOT VERIFIED** until a source location and a reproducible test result are linked to it.

| PRD ID | What must be demonstrated in the repository/app | Status |
|---|---|---|
| FR-001 | Local single-image intake; invalid input receives specific recoverable feedback | Not verified |
| FR-002 | Byte cap, supported-format policy, signature/MIME consistency, decode, and pixel-budget guards before expensive work | Not verified |
| FR-003 | SHA-256 calculated from original file bytes, never transformed preview bytes | Not verified |
| FR-004 | Metadata allowlist; values labelled unverified; GPS hidden by default | Not verified |
| FR-005 | Pinned `@contentauth/c2pa-web` actually runs for tested supported formats and preserves real SDK findings | Not verified |
| FR-006 | Manifest validity, signature, content binding, and signer trust remain separate | Not verified |
| FR-007 | Every displayed finding traces to a real check and structured evidence | Not verified |
| FR-008 | Two-file comparison works independently for both files; hashes/properties/metadata/C2PA and guarded visual preview | Not verified |
| FR-009 | Execution state and finding outcome are separate, typed, and correctly rendered | Not verified |
| FR-010 | Versioned JSON report includes coverage, checker/version, timestamps, evidence references, limitations, and safe exports | Not verified |
| FR-011 | No account, server-side media upload, or persistent media history by default | Not verified |
| FR-012 | Clear-session cancels work where possible and releases object URLs, SDK readers, bitmaps, buffers, and stale state | Not verified |
| FR-013 | Non-critical check failure does not discard independent findings or crash the page | Not verified |
| FR-014 | Keyboard-operable primary flow, accessible names/focus/status updates, narrow viewport behavior, reduced-motion support | Not verified |
| FR-015 | Required tests pass on the implementation that is actually submitted; fixture expectations are documented | Not verified |

### Required test register V01–V50

**Execution status for every test below: NOT RUN / NOT VERIFIED.** The PRD gives expected conditions; those expectations are not evidence that the implementation meets them.

- **File intake and core behavior:** V01 valid JPEG; V02 PNG with no manifest; V03 known supported C2PA fixture; V04 invalid credential; V05 valid signature with unknown signer trust; V06 trust resources unavailable; V07 missing metadata; V08 GPS privacy; V09 no provider configured; V10 model unavailable; V11 file over 20 MiB; V12 image over 20 MP; V13 extension/MIME mismatch; V14 unsupported signature/format; V15 corrupt/truncated file; V16 hostile filename/metadata.
- **Comparison and lifecycle:** V17 exact duplicate; V18 same visible image in different encodings; V19 differing dimensions/aspect ratios; V20 EXIF orientation/color handling; V21 original-byte hashing; V22 missing WASM; V23 reader cleanup after success; V24 cleanup after exception; V25 offline mode; V26 cancel during work; V27 unknown SDK code.
- **Optional provider/model routes:** V28 provider 429; V29 provider 401/403; V30 provider 5xx/timeout; V31 invalid provider schema; V32 unknown provider field; V39 unsupported model claim; V40 unknown evidence ID; V41 malformed model JSON/timeout; V46 providers disagree. Where the provider/model is not implemented, expected status must be skipped/unavailable—not a simulated production result.
- **Reports, security, UX and coverage:** V33 report schema and references; V34 invalid report reference/status; V35 report download failure; V36 clear session; V37 mobile viewport; V38 keyboard-only use; V42 critical dependency issue blocks release; V43 secret scan; V44 external-call disclosure/consent; V45 no finding yields insufficient-coverage result; V47 timezone handling; V48 same filename, different files; V49 user-supplied labels; V50 unsupported C2PA variant.

A complete follow-up report should append, for each test, the implementation file/line, exact command or browser steps, actual output, screenshot/log reference, and `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`. Do not mark a test PASS merely because a function exists.

## 4. Highest-priority risks and gaps to resolve

These are **specification/readiness findings**, not claims that the code definitely contains the corresponding defect.

### P0 — Clarify hackathon tooling compliance before polishing

The official event overview says the event is about building with Meta's newest models/tooling, frames the themes as “Build for Your World” and “Push the Frontier,” and describes the Indie track through creativity, technical ambition, and whether the project works. A published secondary summary of the event waiver reports the project rubric as Impact 30%, Use of Meta AI Tooling 25%, Technical Depth & Execution 20%, Demo 25%. The full current Official Rules and participant portal must take precedence; I could not verify their full current text independently in this audit.

The PRD currently treats the Meta model explainer as **P1/optional/conditional**, while elsewhere it identifies uncertainty over model eligibility and says a model integration may be submission-critical. This ambiguity can lead to a technically strong product that under-demonstrates the hackathon's Meta-tooling dimension.

**Action:** Read and save the rules accepted in the participant portal. Record the exact required Meta product(s), what counts as runtime integration, required submission artifacts, demo-video expectations, permitted team/assistance rules, IP/license terms, and eligibility restrictions. If permitted, implement one real Meta-model path that has a clear job—explaining validated structured findings by evidence ID—while keeping the verifier authoritative. Do not use an unauthorized account or bypass age/access limits.

### P0 — Age, end-user and privacy-policy gate for Meta API

Meta's official Model API account guidance states that access requires age 18 or older. The current terms state that end users of the services/integrated products must be at least 18 and that integrated products must not be targeted at under-18 users. Meta's contributor-tier guidance also says an integrated product must have a privacy policy; verify the exact policy obligations for the chosen model tier and access route.

**Action:** Confirm participant eligibility and model access with the official rules/platform before implementation. If model integration is enabled, provide a public privacy policy that explains local processing, any outbound calls, data sent, retention/telemetry boundaries, and user controls. Keep AI explanation optional and do not send image bytes or precise GPS in its payload.

### P0 — Make network-bound trust checks auditable

The PRD correctly distinguishes local image processing from trust-list, timestamp, or revocation requests. It has not yet demonstrated that the selected C2PA SDK's actual configuration can prevent or expose all such requests before they happen.

**Action:** Verify SDK behavior from pinned-version docs/source. Instrument and test outbound requests; enumerate the destination and purpose; gate remote trust checks behind explicit consent where required; use `unknown`/`not_evaluated` when dependencies cannot be evaluated. Test offline mode and CSP in the deployed build.

### P0 — Tighten schema invariants

The PRD defines a broad `CommonOutcome` union and says a result “may” use a narrower check-specific schema. That leaves too much latitude for an impossible pair (for example, a metadata check with a C2PA-only outcome) unless implementation adds stronger validation. It also repeats `EvidenceItem[]` at both the check level and report level, which can drift if their relationship is not explicitly canonical.

**Action:** Make check-kind-specific schemas mandatory at runtime. Define one canonical evidence store or specify a deterministic deduplication/reference rule; validate duplicate IDs, check/file references, timestamps, hash format, dimensions, array/string limits, and state/outcome combinations. Add negative tests for every invalid combination.

### P1 — Specify the comparison math completely

The PRD defines a normalized mean absolute RGB error and a thresholded fraction of preview pixels, but a production implementation still needs explicit details about sRGB conversion, alpha handling, orientation normalization, rounding, resampling kernel, the exact normalization denominator, and how a different color profile is treated. Different browser decoders and color pipelines can change displayed measurements.

**Action:** Put the exact formulas and preprocessing sequence in a short technical note, then create fixed image fixtures with independently computed expected results. Name the metric “preview difference,” not a forensic score, and skip it whenever the normalization assumptions are not met.

### P1 — Explicitly define supported-browser and performance matrix

The PRD mentions workers/OffscreenCanvas and fallback paths but does not freeze a concrete browser/version matrix. The target device is mentioned as a 16 GB Windows laptop in manual testing, but CPU, browser, memory, latency and fallback behavior need measured data.

**Action:** Name the browsers/versions supported for judging, record the test device, test worker/WASM/resource cleanup in each supported browser, and report actual latency/memory behavior on the fixture set. Keep timeout targets as internal guardrails, not product promises.

### P1 — Add hackathon delivery artifacts to the definition of done

The PRD has a demo script and local build commands, but the implementation acceptance checklist should explicitly require: complete README, architecture/data-flow diagram, setup and environment-variable documentation, dependency/license inventory, fixture provenance and checksums, privacy policy (if required), accessibility statement or known-issues note, CI status, deployed URL/health check, demo video, and a submission-portal checklist. Verify which of these are mandatory in the participant rules rather than assuming.

## 5. Professional, clean, clear and user-friendly improvements

### Product positioning

- Keep the core promise short: **“Inspect recorded image provenance. See what is known, unknown, and not checked.”**
- Explicitly separate “provenance evidence” from “AI-image detection.” The current PRD is correctly scoped as an evidence explorer, not a universal detector; make the same distinction in the app title, hero copy, and demo narration.
- Lead with two primary jobs—**Inspect an image** and **Compare two versions**. Put the caveat beneath the action in plain language rather than stacking several warning paragraphs at the top.
- Avoid false certainty: never use real/fake verdicts, generic “trust scores,” or a gauge that implies statistical confidence when the system has no calibrated probability.

### Results information architecture

Use a clear hierarchy: **Overall coverage** → **Recorded provenance/C2PA** → **Metadata clues** → **File fingerprint** → **Two-file differences** → **Limitations and next steps**. Each finding should expose its source, status, short explanation, and “what this does not establish.” Put raw codes and advanced fields behind an expandable “Technical details” area.

### Visual system

- Use a restrained, distinctive palette with semantic tokens for `valid`, `invalid`, `unknown`, `not evaluated`, and `error`; do not rely on color alone.
- Use one spacing scale, one type scale, consistent border radii, and one icon family. Reserve bright accent color for primary actions and genuinely important states.
- Favor a calm editorial/evidence-tool feel over a generic AI dashboard: strong typography, deliberate whitespace, aligned columns, credible technical detail, and restrained motion.
- Make File A/File B comparison visually symmetric. Mark “original”/“edited” only as user-provided labels. Avoid implying that left means original or that a later filename means a later version.
- Make “Clear session” prominent and understandable; confirm before discarding a large report, but never make clearing data difficult.

### Accessibility and interaction

- Define WCAG 2.2 AA as a target; test semantic headings, labels, focus order, focus visibility, contrast, keyboard-only operation, status announcements, zoom/reflow, reduced motion, and error recovery.
- Ensure progress never masquerades as success; distinguish execution state from finding outcome in text, not only badges.
- Test mobile with real narrow widths and long filenames/error messages. The comparison UI should stack vertically without horizontal scrolling.
- Add a first-run sample/demo fixture only if clearly labelled as a sample. Never show canned C2PA outcomes as if they were computed from a user's file.

### Product documentation and trust

- Publish “How OriginLens works,” “What these results do not prove,” “Privacy & external requests,” and “Supported formats/browsers.”
- State the exact C2PA SDK/version and trust policy in technical details/report exports.
- Keep a dependency/license inventory and link attributions. Include a visible version and a way to report a bug.

## 6. What may make it look AI-generated

**I could not inspect the actual UI or code, so this section identifies signals to check—not defects confirmed in this repository.**

### In the PRD/document itself

- Repeated statements of the same limitation appear across the product promise, trust model, pipeline, privacy/security, edge cases, tests, demo, and honest-claims sections. Some repetition is intentional for safety, but the total is long enough that priorities can be obscured.
- Many sections use uniform tables, exhaustive enumerations, and repeated “never claim” lists. That is useful for a specification, but can read as machine-expanded if there is no short decision summary and no traceability from each requirement to an owner/test.
- Some design language remains generic (“clean, professional, evidence-dashboard design,” “restrained motion”) rather than describing a specific design system, page composition, typography, and interaction states.
- The stack and module layout are conventional recommendations; they do not by themselves demonstrate that integration risks have been experimentally verified.

**Improve the document:** keep a concise product brief plus a traceable requirements/test appendix; remove duplicate prose where a shared normative rule can be referenced; assign requirement IDs, owners and test IDs; distinguish decisions already made from hypotheses/gates still open.

### In the UI/code, if present

- A standard AI SaaS hero (large gradient heading, glowing orb, glass cards, decorative grid/particles) without a specific connection to evidence inspection.
- Too many same-shaped cards, each with a round icon, gradient, badge and equal visual weight—everything looks generated from one template.
- Generic marketing terms such as “AI-powered,” “revolutionary,” “intelligent insights,” “trust score,” or “100% accurate” instead of describing exactly which verifier ran and what its output means.
- Fake/demo metrics, pre-filled findings, animated progress percentages, or green success badges shown before checks finish.
- Redundant warnings repeated in every panel, inconsistent capitalization, labels such as “Original image” assigned by the app, vague empty states, and buttons that do not cause a real action.
- Decorative motion and heavy blur that reduce focus/contrast, or a mobile layout that simply compresses desktop cards.

**The remedy is not to avoid AI-assisted code.** It is to replace generic patterns with evidence of deliberate product decisions: real test fixtures, clear state semantics, precise microcopy, an original but restrained visual system, useful empty/error states, and a coherent demo that works without scripted success.

## 7. Naming and positioning risk

Search results show other projects already using near-identical “OriginLens” / “Origin Lens” names in the AI-image/provenance space. Examples include `slegarraga/originlens-ai-image-detector` and `aloth/origin-lens`. This does not establish legal trademark conflict, but it creates a **real discoverability and differentiation risk** on GitHub, search engines, and in a hackathon showcase.

**Action:** Before launch, consider a more distinctive product name or a strong differentiated qualifier (for example, a term around “Evidence Ledger” or “Provenance Delta”). Search the relevant package registries, domains, app stores and trademarks before committing to branding. Do not claim global uniqueness.

## 8. Hackathon alignment and submission readiness

### What the public event page confirms

- Themes: “Build for Your World” and “Push the Frontier.”
- Indie track lens: creativity, technical ambition, and whether the project works.
- Public timeline: project submissions are listed for **4 November 2026 at 9:00 PM Eastern Time**. Given the U.S. daylight-saving change before that date, this corresponds to **5 November 2026 at 7:30 AM India Standard Time**. Reconfirm the portal's exact countdown/timezone before submitting.

### What remains to be confirmed in the participant portal

- The version of Official Rules accepted by the participant and any later updates.
- Whether a Meta product/model is mandatory, which tools qualify, and what evidence demonstrates substantive use.
- Exact submission contents and file/video specifications; permitted team size/member listing; source-code/public-repository obligations; licensing/IP representations; treatment of third-party assets and assistance.
- Participant/model API eligibility and whether the selected access route is permitted.

### Stronger judging story

1. **Impact:** show one concrete user and scenario (e.g. a journalist/researcher checking an image before relying on it), not an abstract “fight misinformation” promise.
2. **Meta tooling:** demonstrate a real permitted Meta-model feature as an explainer of structured, validated evidence—not as the verifier. Show evidence IDs and deterministic fallback live.
3. **Technical depth:** show actual C2PA fixture validation, a valid-vs-unknown trust distinction, bounded file handling, original-byte hashing and the typed report schema.
4. **Demo:** rehearse one valid-provenance fixture, one no-manifest fixture, one two-file comparison, and one controlled failure. Have the expected output captured from the pinned validator before recording.

## 9. Prioritized next steps

1. **Unlock source access.** Connect the GitHub integration in ChatGPT or upload a ZIP of the repository (including hidden configuration such as `.github/workflows`, but excluding `.env`, API keys, private images and other secrets). The repository content was not obtainable in this audit, so that is the current blocking step.
2. **Establish reproducibility.** Record commit SHA, Node/package-manager versions, run the lockfile install, lint, typecheck, unit/integration/E2E tests, dependency audit and production build. Save the real outputs.
3. **Create a requirement traceability matrix.** Every FR and V-test gets an implementation path, test path, evidence link, status, severity and owner.
4. **Prove C2PA behavior.** Pin the SDK; run valid/no-manifest/invalid/unknown-trust fixtures; verify WASM/worker loading and reader cleanup; never derive expected results from filenames.
5. **Prove privacy/security.** Verify no image upload in the default flow, no GPS in exports, no API secret in bundles/history, consent for outbound calls, safe metadata rendering, CSP and resource cleanup.
6. **Prove user experience.** Run keyboard, narrow viewport, zoom/reflow, reduced motion, screen-reader status and accessible contrast tests; inspect a real screenshot set.
7. **Reconcile hackathon rules.** Confirm exact tooling and submission requirements; build only a permitted Meta integration and collect a real demo video/test evidence.
8. **Polish based on evidence.** Fix blockers first; only then tune copy, visual hierarchy, documentation and brand distinctiveness.

## 10. Final verdict

**PRD quality:** strong in its evidence-first philosophy and safety boundaries; needs tighter outcome schemas, measurable comparison preprocessing, an explicit browser matrix, and a more concrete hackathon submission checklist.  
**Implementation compliance:** **UNKNOWN / BLOCKED** because the source repository could not be retrieved.  
**Hackathon compliance:** **NOT CERTIFIED** until the accepted current Official Rules and actual submission requirements are checked and demonstrated.  
**Release recommendation:** **Do not describe OriginLens as PRD-complete, tested, secure, or hackathon-compliant yet.** The next audit should be source-backed and should report actual passing/failing tests rather than infer implementation status from this specification.

---

## Sources

- Meta Global AI Developer Hackathon official page: https://dev.meta.ai/events/global-hackathon
- Meta Model API age requirement: https://dev.meta.ai/help/accounts-and-login/age-requirement
- Meta Model API Terms of Service: https://dev.meta.ai/legal/terms-of-service
- Meta Contributor-tier privacy and age guidance: https://dev.meta.ai/help/policies-and-privacy/contributor-tier
- Secondary event-rubric guide (use only as context; participant Official Rules take precedence): https://bootshell.com/meta-global-ai-developer-hackathon-2026-complete-guide-rules
- Similar-name projects observed in search: https://github.com/slegarraga/originlens-ai-image-detector and https://github.com/aloth/origin-lens
