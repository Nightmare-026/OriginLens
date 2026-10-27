# OriginLens — Hackathon Demo Guide & Script

**OriginLens** is an **Evidence-First Media Provenance Explorer**. It inspects cryptographic and metadata provenance evidence for images and performs side-by-side comparative analysis between two files without jumping to ungrounded conclusions about image authenticity, origin, or scene truth.

> **Core Philosophy:**
> 1. **Evidence Ledger:** Every finding traces directly to a specific check, evidence ID, and validation standard.
> 2. **Provenance Delta:** Compare two images side-by-side without presuming an "original" or inferring intent.
> 3. **Honest Uncertainty:** Never convert absent evidence into a claim of authenticity ("human-made"); distinguish between signature validity and signer trust; state what was not checked.

---

## Quick Start (Running Locally)

```bash
# 1. Install dependencies
npm install

# 2. Run automated demo rehearsal (headless Chromium)
npx playwright test tests/e2e/demo-rehearsal.spec.ts

# 3. Or launch development server
npm run dev
# Open http://localhost:3000
```

---

## 3-to-4 Minute Rehearsed Judging Demo Walkthrough

All demo fixtures are included in the repository under [`tests/fixtures/c2pa/`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa).

### Beat 0: The Problem & Promise (0:00 – 0:20)
- **Talk Track:** *"OriginLens doesn't guess whether an image is AI or real. It shows what cryptographic and file evidence actually supports, and what remains unknown. It runs 100% client-side in the browser—no images are uploaded to any server, preserving complete user privacy."*
- **Action:** Open `http://localhost:3000`. Point out the scope disclosure: "Inspect supported media provenance evidence. OriginLens is not a universal AI detector, forensic certification product, or truth detector."

---

### Beat 1: Known Provenance Credential (0:20 – 1:05)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C.jpg`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/adobe-20220124-C.jpg) (Adobe C2PA test fixture)
- **Action:** Drag or select `adobe-20220124-C.jpg` into the Single File Inspector.
- **What to Observe:**
  - **Summary Headline:** `Verified provenance evidence found`
  - **Embedded Manifest:** `Present`
  - **Manifest Validation:** `Valid`
  - **Claim Signature:** `Valid`
  - **Asset Binding:** `Valid`
  - **Signer Trust:** `Not evaluated` (The app honestly discloses that while the signature is cryptographically valid, a custom trust anchor was not configured—refusing to falsely claim "trusted").
  - **Evidence Ledger:** Every claim links to check IDs and evidence items with full auditability.

---

### Beat 2: Absence of Evidence is Not Evidence of Absence (1:05 – 1:35)
- **Action:** Click **Clear session**, then select [`tests/fixtures/c2pa/plain-3x2.png`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/plain-3x2.png).
- **Talk Track:** *"Most images on the internet lack provenance manifests. Conventional tools often mistakenly label them 'human-made' or 'authentic'. OriginLens does not."*
- **What to Observe:**
  - **Headline:** `No supported embedded credentials found`
  - **Embedded Manifest:** `Not present`
  - **Limitations Notice:** *"Absence is not evidence that the image is unedited, human-made, or trustworthy."*
  - **Deterministic Local Facts:** File format (`image/png`), dimensions (`3 × 2 px`), byte size, and original SHA-256 hash remain completely verified.

---

### Beat 3: Tampered Credential Detection (1:35 – 2:10)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg) (Bit mutated in image scan data outside C2PA JUMBF metadata)
- **Action:** Click **Clear session**, then select `adobe-20220124-C-tampered.jpg`.
- **What to Observe:**
  - **Headline:** `One or more validation issues require attention`
  - **Embedded Manifest:** `Present`
  - **Claim Signature:** `Valid` (The signature over the manifest assertions is authentic)
  - **Asset Binding:** `Invalid` (The image pixel hash does NOT match the signed assertion hash: `assertion.dataHash.mismatch`)
  - **Talk Track:** *"The signature is authentic, but the image pixels have been altered after signing. OriginLens pinpoints the exact failure without fabricating accusations about who did it or why."*

---

### Beat 4: Safe Failure Without Collapse (2:10 – 2:40)
- **Fixture:** [`tests/fixtures/c2pa/truncated.jpg`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/truncated.jpg)
- **Action:** Click **Clear session**, then select `truncated.jpg`.
- **What to Observe:**
  - The application catches the corrupted JPEG decode cleanly with safe code `PIPELINE_DECODE_FAILED`.
  - The session does not crash, freeze, or leak memory.
  - The interface remains completely interactive and ready for subsequent file analysis.

---

### Beat 5: Provenance Delta (Comparison) (2:40 – 3:30)
- **Fixtures:**
  - File A: [`tests/fixtures/c2pa/plain-3x2.png`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/plain-3x2.png)
  - File B: [`tests/fixtures/c2pa/plain-3x2-filtered.png`](file:///d:/Projects/OriginLens/tests/fixtures/c2pa/plain-3x2-filtered.png)
- **Action:** In the "Compare two images" section, load File A and File B, then click **Compare images**.
- **What to Observe:**
  - **Two files, checked independently:** Both files receive independent session IDs and independent pipelines.
  - **User Assertions:** Label File A as `original` and File B as `edited`. Notice the UI explicitly marks these as `user-supplied assertions`, never endorsing them as system truth.
  - **Properties Delta:**
    - Byte size: `Equal` (103 B)
    - Dimensions: `Equal` (3 × 2 px)
    - SHA-256 Hash: `Different`
  - **Preview Pixel Metric:**
    - Peak channel difference: `0 of 255`
    - Differing pixels: `0 of 6 (0.00%)`
    - Explanatory note: Different byte streams can decode to identical pixel grids (lossless re-encoding/filtering). OriginLens separates byte identity from pixel rendering.

---

### Beat 6: Privacy Defaults & Report Export (3:30 – 3:50)
- **Action:** Click **Download report (JSON)**.
- **What to Observe:**
  - Exports a validated `originlens-report-*.json` conforming to PRD v2.0 schema.
  - **Zero Image Bytes:** `exportOptions.includedOriginalImage: false`.
  - **Zero GPS Tracking:** `exportOptions.includedPreciseGps: false`.
  - All check IDs, timestamps, evidence items, and comparison deltas are preserved in the JSON structure.
- **Action:** Click **Clear session**. Volatile session memory is wiped clean.

---

## Automated Verification

The entire demo is covered by an automated Playwright end-to-end test that executes every step and asserts every UI condition:

```bash
npx playwright test tests/e2e/demo-rehearsal.spec.ts
```

All 50 acceptance tests (V01–V50) pass with 100% coverage:
```bash
npm test                 # Unit & integration suite (121 tests passed)
npm run test:e2e         # End-to-end browser suite (27 tests passed)
npm run typecheck        # Zero TypeScript errors (strict mode)
npm run lint             # Zero ESLint warnings/errors
npm run audit            # Zero dependency vulnerabilities
```
