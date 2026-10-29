# OriginLens

> **Evidence-First Media Provenance Explorer**  
> Inspect supported image provenance evidence and compare two independent files without guessing origin, chronology, authorship, or scene truth.

[![C2PA](https://img.shields.io/badge/C2PA-0.15.4-green.svg)](https://contentauthenticity.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## Overview

In an era of generative AI and manipulated media, most "AI detection" or "authenticity verification" tools rely on opaque classifiers that make probabilistic guesses. When an image lacks metadata, they often mislabel it as "human-made," and when a hash differs, they jump to unsupported accusations of fraud.

**OriginLens** takes a fundamentally different, **evidence-first** approach:
1. **Evidence Ledger:** Every finding traces directly to a real check, evidence ID, and validation standard.
2. **Provenance Delta:** Compare two images side-by-side without presuming an "original" or inferring intent.
3. **Honest Uncertainty:** Never convert absent evidence into a claim of authenticity; distinguish between signature validity and signer trust; explicitly disclose what was not checked.
4. **Local-First Privacy:** File intake, hashing, EXIF extraction, and C2PA reading run in the browser in volatile memory. Image bytes are not uploaded. The only outbound feature is the optional model explanation, which sends bounded check data after explicit consent and never sends image bytes or metadata values.

---

## Key Features

### 🔍 Single-File Evidence Ledger
- **C2PA Credential Inspection:** Reads Content Credentials via the pinned official `@contentauth/c2pa-web` WebAssembly SDK. Reports manifest presence, manifest validation, claim-signature validation, and content binding as separate states. Signer trust is reported as `Not evaluated` because this build configures no trust anchors.
- **EXIF & Metadata Clues:** Extracts camera, lens, timestamp, and copyright fields while treating them as non-cryptographic clues.
- **Privacy Masking:** Precise GPS coordinates are masked by default and excluded from exported reports.
- **Deterministic SHA-256:** Fingerprints the exact uploaded file bytes before any decode or preview transform.

### ⚖️ Provenance Delta (Comparison)
- **Independent Analysis:** Analyzes File A and File B separately with isolated session contexts.
- **Side-by-Side Property Matrix:** Compares byte lengths, MIME formats, dimensions, and hashes.
- **Normalized Preview Metric:** Computes peak channel difference and percentage of differing pixels across normalized previews (skipped if aspect ratios differ or EXIF orientation is not normalized).
- **User Assertions:** Allows user to label candidates (e.g. "original" vs "edited") while explicitly marking them as user assertions—never endorsed as system fact.

### 🤖 Optional Model Explanation (P1-001, disabled by default)
- **Plain-Language Explanation:** When a deployment enables a model, the server can explain recorded check states in clear prose. With no model configured, a deterministic template is returned.
- **Evidence ID Traceability:** Explanations may only cite evidence IDs that exist in the request, and every citation is checked before display.
- **Anti-Hallucination & Anti-Injection Guards:** Strict server-side Zod validation plus a forbidden-claim scanner rejecting authenticity, forgery, tampering, and "verified by Meta" style assertions.
- **Bounded Data:** The request contains check states, evidence identifiers and keys, the SHA-256 fingerprint, byte size, dimensions, and the user's question. It excludes image bytes, previews, GPS, filenames, metadata values, and manifest text.
- **Deterministic Fallback:** Reverts to a rule-based template if the model is disabled, unconfigured, slow, malformed, or returns a forbidden claim.
- **Provider status:** The live provider path is unverified and must not be claimed as working. See `docs/implementation/compliance-checklist.md`.

### 🛡️ Defensive Engineering
- **Strict Intake Guardrails:** Rejects files exceeding 20 MiB or 20 megapixels; validates magic bytes (JPEG/PNG); rejects SVGs and animated formats.
- **Safe Failure:** Corrupted files fail cleanly with stable error codes (e.g. `PIPELINE_DECODE_FAILED`) without crashing the session.
- **Auditable Reports:** Exports versioned JSON reports conforming to the PRD v2.0 specification, with `includedOriginalImage: false` and `includedPreciseGps: false`.

---

## Architecture

OriginLens is built on **Next.js (App Router)** with **TypeScript**. File inspection is client-side; an optional, server-side model-explanation route is disabled by default:

```
src/
├── app/
│   ├── api/explain/      # Optional server-side model explanation (disabled by default)
│   ├── how-to-use/       # Step-by-step user guide & FAQ
│   ├── privacy/          # Local-first privacy policy
│   ├── globals.css       # Unified design system & responsive styling
│   └── layout.tsx        # App shell with SiteHeader and SiteFooter
├── components/
│   ├── navigation/       # SiteHeader, SiteFooter, and responsive navigation
│   └── inspector/        # UI components (Ledger, CompareScreen, ModelExplanationCard)
├── lib/
│   ├── c2pa/             # C2PA WebAssembly SDK adapter and session lifecycle
│   ├── compare/          # Provenance Delta normalization & difference metrics
│   ├── intake/           # Magic byte validation, preflight bounds, and SHA-256
│   ├── metadata/         # EXIF parser and privacy redactor
│   ├── model-explainer/  # Optional prompts, claims scanner, Zod schemas, fallback
│   ├── pipeline/         # Deterministic execution coordinator & Provenance Delta
│   └── results/          # Domain types, Zod schemas, and report builders
```

---

## Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- npm 9+

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Nightmare-026/OriginLens.git
cd OriginLens

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Gates

The project's quality gates cover unit, integration, accessibility, and E2E browser tests. Do not rely on
hard-coded counts in documentation — run the commands and record the real output in
[`docs/implementation/verification-log.md`](docs/implementation/verification-log.md):

```bash
# Unit & integration tests (Vitest)
npm test

# End-to-end browser tests against a production build (Playwright)
npm run test:e2e

# Demo rehearsal
npx playwright test tests/e2e/demo-rehearsal.spec.ts

# Type-check TypeScript
npm run typecheck

# Lint with ESLint
npm run lint

# Dependency audit
npm run audit

# Production build
npm run build
```

---

## Audit & Verification Package

- [`docs/implementation/verification-log.md`](docs/implementation/verification-log.md) — commands actually run, with results and dates.
- [`docs/implementation/plan.md`](docs/implementation/plan.md) — phase status, including `BLOCKED` and `PARTIAL` items.
- [`docs/AUDIT_RESPONSE.md`](docs/AUDIT_RESPONSE.md) — response to the earlier external audit; its pre-audit claims are superseded and marked as such.
- [`DEMO.md`](DEMO.md) — demo walkthrough with the committed fixtures.

---

## License

No license file is present in this repository. Do not assume an open-source license; add one before
distributing or submitting under terms that require it.

