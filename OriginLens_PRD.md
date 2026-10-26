# OriginLens — Audited Product Specification v2.0

**Document type:** Product Requirements Document (PRD), Technical Design, Security Specification, Verification & Validation Plan, and Hackathon Execution Plan  
**Version:** 2.0  
**Prepared:** 26 October 2026  
**Status:** Scope-frozen MVP specification; external-access gates remain open until confirmed  
**Target:** Meta Global AI Developer Hackathon 2026 — Indie Developer track, subject to the participant's official rules and track confirmation  
**Product class:** Privacy-conscious, browser-first image provenance and evidence-comparison tool  
**Primary principle:** Report what the evidence establishes, distinguish what it does not establish, and never invent a result.

> **Implementation notice:** This document describes a buildable target, not a claim that the application has already been implemented or validated. Dependencies, provider access, current terms, and test-fixture expectations must be verified during implementation. Passing tests must be demonstrated before any release claim is made.

---

## 0. Audit Summary and Decisions

The previous draft had a sound evidence-first principle, but it needed tighter product differentiation, more precise state modelling, and a more constrained implementation path. This version resolves the following material issues.

| Audit finding | Risk in the previous draft | Resolution in v2.0 |
|---|---|---|
| Execution states and verification outcomes were mixed | A check could be “completed” while also needing an outcome such as “not present”; cancellation was discussed but not represented consistently | Separate `executionState` from typed check-specific outcomes; add `cancelled` as an execution state |
| C2PA validity and signer trust could be misunderstood | A parsed manifest or valid signature could be presented as trusted provenance | Keep manifest, signature, content-binding, timestamp/revocation, and signer-trust results distinct; surface the verifier's actual output and configured trust policy |
| The optional watermark API could consume the schedule | An unverified API dependency could block the demo | Exclude third-party watermark integration from the critical path; add it only after endpoint, access, terms, file support, cost, and privacy are verified |
| The product risked looking like a wrapper around metadata tools | A broad “check an image” interface may not demonstrate a distinct contribution | Make the core differentiator the **Evidence Ledger** and **Provenance Delta**: traceable findings for one image and a cautious comparison of two versions |
| Pixel comparison was underspecified | Resizing, orientation, color handling, or decoder behavior could make differences misleading | Define a preview-only comparison method, document normalization, and prohibit forensic/tampering claims from visual differences |
| Browser SDK setup was too generic | `c2pa-web` uses WebAssembly and worker resources; a Vite-specific `?url` import may not work unchanged in Next.js | Add a Next.js-specific integration spike and a release gate for WASM/worker loading, resource cleanup, and deployment CSP |
| Browser privacy and remote trust checks were conflated | Local file processing may still need network access for trust resources | Distinguish local media processing from network-dependent trust/revocation checks; disclose relevant external access and report unknown states honestly |
| The API/deployment path could exceed host limits | Sending a 20 MiB image through a serverless API route can exceed common request-body limits | Keep image bytes in the browser for the MVP; send only compact, consented, validated evidence to an optional model-explanation route |
| Report requirements were not formal enough | A report could omit which verifier ran, its version, or why a check was unavailable | Version the report schema and include check coverage, timestamps, source/version, evidence references, limitations, and stable error codes |
| The plan did not explicitly align with the official judging rubric | Time could be spent on features that are hard to demo | Prioritize a reproducible three-part demo: valid provenance evidence, missing/unknown evidence, and a two-file comparison; prove working behavior with real fixtures |

### Audit conclusion

**The idea is feasible for a 10-day MVP if the scope remains image-only and browser-first.** The highest-value version is not a universal AI detector. It is an explainable evidence workflow that combines C2PA inspection, non-authoritative metadata, file fingerprints, and a carefully bounded two-file comparison. A provider-specific watermark detector, video support, remote-image search, accounts, and persistent storage are deferred.

No responsible audit can guarantee that a document contains absolutely zero defects or guarantee a hackathon win. This specification is designed to reduce preventable ambiguity and implementation risk; the code, dependency behavior, and acceptance tests must still be executed and reviewed.

---

## 1. Product Vision

### 1.1 Name and one-sentence pitch

**OriginLens — Evidence-First Media Provenance Explorer**

OriginLens inspects the available provenance evidence for an image, shows what each check actually establishes, and compares two supplied versions without pretending to know more than the evidence supports.

### 1.2 Product promise

> “See the evidence behind an image's recorded origin—and understand what remains unknown.”

### 1.3 Problem statement

Images are generated, edited, resized, compressed, screenshotted, and re-shared across tools and platforms. Their context may be lost. Users often see one indicator—such as a metadata field or a missing watermark—and treat it as a definitive answer about whether an image is AI-generated, authentic, or deceptive.

OriginLens addresses that interpretation problem. It does not attempt to prove the truth of the depicted scene. It presents a structured, repeatable account of available evidence, how each check was performed, and which conclusions remain unsupported.

### 1.4 Primary users

- Adult students and adult media-literacy learners examining image provenance.
- Adult journalists and researchers who need a clear record of what a file-level check did and did not show.
- Adult creators checking whether an image contains supported Content Credentials.
- Adult reviewers comparing two versions supplied by a user.

**Age/terms gate:** Current Meta Model API account guidance says account access is limited to people aged 18 or older, and current API terms restrict use of integrated products to end users aged 18 or older and prohibit creating integrated products targeted at under-18s. If a Meta Model API integration is included, the product's intended audience and access controls must comply with the current terms. The participant must not create/use an account or route around eligibility if under the required age; obtain guidance from the hackathon organizers. If no authorized route is available, do not build the product around that API and do not claim Meta-model integration. See Sections 10.5 and 18.

### 1.5 Jobs to be done

1. “Tell me what verifiable provenance evidence is embedded in this image.”
2. “Explain the difference between a valid signed record, a trusted signer, missing credentials, and an inconclusive check.”
3. “Show me how these two files differ without assuming which file is original or why a change occurred.”
4. “Give me a report I can share without automatically exposing the image itself or sensitive metadata.”

### 1.6 Non-promises

OriginLens must never claim to:

- Detect every AI-generated or AI-edited image.
- Prove that the scene in an image is factually true.
- Reconstruct editing history that was never recorded or whose evidence is unavailable.
- Identify the human creator, their intention, or the original account from file metadata alone.
- Interpret “no supported signal detected” as “human-created.”
- Interpret an invalid credential as automatic proof of fraud or malicious tampering.
- Produce a universal “real/fake” label or an unsupported AI-probability percentage.

---

## 2. Hackathon Strategy and Differentiation

The public event page describes the Indie Developer track as being judged on **creativity, technical ambition, and whether the project works**. It describes the Build for Your World theme as applying models to a problem the builder knows. This plan therefore prioritizes a distinctive workflow, a demonstrable technical core, and a reproducible demo—not a large feature count. The official submission form and rules remain authoritative if they add requirements.

Official event page: <https://dev.meta.ai/events/global-hackathon>

### 2.1 Core differentiator: Evidence Ledger

Every result shown in the UI must link to a named check and a structured evidence item. A user should be able to answer:

- What did OriginLens inspect?
- Which library or provider produced this result?
- Did the check actually run?
- What exact field, validator state, or measurement supports the explanation?
- What can this evidence establish, and what cannot be inferred from it?

This is more meaningful than presenting a raw metadata dump or one generic label.

### 2.2 Core differentiator: Provenance Delta

When a user supplies two images, OriginLens displays a **File A / File B comparison** by default. It compares their exact-byte SHA-256 fingerprints, basic file properties, selected metadata, available C2PA findings, and—where the tested preview path supports it—a clearly labelled visual difference preview.

The user may optionally label the files “original” and “edited.” These are **user-provided labels**, not conclusions made by the application. OriginLens does not infer intent, chronology, deception, or which file is authoritative merely from a difference.

If a C2PA manifest includes a recorded ingredient relationship and the verifier returns usable findings, show that recorded relationship separately from any visual comparison. Do not invent a link between files solely because their pixels look similar.

### 2.3 Optional differentiator: Grounded explanation using a Meta model

If the hackathon rules require Meta-model usage and an access route is available and permitted for the participant, use the approved Meta model to explain **already-validated structured findings** in plain language. The model must not decide whether the asset is authentic, override a verifier state, or invent missing evidence.

**Current eligibility constraint:** Meta's official Model API help page says a person must be 18 or older to sign up for and access the platform. The current Terms of Service also say that end users must be at least 18 and that integrated products must not be targeted at under-18 users. Because hackathon approval does not itself supersede API terms, this participant must not assume personal access is permitted. If under the required age, do not sign up, use another person's account, or bypass identity/age controls; ask the organizers for written clarification and an expressly permitted participation route. Until that is resolved, model access is a blocker to confirm—not an assumed dependency.

The model's output must reference evidence IDs supplied by the application. The application validates those references and falls back to deterministic templates if the model fails or generates unsupported statements.

**Access gate:** Meta Model API, Muse Code, and third-party inference platforms have separate account terms and access requirements. Hackathon acceptance does not itself prove that every tool or API is available to every participant. Confirm the permitted route with the organizer and platform terms before integrating it. Do not bypass age, identity, or access restrictions. If the official rules require a model integration and no permitted route is clear, ask the organizers immediately; a template-only fallback may not satisfy such a rule.

### 2.4 Competitive positioning

OriginLens should be presented as an **evidence explorer and version-comparison workflow**, not as a claim to have invented C2PA, metadata inspection, or AI-watermark analysis. Provenance standards and existing inspection tools already exist. The differentiation must be demonstrated through the combined workflow, transparent state semantics, privacy boundaries, and testable report—not through an unsupported claim of global uniqueness.

### 2.5 Judge-facing success criteria

| Judging dimension | What the demo should prove | Evidence to prepare |
|---|---|---|
| Creativity | The Evidence Ledger and Provenance Delta solve an interpretation problem rather than adding another binary detector | Short narrative; real evidence linked to explanations; two-file comparison |
| Technical ambition | The app handles cryptographic provenance states, trust uncertainty, typed failures, file safety, and structured model explanation | Architecture view; data contract; selected tests; live error-state demo |
| Working product | Main flows complete reliably without invented results | Real fixtures with recorded expected results; test output; deployed working URL if possible |
| Responsible design | The UI avoids overstated claims and makes privacy/uncertainty visible | No-real/fake policy; external-call disclosure; GPS-hiding behavior |

A good score is not guaranteed. The objective is to make the product's value, technical substance, and evidence of correct behavior easy to verify within a short judging window.

---

## 3. Scope and Priority

Use **MUST**, **SHOULD**, and **MAY** as normative requirement terms. `MUST` means release-critical. `SHOULD` means strongly recommended unless a documented reason prevents it. `MAY` means optional.

### 3.1 P0 — Required MVP

| ID | Requirement | Acceptance condition |
|---|---|---|
| FR-001 | Single-image intake | User can choose one supported local image; invalid inputs receive recoverable, specific feedback |
| FR-002 | File preflight | Byte limit, supported-format policy, signature/MIME consistency, decoder result, and pixel limit are checked before expensive work |
| FR-003 | Original-byte fingerprint | SHA-256 is computed from original uploaded bytes, not a transformed preview |
| FR-004 | Metadata clues | A limited allowlist of fields is shown as editable/unverified; GPS is hidden by default |
| FR-005 | C2PA inspection | Embedded C2PA findings are read with the pinned SDK, if supported for that format; actual validator states and warnings are preserved |
| FR-006 | Trust semantics | Manifest/signature/content-binding validity and signer trust are not collapsed into one “authentic” badge |
| FR-007 | Evidence Ledger | Every displayed finding references a real check and specific structured evidence |
| FR-008 | Provenance Delta | Two files can be compared by hash, dimensions, file properties, selected metadata, and supported visual preview |
| FR-009 | Typed execution states | Pending/running/completed/skipped/cancelled/failed/timed-out are distinct from result outcomes |
| FR-010 | Evidence report | User can download a versioned JSON report; a readable print view is optional if tested |
| FR-011 | Privacy defaults | No login, persistent media history, or image upload to a server by default |
| FR-012 | Clear session | User can clear the current session; temporary object URLs, SDK objects, and preview resources are released |
| FR-013 | Recoverable errors | A non-critical check failing does not erase completed independent results or crash the page |
| FR-014 | Accessible responsive UI | Primary flow works by keyboard and on a narrow viewport |
| FR-015 | Test-backed demo | All release-critical tests pass locally, with recorded fixture provenance and expected results |

### 3.2 P1 — Add only after P0 is stable

| ID | Feature | Gate |
|---|---|---|
| P1-001 | Meta-model evidence explanation | **Only after** official rules, participant eligibility, and account access are confirmed; product audience must comply with current terms. Structured result schema, server-side secret handling, output validation, timeout, and deterministic fallback implemented |
| P1-002 | Print-friendly report | Tested on supported browsers; sensitive fields remain excluded by default |
| P1-003 | WebP input | Add only after actual decoder and pinned C2PA SDK behavior has been verified using test fixtures |
| P1-004 | Extra fixture families | Add when expected results can be established from trusted reference validation |

### 3.3 P2 — Deferred beyond the hackathon MVP

- Provider-specific watermark API, unless an authorized endpoint and access route are confirmed early and all P0 work is stable.
- Remote URL ingestion, internet crawling, reverse-image search, or cloud-based credential recovery.
- Video, audio, animated images, HEIC/HEIF, RAW, TIFF, PDF, SVG, or archives.
- Accounts, saved history, collaboration, database, analytics, or user profiles.
- Training a new AI detector or generating a universal AI probability.
- Editing or signing user assets with new C2PA credentials.
- Legal/forensic certifications or high-stakes adjudication.

**Scope rule:** Do not sacrifice reliable C2PA interpretation, the comparison demo, or required testing to add an unverified external provider.

---

## 4. Supported Files and Processing Limits

These are product guardrails selected for the hackathon, not universal standards. Tune them only with measurements and update the tests if they change.

### 4.1 Initial format matrix

- **Initial allowlist:** JPEG/JPG and PNG.
- **Conditional:** WebP only after the exact decoder and `c2pa-web` path pass the format-specific fixture tests.
- **Out of scope:** SVG, animated GIF/WebP, HEIC/HEIF, AVIF, TIFF, RAW formats, PDF, archives, and remote URLs.

The underlying C2PA libraries list more formats, but library-level format support does not by itself prove that the complete browser decoding, comparison, and UI workflow has been tested for that format. The application allowlist is determined by the tested end-to-end matrix, not by the longest list in the SDK docs.

C2PA supported formats documentation: <https://opensource.contentauthenticity.org/docs/sdk-repos/c2pa-js/supported-formats/>

### 4.2 Default limits

- Maximum compressed file size: **20 MiB per file**.
- Maximum decoded dimension budget: **20 megapixels per image** (`width × height`), using checked arithmetic and rejecting invalid/zero dimensions.
- Maximum two files in one comparison session.
- Maximum visual-difference preview budget: **1.2 megapixels per preview**; downsampling is only for a preview measurement and must be disclosed.
- Target timeout per local stage: **15 seconds**, subject to browser/device measurements. This is a product timeout, not a guarantee that every file must finish in that time.
- At most one active session and two concurrent image files for the MVP.

### 4.3 Limits and resource safety

- Check file byte size before reading the full file.
- Inspect a bounded header for signature/type signals; a signature alone does not prove a file is well formed.
- Decode using a maintained browser decoder or tested library; validate resulting dimensions before large canvas allocation.
- Never allocate a full-resolution 4-channel buffer for multiple 20-megapixel images simply to render the difference preview.
- Use a Worker/OffscreenCanvas when supported and tested; on unsupported browsers, use a bounded fallback or mark the visual-difference check unsupported.
- Web Crypto `SubtleCrypto.digest()` does not provide streaming input. The chosen 20 MiB cap bounds the buffer needed for SHA-256; run the hashing step away from the main UI thread where practical.
- Release `ImageBitmap` objects with `close()` where applicable, C2PA `Reader` objects with `free()`, object URLs with `URL.revokeObjectURL()`, and temporary buffers/references when the session is cleared.

Reference: <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>

---

## 5. User Experience and Screen Requirements

### 5.1 Screen A — Start

Must show:

- A short description: “Inspect provenance evidence; not a universal AI detector.”
- Supported file types and size/pixel limits.
- Separate actions for **Inspect one image** and **Compare two images**.
- A privacy notice explaining that ordinary checks run in the browser and identifying any optional external request before it occurs.
- A plain-language note that absence of evidence does not prove human creation.

Avoid “100% real,” “fake image detector,” “tampering confirmed,” and unsubstantiated percentage gauges.

### 5.2 Screen B — File preflight

Show the sanitized display name, byte size, detected format, and dimensions only after successful validation. Display an exact, recoverable error for unsupported, malformed, over-limit, or inconsistent files.

The application MUST NOT use the original filename as a filesystem path, database key, or HTML fragment. Avoid silently coercing a mismatched file into a supported type.

### 5.3 Screen C — Check progress

Each check must show two independent concepts:

1. **Execution state:** queued, running, completed, skipped, cancelled, failed, or timed out.
2. **Finding/outcome:** a check-specific result such as manifest absent, credential invalid, signer trust unknown, metadata extracted, or signal not detected.

A spinner is not a result. Do not show a green “safe” indicator while checks remain pending. A provider timeout must not block unrelated local results. “Cancel” should abort pending local work and signal cancellation to optional network requests where supported; if a remote request cannot be recalled, tell the user that cancellation stops local waiting but may not undo data already transmitted.

### 5.4 Screen D — Evidence Ledger report

The report page must contain:

1. **Coverage summary:** checks completed, skipped, unsupported, unavailable, cancelled, or failed.
2. **C2PA findings:** presence of an embedded manifest; actual validator findings; validation warnings; recorded assertions/actions/ingredients only when returned by the SDK; trust configuration used; unsupported or unverified subchecks.
3. **Metadata clues:** only allowlisted fields, marked unverified/editable. GPS hidden until an explicit reveal action and omitted from exports by default.
4. **File fingerprint:** SHA-256 of the original uploaded bytes, byte size, detected format, dimensions, and app/SDK versions where relevant.
5. **Provider findings:** only if a real, permitted adapter ran; identify the provider and exact signal covered.
6. **Provenance Delta:** only when two files were selected, including each file's fingerprint and comparable properties.
7. **Evidence explanation:** deterministic template by default; optional AI explanation tied to evidence IDs.
8. **Limitations:** state what was not checked, what the result does not prove, and whether trust evaluation needed an unavailable network resource.
9. **Actions:** Download JSON, optional print view, Clear session, and Inspect another file.

### 5.5 Screen E — Two-file comparison

- Display **File A** and **File B** by default. Do not presume which is original.
- Let users optionally label the files “original” and “edited”; mark these labels as user-provided.
- Show independent hashes, byte sizes, detected formats, dimensions, selected metadata differences, and C2PA states.
- If SHA-256 and file size match, label the files “matching SHA-256 fingerprint.” If exact byte equality is important, compare the original byte buffers; do not label hash equality alone as a mathematical proof of identity.
- A visual difference preview is allowed only through a documented, tested normalization path. It is a preview of decoded pixels at the displayed resolution, not evidence of intent, deception, or original file history.
- For the MVP, downscale both decoded images through the same tested browser pipeline to a maximum 1.2-megapixel preview while preserving aspect ratio. Run the metric only when the resulting preview dimensions match and each source image is within the pixel budget.
- Define the metric exactly: (a) normalized mean absolute RGB error across preview pixels and (b) the share of preview pixels where the maximum absolute RGB-channel difference is at least 16/255. Display the formulas/method in an information panel. These values are preview-level measurements, not authenticity probabilities or forensic scores.
- If aspect ratios differ beyond a documented tolerance, orientation cannot be handled consistently, color/decoder behavior is unsupported, or either decode fails, display side-by-side images and skip the metric with a reason. Do not silently stretch one image to fit the other.
- Disclose the preview normalization and decoder/version. Different JPEG encodings, resampling, color management, and compression may cause pixel differences without deceptive editing.
- Never say “tampering confirmed” merely because hashes or pixels differ.

### 5.6 Visual and accessibility requirements

- Clean, professional, evidence-dashboard design; restrained motion.
- Color is never the only way to communicate a result. Pair colors with clear text and icons.
- Every input and button has an accessible name; keyboard focus is visible.
- Status changes are announced to assistive technology without flooding announcements.
- Results remain usable at narrow mobile widths without horizontal overflow.
- Respect reduced-motion preferences; no animation may block validation progress.

---

## 6. Evidence Semantics and Trust Model

### 6.1 Evidence families

- **C2PA Content Credentials:** signed provenance records and associated assertions/ingredients that a compatible verifier can inspect.
- **Ordinary metadata:** file fields that can be absent, modified, copied, or misleading.
- **Watermark/provider result:** a provider-specific signal, scoped to that provider's actual coverage. This is not in the initial critical path.
- **File fingerprint:** SHA-256 of the exact input bytes; useful for identifying this file version, not for proving its origin.
- **Comparison evidence:** file-level, metadata, and preview-pixel measurements for two user-supplied files.
- **AI explanation:** non-authoritative prose that must trace back to existing findings.

### 6.2 C2PA states must remain separate

The UI and internal data model must distinguish at least:

- Embedded manifest: `present`, `not_present`, `unsupported`, or `error`.
- Manifest/claim validation: `valid`, `invalid`, `inconclusive`, `unsupported`, or `not_evaluated` as accurately mapped from the selected SDK.
- Signature validation: `valid`, `invalid`, `inconclusive`, or `not_evaluated` where available.
- Asset/content binding: `verified`, `failed`, `inconclusive`, or `not_evaluated` where available.
- Signer trust: `trusted`, `not_trusted`, `unknown`, or `not_evaluated` under the explicitly configured trust policy.
- Timestamp/revocation checks: display separate outcomes if the SDK provides them; otherwise state that they were not independently exposed/evaluated.
- Ingredients/actions: show recorded statements only when actually returned by the SDK; an assertion being recorded does not mean that the depicted event is independently true.

The C2PA specification distinguishes a valid manifest from a trusted manifest. Trust depends on the configured trust model, signer identity/credential, and relevant validation evidence. Parsing a manifest is not enough to label it trusted.

Reference: <https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html>

### 6.3 Embedded credentials only in MVP

The MVP inspects credentials embedded in the supplied file. It does not fetch external manifests, use cloud-based recovery, or search the web for durable credentials. Therefore, “not present” means **no supported embedded manifest was found by this check**, not “no provenance exists anywhere.”

### 6.4 Trust configuration

- Pin the C2PA SDK version and record it in reports.
- Configure trust evaluation through documented SDK settings and a documented, maintained trust source if supported.
- Never use an example domain, arbitrary certificate, or user-supplied certificate as a trusted root by default.
- If trusted anchors, timestamp validation, revocation data, or required network resources are unavailable, retain whatever other validation results are supported but report trust as unknown/not evaluated—not trusted.
- Record whether trust resources were current/reachable if the SDK exposes that information. Do not claim more detail than the SDK actually returns.
- Trust policy must be visible in the technical documentation and summarized in the report.

### 6.5 No global score or majority vote

Do not create a score like “92% real.” Different checks examine different signals and are not necessarily statistically independent. If providers disagree, show their results side by side with their scopes and limitations. Do not use a majority vote to turn disagreement into a truth verdict.

---

## 7. End-to-End Processing Pipeline

### Stage 0 — Consent and eligibility gates

- The default local workflow does not transmit image bytes.
- Network-based trust-anchor, timestamp, or revocation lookups are distinct from image upload, but may contact external services. Before running them, disclose the configured destination/purpose and let the user enable them; when disabled, set trust-dependent states to `not_evaluated`/`unknown`.
- External requests must be explicitly enabled and preceded by clear disclosure of the destination, data sent, purpose, and relevant retention terms.
- Meta Model API and partner access must comply with their current terms and the hackathon rules. If access is not permitted or is uncertain, do not create the integration by borrowing or misusing another person's account.

### Stage 1 — Intake and format validation

1. Accept only user-selected local files; no URL fetches in the MVP.
2. Reject empty files and files over 20 MiB before reading all bytes.
3. Sanitize the display name; never treat it as a storage path.
4. Compare extension, browser-reported MIME, bounded signature detection, and decoder result.
5. Determine a supported type from validated content and test policy; do not trust `File.type` or filename alone.
6. If extension/MIME/signature conflict, reject or show a recoverable unsupported-type error. Do not silently reinterpret arbitrary content.
7. Decode in a worker or bounded environment; reject malformed data, invalid dimensions, and images above 20 megapixels.
8. Pass the validated format explicitly to the C2PA SDK. Do not rely on SDK filename-extension heuristics when the original file's labels conflict with the detected content.
9. Preserve original bytes. Never re-encode or rotate the original object before fingerprinting or C2PA inspection.

### Stage 2 — Fingerprinting

- Compute SHA-256 over the exact uploaded bytes using Web Crypto, subject to the 20 MiB input cap.
- Run it off the main UI thread when practical.
- Label it “fingerprint of this exact file version.”
- Do not claim that the hash establishes who created the file, when the depicted event occurred, or whether the content is true.
- Do not send the hash externally unless a specific feature requires it and has been disclosed.

### Stage 3 — Metadata inspection

- Use one maintained, dependency-audited parser for the supported formats; do not write a broad custom EXIF/XMP parser during the hackathon.
- Read a narrow allowlist, for example capture time, software field, orientation, dimensions, and selected camera fields when present.
- Treat all values as unverified clues; validate strings/numbers and bound their lengths before display or export.
- Hide GPS/location data by default; exclude it from all exported reports unless the user expressly opts in.
- C2PA assertions and signer/certificate fields can contain names, copyright or other contextual information. Use an allowlist for the UI/export, label the field's source, and omit unnecessary identity/contact fields from exports by default. Do not infer that a listed signer is the human who took or depicted the image.
- Handle missing, malformed, duplicated, contradictory, out-of-range, and timezone-ambiguous fields.
- Do not treat file creation/modification timestamps as trusted timestamps.

### Stage 4 — C2PA reader and validator

- Use `@contentauth/c2pa-web` for browser processing after verifying the pinned version against the actual Next.js build and browsers.
- Research snapshot on 26 October 2026: the public npm package page showed version `0.15.4`; re-check the current published version before installation, select an exact version, and commit the lockfile. Never use `latest` as the locked dependency reference.
- `c2pa-web` requires WebAssembly and worker configuration. Its documentation includes bundler-specific examples; do not copy a Vite-only `?url` import into Next.js without validating it. Prefer a same-origin, version-matched WASM resource copied/served through a tested Next.js-compatible setup. Avoid an unpinned CDN resource.
- Initialize the SDK once per session/runtime as appropriate, pass the validated MIME/format, use documented `Reader` APIs, and call `reader.free()` in a `finally` block.
- Retrieve the manifest store/validation output and preserve the SDK's actual findings and error codes.
- Map the output to user-friendly labels in a separate presentation adapter. The mapping must be tested against fixtures and must never convert unknown or unsupported into success.
- If the SDK cannot parse or validate a supported file, mark that check unsupported/error/inconclusive as appropriate; continue safe independent checks.
- Do not create a custom cryptographic parser as a fallback.

Official SDK documentation: <https://opensource.contentauthenticity.org/docs/sdk-repos/c2pa-js/packages/c2pa-web/>  
Published package information: <https://www.npmjs.com/package/@contentauth/c2pa-web>

### Stage 5 — Optional external provider adapter (deferred)

Before implementing a provider-specific watermark or provenance adapter, verify all of the following from current official documentation and/or written provider authorization:

- A documented, permitted API/SDK exists for this exact use case.
- The endpoint accepts the intended file type and size.
- The endpoint's output semantics are understood and can be represented without exaggeration.
- Authentication, rate limits, cost/credits, retention, and privacy terms are known.
- Participant age/account eligibility and hackathon rules allow use.
- The chosen deployment can send the file within the endpoint and hosting limits.

If any item cannot be confirmed, do not implement the adapter. Mark it `skipped` or `unavailable`; never show mocked production findings. If integrated later, keep keys server-side, validate provider responses with a runtime schema, use bounded concurrency/retries, respect `Retry-After`, and never retry non-retryable validation or authorization failures.

### Stage 6 — Two-file Provenance Delta

For each file, independently complete intake, fingerprinting, metadata extraction, and C2PA checks. Never let File A's findings stand in for File B.

- Compare SHA-256 fingerprints, exact byte lengths, detected MIME, dimensions, selected metadata, and C2PA result summaries.
- Show the two files side by side. Do not infer which is original.
- Pixel-difference preview is limited to a maximum 1.2-megapixel preview and only runs if both files can be decoded through the tested same pipeline. Record that the metric describes the displayed normalized preview, not all original pixels.
- If aspect ratios differ, orientations cannot be normalized reliably, color handling differs, or either decode is unsupported, skip the metric and give a reason.
- Clearly distinguish byte/hash differences, metadata differences, and preview-pixel differences.
- Do not call any difference “tampering,” “fraud,” or “deception.”

### Stage 7 — Deterministic aggregation

- Aggregate only typed results; never aggregate from free-form model prose.
- Report the checks actually run and their individual findings.
- A failed non-critical check does not erase other successful results.
- Incomplete coverage must remain visible.
- A top-level summary may say “Verified provenance evidence found,” “No supported embedded credentials found,” “Evidence incomplete,” or “One or more validation issues require attention.” It must not say “Real” or “Fake.”
- Any summary rule must be covered by a unit test, especially mixed and partial-result cases.

### Stage 8 — Report export

- Generate the report from structured objects with runtime validation, not from unconstrained generated text.
- Include schema version, app version, creation time in UTC, file fingerprints, check IDs/states/outcomes, checker/provider and version, trust-policy identifier, warnings, evidence references, coverage gaps, and limitations.
- Exclude image bytes and precise GPS by default.
- Escape filenames and metadata as text; never inject them as HTML.
- Export JSON as P0. A print-friendly report may be added after P0; do not build a custom PDF pipeline unless time and tests support it.
- State that the report is an app-generated summary, not a digitally signed forensic certificate. The report file itself can be edited after download.

---

## 8. Architecture and Implementation Constraints

### 8.1 Recommended stack

- **Application:** Next.js App Router, React, TypeScript.
- **UI:** Tailwind CSS and accessible components.
- **C2PA:** `@contentauth/c2pa-web`, exact version pinned and tested.
- **Fingerprint:** browser Web Crypto SHA-256.
- **Metadata:** one maintained parser for the supported allowlist, selected after a dependency and compatibility check.
- **Image preview:** browser decoder plus canvas/OffscreenCanvas where supported; comparison preview is bounded and explicitly labelled.
- **Runtime schemas:** Zod or another maintained schema validator for report and external-model responses.
- **Testing:** Vitest for unit tests; Playwright for end-to-end flows.
- **Version control:** Git; commit lockfile and reproducible fixture manifest.
- **Deployment:** static/client-first hosting for local-only checks. Add a minimal server route only if the approved model explanation is used.

### 8.2 Browser-first design

Image bytes should remain in the browser for core checks. This:

- reduces privacy risk,
- avoids uploading image data to the app server,
- avoids common serverless request-body limitations, and
- keeps the default no-database deployment feasible.

If a Meta-model explanation is approved, send only a compact, validated JSON object containing normalized findings and evidence IDs—not the image and not the entire raw metadata dump. The server route must validate the request, enforce a body limit, authenticate to the approved API using a server-side secret, apply a timeout, validate the response, and return only the allowed output schema.

A hosting provider's current limits must be checked before any file upload is sent through its serverless function. For example, Vercel documents a 4.5 MB request/response body limit for Functions; the proposed 20 MiB image limit would exceed that if image bytes were routed through such a function. Therefore, the MVP must not proxy full image uploads through that route.

Reference: <https://vercel.com/docs/functions/limitations>

### 8.3 Module boundaries

```text
src/
  app/
    page.tsx
    api/explain/route.ts          # only if approved Meta-model access is enabled
  components/
    intake/
    check-progress/
    evidence-ledger/
    provenance-delta/
    report/
    privacy-disclosure/
  lib/
    intake/                       # size, signature, format, decode guardrails
    fingerprint/                   # original-byte SHA-256
    metadata/                      # allowlist parser and sanitization
    c2pa/                          # SDK initialization, reader, result mapping
    compare/                       # hashes, fields, preview-difference rules
    results/                       # schemas, execution states, aggregation
    report/                        # versioned serializer/export
    model-explainer/               # request schema, prompt, response validator
    security/                      # consent, redaction, safe errors, limits
  tests/
    unit/
    integration/
    e2e/
    fixtures/
      manifest.json                # source, hash, expected state, license/terms notes
```

The exact folder layout may change, but module boundaries should remain clear. UI components must not implement cryptographic validation or provider-state mapping themselves.

### 8.4 Dependency and runtime policy

- Use exact dependency versions and commit the lockfile.
- Before adding each new package, check maintenance status, license, security advisories, install scripts, runtime compatibility, and bundle impact.
- Verify the pinned C2PA version works in the current Node/Next.js build and supported browsers; do not assume the library's own build setup is the same as the app's setup.
- Add a browser smoke test that confirms the WASM asset loads, the worker starts, a reference fixture is read, and the reader is released without an unhandled error.
- Do not add a database, authentication provider, vector store, or analytics system to the MVP.

---

## 9. Typed Data Contracts

The previous version mixed progress/execution states with evidence outcomes. This version uses separate types. Implement them as runtime schemas as well as TypeScript types; TypeScript types alone do not validate runtime data.

### 9.1 Execution state

```ts
type ExecutionState =
  | 'queued'
  | 'running'
  | 'completed'
  | 'skipped'
  | 'cancelled'
  | 'failed'
  | 'timed_out';
```

### 9.2 Common outcome vocabulary

A check outcome is check-specific. Do not treat every outcome as interchangeable.

```ts
type CommonOutcome =
  | 'present'
  | 'not_present'
  | 'valid'
  | 'invalid'
  | 'trusted'
  | 'not_trusted'
  | 'unknown'
  | 'detected'
  | 'not_detected'
  | 'extracted'
  | 'equal'
  | 'different'
  | 'unsupported'
  | 'not_applicable'
  | 'inconclusive'
  | 'not_evaluated';
```

A result may use a narrower, check-specific schema. `unavailable`, `failed`, `cancelled`, and `timed_out` belong primarily to execution state, not to a claim about what the image contains. For UI convenience, a separate user-facing message may be derived from these values.

### 9.3 Check result

```ts
type CheckKind =
  | 'intake'
  | 'fingerprint'
  | 'metadata'
  | 'c2pa'
  | 'comparison'
  | 'meta_explanation';

type EvidenceItem = {
  evidenceId: string;
  sourceCheckId: string;
  key: string;
  value: string | number | boolean | null;
  valueType: 'text' | 'number' | 'boolean' | 'hash' | 'timestamp' | 'code';
  authority: 'cryptographic_validation' | 'provider_result' | 'file_measurement' | 'unverified_metadata' | 'model_explanation';
  interpretationCode?: string;
};

type CheckResult = {
  checkId: string;
  fileId?: string;
  kind: CheckKind;
  executionState: ExecutionState;
  outcome?: CommonOutcome;
  rawCode?: string; // only a bounded, sanitized SDK/provider code; never a raw payload
  checkerName: string;
  checkerVersion?: string;
  startedAtUtc?: string;
  finishedAtUtc?: string;
  evidence: EvidenceItem[];
  warnings: string[];
  limitations: string[];
  errorCode?: string; // stable internal code, not an exception dump
};
```

### 9.4 File record

```ts
type FileRecord = {
  fileId: string;                 // random session-only identifier
  displayName: string;            // sanitized display string, not a path
  detectedMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  byteSize: number;
  width: number;
  height: number;
  sha256: string;
  decodePipelineVersion: string;
  userLabel?: 'original' | 'edited'; // optional user assertion
};
```

If the conditional WebP path is not enabled, the runtime schema must reject `image/webp`; do not leave the type broader than the implemented allowlist.

### 9.5 C2PA result model

Store the SDK output in a bounded, normalized representation. Preserve the source validator code/path for every important status, but do not expose unfiltered raw manifests or unbounded strings in the UI.

```ts
type ValidationState = 'valid' | 'invalid' | 'unknown' | 'not_evaluated' | 'not_applicable';

type C2paFinding = {
  manifestPresence: 'present' | 'not_present' | 'unsupported' | 'error';
  manifestValidation: ValidationState;
  signatureValidation: ValidationState;
  contentBindingValidation: ValidationState;
  signerTrust: 'trusted' | 'not_trusted' | 'unknown' | 'not_evaluated';
  timestampValidation: ValidationState;
  revocationStatus: 'not_revoked' | 'revoked' | 'unknown' | 'not_evaluated';
  trustPolicyId: string;
  sdkVersion: string;
  sdkCodes: string[];              // allowlisted/sanitized codes only
  actions: Array<{ actionCode: string; sourceEvidenceId: string }>;
  ingredients: Array<{ relationship?: string; title?: string; sourceEvidenceId: string }>;
  warnings: string[];
};
```

**Important:** If the selected SDK does not expose one of these subchecks independently, set that field to `not_evaluated`/`unknown` according to the documented mapping and show that limitation. Do not synthesize a result to fill the schema. Refine the TypeScript schema to exactly match the supported SDK result and preserve unmapped states as an explicit `unknown` with a safe code.

### 9.6 Report contract

```ts
type OriginLensReport = {
  schemaVersion: '2.0';
  appVersion: string;
  reportId: string;                // random identifier, not a user identity
  createdAtUtc: string;
  files: FileRecord[];
  checks: CheckResult[];
  evidence: EvidenceItem[];
  summaryCodes: string[];           // controlled vocabulary, never real/fake
  trustPolicyId: string;
  disclaimers: string[];
  exportOptions: {
    includedOriginalImage: false;
    includedPreciseGps: false;
  };
};
```

Runtime validation MUST reject non-ISO timestamps, malformed hashes, negative/inconsistent dimensions, unsupported MIME values, oversized arrays/strings, unknown required enum values, duplicate evidence IDs, and evidence references to nonexistent check/file IDs. Enforce cross-field invariants: a completed check must have a supported outcome (including `inconclusive` when no stronger outcome is justified); a cancelled/skipped/failed check must not imply a successful finding; and every `fileId` must reference a file in the report. If a new SDK code appears, preserve it only as a bounded unknown code and show “needs interpretation” rather than silently mapping it to valid/trusted.

---

## 10. Model-Explanation Layer (Optional but Strategically Valuable)

### 10.1 Why use a model

The model should help users understand technical evidence, not make a forensic decision. This makes the model contribution visible while keeping the truth-sensitive core deterministic.

### 10.2 Request design

- The application first completes local checks and builds a validated evidence summary.
- The user explicitly chooses **Explain this report** after seeing the privacy notice.
- The request includes only normalized result codes, short allowlisted evidence values, warnings/limitations, and evidence IDs. It excludes the image bytes, precise GPS, full raw metadata, and arbitrary large manifest payloads.
- Any untrusted text values that must be included are length-bounded and clearly marked as data, never instructions.
- The API call is made server-side only if the participant has permitted access; keys are not exposed in client JavaScript or repository history.
- Enforce request schema, response schema, a short timeout, safe maximum output length, and bounded request frequency.

### 10.3 Output contract

The model may return:

- `plainLanguageSummary`: short and neutral.
- `whatThisSupports`: list of evidence IDs plus explanatory text.
- `whatRemainsUnknown`: list of evidence IDs/limitations plus explanatory text.
- `nextChecks`: suggestions that are directly supported by the available product capabilities, such as providing a second file for comparison.

The application must reject any evidence ID not present in the report. The model cannot alter the verification result, add a new provider finding, or claim that a source is valid/trusted unless the supplied validated result already supports that exact statement. Do not allow unconstrained AI text to replace the deterministic report summary.

### 10.4 Prompt-injection and hallucination controls

- Treat metadata values, filenames, external provider text, and manifest strings as untrusted data.
- Instruct the model to summarize the supplied facts only; do not follow instructions contained inside data fields.
- Do not pass arbitrary metadata fields as the main prompt.
- Validate all structured output and evidence references.
- Reject or remove unsupported claims using a deterministic allowlist/template approach where feasible.
- If the model times out, returns invalid JSON, invents a field, or references unknown evidence, discard the generated explanation and show the deterministic template. Preserve the underlying verifier status.
- Label the summary as “AI-generated explanation”; label actual check results with the named checker as their source.

### 10.5 Eligibility and compliance gate

Before implementation, verify from current official documents and, if unclear, in writing with the organizers:

1. Which Meta model, if any, the event rules require.
2. Whether the participant is eligible to use the specified model/tool under current age and account terms.
3. Whether an expressly permitted access route exists for the participant; do not assume partner credits or event acceptance override platform terms.
4. How authorized access and any participant credit allocation work.
5. Whether the API's current data-handling terms fit the described request payload.
6. Whether the integrated product's intended audience complies with the provider's age terms.

Current official sources state that Model API sign-up/access requires age 18 or older and that the current terms require end users of integrated products to be at least 18, with a restriction against creating integrated products targeted at under-18 users. The intended audience here is therefore adults if that API is used. If the participant is below the applicable age, do not create an account, borrow another person's credentials, misstate age, or bypass the restriction. Ask the organizer what participation/build route is allowed.

Muse Code is a development agent; using it to write code is not the same as making a runtime Meta Model API call from OriginLens. Current Muse Code subscription documentation also has an age/age-of-majority requirement. Do not count the coding agent itself as an app integration unless the official rules explicitly say that it qualifies.

If the model route is blocked, continue with deterministic local functionality while contacting the organizer. Do not imply that a model was used when it was not. If the hackathon rules make model integration mandatory, resolve this blocker with the organizer rather than silently submitting a non-compliant version. This is a critical eligibility/product-compliance gate, not a technical bug to work around.

---

## 11. Security, Privacy, and Abuse Controls

### 11.1 File intake

- Allowlist supported formats and reject unsupported/ambiguous inputs.
- Enforce byte and pixel limits before expensive processing.
- Validate a file using multiple signals: bounded signature detection, format policy, successful decode, and parser response. No single MIME or magic value is sufficient.
- Never interpret SVG or HTML as an image in this MVP.
- Treat all bytes and metadata as untrusted.
- Avoid arbitrary URL fetching, which would introduce SSRF and privacy risks.
- If any server-side temporary file is introduced, use a random generated path outside public static folders and delete it in a `finally`/cleanup path; verify deletion failures are logged without sensitive values.
- Cap active processing tasks and release resources on cancellation, navigation, or error.

### 11.2 Client-side privacy

- No login, no persistent media history, no database, and no analytics that record filenames or image metadata by default.
- Keep file bytes and previews in volatile session memory; never store them in localStorage or IndexedDB.
- Hide GPS/location metadata by default; omit it from exports unless the user explicitly reveals and chooses to export it.
- C2PA assertions and signer/certificate fields can contain names, copyright or other contextual information. Use an allowlist for UI/export, label field sources, and omit unnecessary identity/contact fields from exports by default. Do not infer that a listed signer is the human who took or depicted the image.
- Before an external request, disclose the provider, data sent, purpose, and relevant retention/privacy terms; obtain deliberate user consent.
- A provider may retain request logs outside OriginLens's control. State known limitations honestly.
- Clear results, object URLs, image buffers/references, readers, and preview objects when the session resets.

### 11.3 Browser and API security

- Render all filenames, metadata, and provider text as text; never inject them as raw HTML.
- Validate runtime input and output schemas at all trust boundaries.
- Use same-origin WASM resources where feasible, and define/test a Content Security Policy that permits only the required script, worker, WASM, and API sources. Do not weaken CSP broadly to make a build pass.
- Add appropriate security headers and restrict API routes to same-origin requests where practical.
- Keep secrets in server-only environment variables; check production bundles and source maps for secret leakage.
- Apply small request-body limits to the model-explanation route, even if expected payloads are small.
- Use bounded timeouts, concurrency, and retries. Redact secrets from all error messages.
- Audit dependencies before release; fix or document any severe findings.

### 11.4 Optional-provider security

If a future verifier accepts the original image, use it only after the user has opted in and the provider's terms, access eligibility, file limits, and storage behavior are known. Do not proxy an image larger than the deployed server's request-body limit. Never expose API keys to the browser. A missing key is `unavailable`, not `not_detected`.

### 11.5 AI security

The model is not a validator and must have no authority to change evidence status. Treat model input as structured data, validate output, use evidence IDs, and fail closed to deterministic explanations. Do not use the model to infer identity, personal characteristics, intention, or truth of the depicted event.

---

## 12. Execution States, Errors, and Recovery

### 12.1 Execution states

| State | Meaning | UI behavior |
|---|---|---|
| `queued` | Check has not started | Neutral pending label |
| `running` | Check is in progress | Show progress where measurable; never invent a percentage |
| `completed` | Check finished and produced a supported outcome | Display its outcome separately |
| `skipped` | Check was not run by choice or design | State the reason where known |
| `cancelled` | User/session cancellation stopped or abandoned work | Clarify whether an external request may already have been sent |
| `failed` | Unexpected or permanent failure | Show safe stable code and retry guidance if useful |
| `timed_out` | Configured deadline elapsed | Preserve other completed results; bounded retry only if appropriate |

### 12.2 Required error mapping

| Condition | Required behavior |
|---|---|
| Empty file | Reject before parsing; do not crash |
| Over 20 MiB | Reject before full read |
| Invalid/mismatched format | Reject or clearly mark unsupported using actual content validation |
| Decoder throws on malformed/truncated data | Stop that path; show recoverable error; other safe checks may continue only if validated |
| Pixel budget exceeded | Reject before expensive rendering/comparison |
| No embedded C2PA manifest | Outcome `not_present`; continue hash and metadata checks |
| C2PA invalid/error code | Preserve exact validator state/code; never auto-label “fake” |
| Signer trust unavailable | Show `unknown`/`not_evaluated`; do not call it trusted |
| WASM/worker fails to initialize | Mark C2PA check unavailable/error; do not crash the app |
| Trust-resource network failure | Show which trust-dependent state is unknown; keep independent local findings |
| Metadata parser fails | Mark metadata check failed/inconclusive; other independent checks continue |
| Browser offline | Continue supported local checks; network-dependent checks unavailable |
| API key absent/unauthorized | Disable or mark model/provider unavailable; never fake a result |
| HTTP 400/unsupported format | Do not retry unchanged input; explain supported input limits |
| HTTP 401/403 | Stop retries; report authorization/configuration problem without secrets |
| HTTP 404/endpoint removed | Disable adapter until docs/endpoint are re-verified |
| HTTP 429 | Respect provider `Retry-After`; bounded retry only when valid |
| HTTP 5xx or transient network error | Bounded backoff; end as failed/timed out without losing local results |
| Invalid provider JSON/schema | Reject response; show safe error; do not invent a fallback result |
| Unexpected SDK status code | Keep bounded raw code as unknown; do not map it to success |
| User cancels mid-check | Abort local work where possible; mark unstarted work skipped and interrupted work cancelled |
| Report serialization/download fails | Show failure, keep on-screen report, and allow retry |
| Page reset/navigation | Release resources; no persistent media should remain by design |
| LLM hallucination/unknown evidence ID | Discard explanation and use deterministic templates |

Never retry indefinitely. Retry rules must follow the chosen provider's current official documentation.

---

## 13. Edge-Case Matrix

These cases are in scope for either automated tests or explicit release notes. A failure mode may be marked unsupported; it must not silently produce a success result.

1. **No metadata:** say that no selected fields were found; do not claim deliberate metadata stripping.
2. **Metadata mentions an editor but no C2PA credential exists:** present it only as an unverified clue.
3. **No embedded C2PA manifest:** continue the remaining pipeline and state that remote/durable credentials were not searched.
4. **Malformed manifest:** preserve the SDK result and safe warning; do not invent a custom parse result.
5. **Invalid signature/content binding:** explain the actual failed validation component; do not equate this automatically with malice.
6. **Valid signature but signer trust unknown:** separate signature validity from trust policy outcome.
7. **Trust list unavailable:** report the trust-dependent result as unknown/not evaluated if the SDK does not establish it.
8. **Valid provenance says “AI-generated”:** report what the signed record states; do not claim the depicted event is true.
9. **No provider watermark detected:** only say the named enabled provider did not detect its supported signal.
10. **Provider absent, inaccessible, or unconfigured:** `unavailable`/`skipped`, never `not_detected`.
11. **Screenshot/recompression has removed credentials:** report that no embedded manifest was found; do not assign motive.
12. **Cropped/resized/re-encoded image:** use the real validator output; do not predict whether credentials will survive.
13. **Same input chosen twice:** matching fingerprints shown; skip redundant pixel preview where safe.
14. **Same visible picture with different encoding/metadata:** report byte differences and preview differences separately.
15. **Different dimensions/aspect ratios:** do not silently normalize and claim an exact pixel comparison.
16. **Unusual EXIF orientation or color profile:** define the preview transform; skip visual-difference metrics if consistent processing cannot be guaranteed.
17. **Animated or unsupported WebP:** reject/unsupported according to the tested allowlist; do not decode only a first frame and imply the whole asset was checked.
18. **Mismatched filename extension/MIME/signature:** reject with a clear reason; do not trust the filename when passing a format to the SDK.
19. **Truncated image:** safe decoder/parser error with no blank page or uncaught exception.
20. **Decompression bomb/high-pixel image:** pixel guard must execute before full-resolution canvas allocation.
21. **Filename or metadata contains HTML/script text:** render escaped text; no script execution.
22. **GPS/location EXIF exists:** hidden by default; absent from report unless explicit export consent is given.
23. **Provider results disagree:** preserve each provider's scope and result; no majority vote.
24. **Provider adds unknown field or changes schema:** runtime validation prevents UI failure; mark check failed/unknown safely.
25. **Worker/WASM blocked by browser/CSP:** show C2PA unavailable/error and keep the rest usable.
26. **External trust check unavailable offline:** do not state signer trust as verified.
27. **Device clock/timezone differs:** store timestamps in UTC and show the display timezone explicitly.
28. **User refreshes/closes the tab:** no persistent media is expected; state that in-memory results are lost.
29. **Same filename used for two different inputs:** use random file IDs and hashes internally; filename is not identity.
30. **External service changes endpoint, terms, or response semantics:** disable adapter until re-verified.
31. **Model follows hostile text embedded in metadata:** input is minimized; model output must cite known evidence IDs; fail to template if it makes unsupported claims.
32. **Model timeout, refusal, malformed output, or quota exhaustion:** show deterministic explanation and preserve all check results.
33. **Report contains an unknown status code:** schema allows a safe unknown mapping; do not default it to valid.
34. **Report has missing/duplicate evidence references:** validation fails, and no misleading report is downloaded.
35. **Clear session during work:** cancel work, release resources, and avoid stale results being attached to the next image.
36. **Hash input accidentally uses preview bytes:** regression test must prove hash runs on original `File` bytes.
37. **File has a valid manifest but unusual/unrecognized signer:** show what validator establishes and what the trust policy does not establish.
38. **No check completes successfully:** report low/no coverage; never fall back to a global authenticity claim.
39. **Two files are labelled original/edited by the user:** visibly mark labels as user-supplied, not verified chronology.
40. **Downloaded report is later edited:** disclaimer says it is not digitally signed or tamper-proof.

---

## 14. Verification & Validation Plan

### 14.1 Test principles

- Every displayed check result must trace to a deterministic local check or an actual provider response.
- Every state mapping must have tests, including unexpected values.
- Fixtures must have a provenance record: source URL or creation method, licence/usage notes, exact SHA-256, expected state, and the reference verifier/version used to establish that expected state.
- A fixture's filename is never the evidence for its expected result.
- Test output must be captured from the actual implementation; this document does not claim tests already pass.

### 14.2 Fixture set

Create `tests/fixtures/manifest.json` with a record for each fixture. Start with the official C2PA public sample referenced in the SDK docs, then verify the exact validation/trust outcomes using the pinned SDK and, where practical, a second reference validator. Do not assume a random image has a valid or trusted credential.

Candidate official sample documented by the SDK: `https://spec.c2pa.org/public-testfiles/image/jpeg/adobe-20220124-C.jpg`.

Required fixture categories:

- Valid supported image with a C2PA credential and known expected validator output, if an authorized fixture is available.
- Valid credential with signer-trust state recorded under the test trust policy.
- Image with no embedded credential.
- Invalid or mutated credential fixture whose expected SDK output has been confirmed in advance.
- Metadata-only image with selected fields and a GPS privacy fixture.
- Same exact bytes duplicated under another display filename.
- Same visual source saved in two encodings.
- Same dimensions and aspect ratio with known preview differences.
- Different dimensions/orientation.
- Unsupported, malformed, truncated, mislabeled, over-size, and high-pixel-count files.
- Provider fixtures only if an authorized provider exists; mocks must be test-only and must never appear as live production findings.

### 14.3 Test categories

- **Unit:** validation and state mapping, hash calculation, metadata allowlist, redaction, report schema, aggregation, evidence-ID mapping, retry policy.
- **Integration:** actual pinned C2PA SDK with real fixtures; WASM/worker initialization; metadata parser; local comparison pipeline.
- **End-to-end:** upload, preflight rejection, progress, report, comparison, clear session, offline mode, keyboard controls, responsive layout.
- **Security:** extension/MIME spoofing, malformed files, high dimensions, hostile metadata, report injection, API key leak scan, dependency review.
- **Manual:** real browser smoke test, 16 GB Windows laptop, narrow viewport, network interruption, reduced motion, keyboard-only use.
- **Model (if enabled):** schema compliance, unknown evidence IDs, prompt injection in metadata, invalid JSON, timeout/quota failure, unsupported claim regression.

### 14.4 Acceptance test matrix

| ID | Scenario | Expected pass condition |
|---|---|---|
| V01 | Valid JPEG within limits | Accepted; dimensions, SHA-256, and enabled checks appear |
| V02 | Valid PNG with no embedded manifest | C2PA `not_present`; hash/metadata still complete |
| V03 | Known supported C2PA fixture | UI matches recorded expected SDK outcome exactly |
| V04 | Invalid credential fixture | Actual invalid/error state displayed; no universal fake label |
| V05 | Valid signature with unknown signer trust | Signature and trust are shown separately |
| V06 | Trust resources unavailable | Trust remains unknown/not evaluated; no false trusted badge |
| V07 | Missing metadata | No fabricated fields or dates |
| V08 | GPS metadata | Hidden by default and excluded from export |
| V09 | No provider configured | Provider check shown as skipped/unavailable, not not-detected |
| V10 | Model explainer unavailable | Deterministic explanation remains usable |
| V11 | File exceeds 20 MiB | Rejected before full processing |
| V12 | File exceeds 20 MP | Rejected before high-memory comparison allocation |
| V13 | `.jpg` name with PNG bytes or vice versa | Mismatch handled safely; no silent type reinterpretation |
| V14 | Unsupported signature/format | Clear unsupported result; no crash |
| V15 | Corrupt/truncated file | Recoverable error state |
| V16 | Malicious filename/metadata | No HTML/script execution |
| V17 | Duplicate exact file | Matching hash/fingerprint and no false pixel-difference claim |
| V18 | Same image, different encoding | Byte/hash difference and preview result remain separate |
| V19 | Different dimensions/aspect ratios | No misleading exact pixel metric |
| V20 | EXIF orientation/color handling differs | Preview transform documented or difference metric skipped |
| V21 | SHA-256 of original vs preview | Test confirms hash is from original bytes |
| V22 | SDK WASM resource missing | C2PA error shown; app remains recoverable |
| V23 | SDK reader cleanup after success | Reader released; repeat runs do not leak resources visibly |
| V24 | SDK reader cleanup after exception | `free()` cleanup path runs where a reader was created |
| V25 | Browser offline | Local checks work where possible; network-dependent trust is unknown |
| V26 | User cancels during work | Pending tasks stop where possible; states remain correct |
| V27 | Unknown SDK code | Safe unknown mapping; never defaults to valid/trusted |
| V28 | Provider 429 (only if integrated) | Bounded retry follows `Retry-After`; no retry storm |
| V29 | Provider 401/403 (only if integrated) | No retry loop; secrets not exposed |
| V30 | Provider 5xx/timeout (only if integrated) | Bounded recovery; local results preserved |
| V31 | Invalid provider schema (only if integrated) | Response rejected; no invented result |
| V32 | Unknown provider field | UI stable; unexpected field is not rendered as trusted evidence |
| V33 | Report passes runtime schema | Correct schema/version and all references resolve |
| V34 | Report contains unsupported status/reference | Download blocked; safe error shown |
| V35 | Report download fails | UI does not claim success; user can retry |
| V36 | Clear session | Preview URLs, images, results, and SDK resources are released/cleared as applicable |
| V37 | Mobile viewport | Core workflow usable without horizontal overflow |
| V38 | Keyboard-only use | All interactive controls reachable with visible focus and labels |
| V39 | Model invents unsupported claim (if enabled) | Output rejected or reduced to template; evidence status unchanged |
| V40 | Model emits unknown evidence ID (if enabled) | Explanation rejected; template fallback used |
| V41 | Model returns malformed JSON/timeout (if enabled) | Template fallback used; core report still works |
| V42 | Critical dependency audit issue | Release blocked until fixed or explicitly reviewed and accepted |
| V43 | API secret scan | No secret in client bundle, source maps, or public repository history |
| V44 | External-call disclosure | Disclosure and explicit consent precede every outbound media/evidence call as specified |
| V45 | No check yields a finding | Report states coverage is insufficient; no real/fake fallback |
| V46 | Two providers disagree (if integrated) | Each result stays separate; no majority-vote conclusion |
| V47 | Timezones differ | UTC stored; displayed timezone labelled |
| V48 | Same filename, different files | Unique session IDs and hashes remain separate |
| V49 | User-provided original/edited labels | Labels clearly identify the user's assertion |
| V50 | Unsupported C2PA file variant | C2PA check is unsupported/error; other safe checks continue |

### 14.5 Release gates

Do not call the MVP ready until:

- All release-critical tests pass on the implementation being submitted.
- No uncaught exception or blank state occurs in the tested malformed-file corpus.
- Every result shown in production traces to an actual local verifier or actual provider response.
- Missing, unsupported, unavailable, not-detected, invalid, and trust-unknown states remain distinct.
- C2PA runtime, WASM, worker, and reader cleanup pass integration tests.
- No original image is sent externally without explicit disclosure and user action.
- No provider secret appears in a client bundle, log, or public repository.
- The report omits original image bytes and precise GPS by default.
- No interface or report uses a universal real/fake claim or unsupported confidence percentage.
- Keyboard navigation and narrow-screen behavior have been checked.
- A demo is rehearsed against known fixtures with expected results recorded in advance.

---

## 15. Metrics and Definition of Done

### 15.1 Measured engineering targets

- 100% pass rate on release-critical tests before submission.
- Zero known cases where `not_detected` is presented as “human-created.”
- Zero known cases where an invalid credential is automatically described as proof of malicious tampering.
- 100% of reports state which checks ran or did not run.
- 100% of external calls have disclosure/consent where required.
- Zero unresolved severe crashes/security issues in the tested corpus.
- A first-time demo user can complete the core inspection flow without developer assistance.
- Core local functionality remains available when a model/provider endpoint is down.

These are release targets, not claims of achieved performance. Runtime latency must be measured on the actual demo laptop and sample files. Do not promise universal processing speed.

### 15.2 Definition of Done

A user can:

1. Upload a supported image and receive precise preflight feedback.
2. View SHA-256 for the exact original file bytes.
3. Inspect embedded C2PA findings with actual SDK states preserved and trust limitations explained.
4. View selected metadata as unverified clues, with GPS hidden by default.
5. Compare two files without treating a hash or pixel difference as proof of deceptive editing.
6. See an Evidence Ledger that links each explanation to concrete evidence.
7. Download a structured, versioned report with coverage, source/version, timestamps, limitations, and no image by default.
8. Clear the session without persistent image storage.
9. Recover safely from all release-critical test cases.
10. If enabled, receive a grounded AI explanation whose evidence references are validated and whose failure does not change the underlying findings.

---

## 16. Ten-Day Execution Plan

The public event page lists the submission deadline as 4 November 2026 at 9:00 PM Eastern Time. Because dates/rules can change, check the participant dashboard before submission. On the date of this plan, the equivalent India time for 9:00 PM EST on 4 November is 7:30 AM IST on 5 November. Treat the portal's displayed deadline and timezone as final.

| Day | Date | Deliverable | Stop condition |
|---|---|---|---|
| 1 | Oct 26 | Confirm official rules, track, model-access route, create repo, lock P0 scope, wireframe and schema | Do not assume model/API access or requirement; ask organizers immediately if unclear |
| 2 | Oct 27 | File intake, format guardrails, limits, SHA-256, safe filename display | V01/V11–V16 pass locally |
| 3 | Oct 28 | Metadata allowlist, GPS privacy, clear-session lifecycle | V07/V08/V36 pass |
| 4 | Oct 29 | C2PA SDK initialization, WASM/worker path, one verified fixture | Smoke test works in the actual Next.js build |
| 5 | Oct 30 | C2PA state mapping, trust limitations, Evidence Ledger | Valid/invalid/unknown/not-present remain distinct |
| 6 | Oct 31 | Two-file Provenance Delta, hashes, metadata compare, preview-difference guardrails | Different sizes/aspect ratios never get a misleading metric |
| 7 | Nov 1 | JSON report, runtime schema, limitations, stable error codes | V33–V36 pass |
| 8 | Nov 2 | Approved Meta-model explanation if access permits; otherwise polish report/accessibility | Model cannot override evidence; do not fake an integration |
| 9 | Nov 3 | Adversarial tests, dependency review, browser/mobile QA, rehearsal | All critical release gates pass or feature is removed |
| 10 | Nov 4 | Freeze scope, fix only release blockers, submit with time buffer | Verify portal requirements and receive submission confirmation |

### Scope fallback

If C2PA browser integration consumes more time than expected, preserve file intake, hash, metadata, report structure, and comparison, but **do not describe the app as having validated C2PA credentials unless the SDK actually ran and its result was tested**. If model access is blocked, do not claim model integration; resolve compliance with the organizer. If the event rules require a model integration, this is a submission-critical question.

---

## 17. Three- to Four-Minute Demo Script

Prepare three real fixtures and record their exact expected results before the demo.

1. **Problem and promise (20 seconds):** “OriginLens doesn't guess whether an image is real. It shows what its evidence supports and what remains unknown.”
2. **Known provenance fixture (45 seconds):** Upload a supported file with a verified C2PA credential. Show the actual validation output, separate trust state, and evidence references.
3. **Evidence absence (30 seconds):** Upload a file without an embedded manifest. Demonstrate that the interface says `not present`, not “human-created.”
4. **Provenance Delta (60 seconds):** Compare an original file candidate and a re-encoded/edited copy. Show hash, metadata, C2PA state, and a preview difference only if supported. Make clear that the app does not infer intent or chronology.
5. **Failure without collapse (30 seconds):** Demonstrate a genuine unsupported/unavailable check or use an automated test-only mock in a clearly labelled developer/test screen—not as a real production finding. Show that independent results remain available.
6. **Report (30 seconds):** Download JSON and show timestamps, checker version, evidence IDs, coverage, and limitations.
7. **Model contribution (optional, 20 seconds):** If an authorized Meta model integration is enabled, show how it explains the structured evidence and cannot change the underlying status.
8. **Close (10 seconds):** “One image can have recorded provenance evidence, missing evidence, or conflicting/unknown checks. OriginLens keeps those distinctions visible.”

Never improvise an expected validation result from a filename. If a fixture's result is uncertain, do not use it for the judging demo.

---

## 18. Risk Register

| ID | Risk | Severity | Mitigation / owner action |
|---|---|---|---|
| R-01 | Meta-model/API access, participant age eligibility, or product audience terms are not confirmed | Critical | Current Meta guidance says API access requires age 18+ and integrated products must comply with adult end-user/target-audience terms; verify with organizers immediately; do not bypass restrictions or use another person's credentials |
| R-02 | Official rules impose a model requirement not yet reflected in this draft | Critical | Read/accept the actual rules and check the submission portal before feature freeze |
| R-03 | Next.js bundler cannot load the pinned C2PA WASM/worker with assumed configuration | High | Day-1/Day-4 spike; use documented, version-matched same-origin resources; keep a verified smoke test |
| R-04 | SDK returns statuses not mapped by the app | High | Preserve unknown code and show unknown; test every mapping; never default to success |
| R-05 | Trust anchors/revocation data unavailable | High | Separate validity from trust; report unknown when needed; document exact trust policy |
| R-06 | Core feature set looks too similar to existing provenance viewers | High | Make Evidence Ledger and Provenance Delta the demo center; avoid claims of global novelty |
| R-07 | Visual-diff preview implies forensic certainty | High | Downsample, explain normalization, skip unsupported cases, and prohibit tampering verdicts |
| R-08 | A provider-specific API is unavailable or its terms change | Medium | Do not make it a critical path; verify access and disable safely on drift |
| R-09 | Large/malformed image consumes memory or freezes browser | High | 20 MiB/20 MP guardrails, worker, preview budget, timeouts, adversarial tests |
| R-10 | Report leaks GPS or image data | High | GPS hidden and excluded by default; no image in report; runtime schema and export tests |
| R-11 | Model hallucinates or is prompt-injected through metadata | High | Minimize input; validate evidence references; deterministic authority; template fallback |
| R-12 | Dependency vulnerability or install-script risk | Medium/High | Audit package before install and before submission; pin versions; remove unnecessary dependencies |
| R-13 | Time lost to styling or deferred features | High | P0-first roadmap; freeze scope by Day 7; remove unverified features instead of faking completion |
| R-14 | Judges cannot reproduce the demo or expected results are uncertain | High | Versioned fixture manifest, rehearsed happy path and fallback fixture, capture actual test results |

---

## 19. Coding-Agent Instructions (Muse Code or Another Authorized Agent)

Use this section as the working instruction set for the coding agent. The agent is an implementation assistant, not a source of truth for SDK capabilities or security claims.

1. Read this specification fully before editing; list the planned files and acceptance tests first.
2. Inspect the existing repository before replacing files. Preserve working configuration unless a change is justified.
3. Implement P0 in small, testable steps; do not create P1/P2 features while P0 has failing release-critical tests.
4. Verify APIs against the pinned package's official versioned documentation and TypeScript declarations. Do not copy examples from another bundler without testing them in Next.js.
5. Do not invent SDK methods, API endpoints, free credits, model access, provider responses, or validation outcomes.
6. Do not simulate provider/C2PA success in production code. Test-only mocks must be isolated and labelled.
7. Add a regression test for every discovered defect.
8. Never store image bytes, precise GPS, API secrets, or raw provider payloads in public logs/reports by default.
9. Keep verification states deterministic; a language model must never override them.
10. Run tests, lint, type checks, dependency checks, and production build after each major integration.
11. Record test output honestly. Report passed, failed, skipped, and unexecuted tests separately.
12. Do not declare the application production-ready solely because the development server starts.

### Required commands to define in `package.json`

The exact scripts should match the selected toolchain, but provide equivalents for:

- `dev` — local development server.
- `build` — production build.
- `start` — production server, if required by deployment.
- `lint` — static code/style checks.
- `typecheck` — TypeScript checks.
- `test` — unit/integration tests.
- `test:e2e` — Playwright core flow.
- `audit` — dependency audit using the chosen package manager's supported command.

A command may be omitted only if the corresponding tool is intentionally not used; document the reason.

---

## 20. Definition of Success and Honest Claims

The hackathon MVP succeeds when it demonstrates a useful, working, and test-backed evidence workflow—not when it returns the largest number of AI labels.

The strongest honest claims OriginLens may make after the relevant tests pass are:

- “It inspects supported embedded C2PA credentials using a named, pinned validator.”
- “It keeps credential validity, signer trust, and unknown states separate.”
- “It compares two supplied image versions using reproducible file-level properties and a bounded preview method.”
- “It produces a report that identifies which checks actually ran and what they do not prove.”
- “It uses an authorized Meta model to explain structured evidence,” **only if that integration is implemented, permitted, and demonstrated.**

Do not claim universal AI detection, total editing-history recovery, real/fake certainty, forensic certification, or global uniqueness. A high-quality judge experience comes from a clear problem, one distinctive workflow, visibly correct evidence handling, honest limitations, and a demo that works consistently.

---

## 21. Official References and Verification Snapshot

Research snapshot: **26 October 2026**. Re-check documentation before installation/submission because APIs, versions, terms, and access can change.

1. **Meta Global AI Developer Hackathon — tracks, themes, public judging description, and dates:** https://dev.meta.ai/events/global-hackathon
2. **C2PA Specification 2.5 — trust model and validation:** https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html
3. **C2PA Content Credentials specification:** https://spec.c2pa.org/specifications/specifications/2.5/specs/ContentCredentials.html
4. **CAI open-source SDK documentation:** https://opensource.contentauthenticity.org/docs/
5. **`c2pa-web` browser SDK documentation:** https://opensource.contentauthenticity.org/docs/sdk-repos/c2pa-js/packages/c2pa-web/
6. **C2PA SDK supported formats:** https://opensource.contentauthenticity.org/docs/sdk-repos/c2pa-js/supported-formats/
7. **`@contentauth/c2pa-web` npm package and current version information:** https://www.npmjs.com/package/@contentauth/c2pa-web
8. **C2PA JavaScript SDK releases:** https://github.com/contentauth/c2pa-js/releases
9. **MDN Web Crypto `SubtleCrypto.digest()`:** https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
10. **Vercel Functions limitations (including request-body size):** https://vercel.com/docs/functions/limitations
11. **OWASP File Upload Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
12. **OWASP Input Validation Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
13. **C2PA trust-list documentation:** https://opensource.contentauthenticity.org/docs/conformance/trust-lists/
14. **Meta Model API documentation / quickstart:** https://dev.meta.ai/docs/quickstart
15. **Model API account age requirement:** https://dev.meta.ai/help/accounts-and-login/age-requirement
16. **Model API Terms of Service:** https://dev.meta.ai/legal/terms-of-service
17. **Muse Code subscription and age requirement:** https://dev.meta.ai/help/subscriptions/subscribe-to-muse-code

The official references above support the technical direction, but they do not replace implementation tests. Verify the current dependency version, the exact file-format/build combination, permitted API access, the current hackathon rules, and the submission portal before making compliance or capability claims.
