# OriginLens

> **Evidence-First Media Provenance Explorer**  
> Inspect supported image provenance evidence and compare two independent files without guessing origin, chronology, authorship, or scene truth.

[![CI](https://github.com/Nightmare-026/OriginLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Nightmare-026/OriginLens/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![C2PA](https://img.shields.io/badge/C2PA-0.15.4-green.svg)](https://contentauthenticity.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## Overview

In an era of generative AI and manipulated media, most "AI detection" or "authenticity verification" tools rely on opaque classifiers that make probabilistic guesses. When an image lacks metadata, they often mislabel it as "human-made," and when a hash differs, they jump to unsupported accusations of fraud.

**OriginLens** takes a fundamentally different, **evidence-first** approach:
1. **Evidence Ledger:** Every finding traces directly to a real check, evidence ID, and validation standard.
2. **Provenance Delta:** Compare two images side-by-side without presuming an "original" or inferring intent.
3. **Honest Uncertainty:** Never convert absent evidence into a claim of authenticity; distinguish between signature validity and signer trust; explicitly disclose what was not checked.
4. **Zero-Knowledge Privacy:** 100% of processing, hashing, EXIF extraction, and C2PA cryptographic validation occurs in the user's browser in volatile memory. No images, hashes, or GPS coordinates are ever transmitted to a server.

---

## Key Features

### 🔍 Single-File Evidence Ledger
- **C2PA Cryptographic Validation:** Inspects Content Credentials via the official `@contentauth/c2pa-web` WebAssembly SDK. Validates manifest structure, claim signatures, asset bindings (`assertion.dataHash`), and signing credentials.
- **EXIF & Metadata Clues:** Extracts camera, lens, timestamp, and copyright fields while treating them as non-cryptographic clues.
- **Privacy Masking:** Precise GPS coordinates are masked by default and excluded from exported reports.
- **Deterministic SHA-256:** Fingerprints the exact original uncompressed bytes.

### ⚖️ Provenance Delta (Comparison)
- **Independent Analysis:** Analyzes File A and File B separately with isolated session contexts.
- **Side-by-Side Property Matrix:** Compares byte lengths, MIME formats, dimensions, and hashes.
- **Normalized Preview Metric:** Computes peak channel difference and percentage of differing pixels across normalized previews (skipped if aspect ratios differ or EXIF orientation is not normalized).
- **User Assertions:** Allows user to label candidates (e.g. "original" vs "edited") while explicitly marking them as user assertions—never endorsed as system fact.

### 🛡️ Defensive Engineering
- **Strict Intake Guardrails:** Rejects files exceeding 20 MiB or 20 megapixels; validates magic bytes (JPEG/PNG); rejects SVGs and animated formats.
- **Safe Failure:** Corrupted files fail cleanly with stable error codes (e.g. `PIPELINE_DECODE_FAILED`) without crashing the session.
- **Auditable Reports:** Exports versioned JSON reports conforming to the PRD v2.0 specification, with `includedOriginalImage: false` and `includedPreciseGps: false`.

---

## Architecture

OriginLens is built on **Next.js (App Router)** with **TypeScript** and runs entirely client-side:

```
src/
├── app/
│   ├── how-to-use/       # Step-by-step user guide & FAQ
│   ├── privacy/          # Zero-knowledge privacy policy
│   ├── globals.css       # Unified design system & responsive styling
│   └── layout.tsx        # App shell with SiteHeader and SiteFooter
├── components/
│   ├── navigation/       # SiteHeader, SiteFooter, and responsive navigation
│   └── inspector/        # React UI components (Ledger, CompareScreen, StartScreen)
├── domain/               # Domain types, Zod schemas, and report builders
├── lib/
│   ├── c2pa/             # C2PA WebAssembly SDK adapter and worker management
│   ├── intake/           # Magic byte validation, preflight bounds, and SHA-256
│   ├── metadata/         # EXIF parser and privacy redactor
│   └── pipeline/         # Deterministic execution coordinator & Provenance Delta
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

The project enforces strict quality gates across unit, integration, accessibility, and E2E browser tests:

```bash
# Run unit & integration tests (121 tests)
npm test

# Run end-to-end browser tests in Playwright (27 tests)
npm run test:e2e

# Run the 3-minute hackathon judging demo rehearsal
npx playwright test tests/e2e/demo-rehearsal.spec.ts

# Type-check TypeScript codebase
npm run typecheck

# Lint with ESLint
npm run lint

# Security audit of dependencies (0 vulnerabilities)
npm run audit

# Build production bundle
npm run build
```

---

## Judging Demo Guide

For a 3-to-4 minute walkthrough with pre-configured fixtures, see [`DEMO.md`](file:///d:/Projects/OriginLens/DEMO.md) or the automated test [`tests/e2e/demo-rehearsal.spec.ts`](file:///d:/Projects/OriginLens/tests/e2e/demo-rehearsal.spec.ts).

Detailed audit documentation and the complete V01–V50 acceptance matrix are recorded in [`docs/implementation/demo-and-submission-guide.md`](file:///d:/Projects/OriginLens/docs/implementation/demo-and-submission-guide.md).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
