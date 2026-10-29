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

All demo fixtures are included in the repository under [`tests/fixtures/c2pa/`](tests/fixtures/c2pa).

### Beat 0: The Problem & Promise (0:00 – 0:20)
- **Talk Track:** *"OriginLens doesn't guess whether an image is AI or real. It shows what embedded credentials and file evidence actually support, and what remains unknown. File inspection runs in the browser: image bytes are not uploaded to a server."*
- **Action:** Open `http://localhost:3000`. Point out the scope disclosure: "Inspect supported media provenance evidence. OriginLens is not a universal AI detector, forensic certification product, or truth detector."

---

### Beat 1: Known Provenance Credential (0:20 – 1:05)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C.jpg`](tests/fixtures/c2pa/adobe-20220124-C.jpg) (Adobe C2PA test fixture)
- **Action:** Drag or select `adobe-20220124-C.jpg` into the Single File Inspector.
- **What to Observe:**
  - **Summary Headline:** `Verified provenance evidence found`
  - **Embedded Manifest:** `Present`
  - **Manifest Validation:** `Valid`
  - **Claim Signature:** `Valid`
  - **Asset Binding:** `Valid`
  - **Signer Trust:** `Not evaluated` — signature validity was checked, but this build configures no trust anchors (policy `originlens-embedded-only-no-trust-anchors-v1`), so no trust decision is made.
  - **Evidence Ledger:** Every claim links to check IDs and evidence items with full auditability.

---

### Beat 2: Absence of Evidence is Not Evidence of Absence (1:05 – 1:35)
- **Action:** Click **Clear session**, then select [`tests/fixtures/c2pa/plain-3x2.png`](tests/fixtures/c2pa/plain-3x2.png).
- **Talk Track:** *"Many images have no provenance manifest. Conventional tools may label them 'human-made' or 'authentic'. OriginLens does not."*
- **What to Observe:**
  - **Headline:** `No supported embedded credentials found`
  - **Embedded Manifest:** `Not present`
  - **Limitations Notice:** *"Absence is not evidence that the image is unedited, human-made, or trustworthy."*
  - **Local measurements:** File format (`image/png`), dimensions (`3 × 2 px`), byte size (88 B), and the SHA-256 of the exact uploaded bytes are reported as measurements.

---

### Beat 3: Content Binding Mismatch (1:35 – 2:10)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg`](tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg) (a byte in the image scan data was changed outside the C2PA JUMBF metadata)
- **Action:** Click **Clear session**, then select `adobe-20220124-C-tampered.jpg`.
- **What to Observe:**
  - **Headline:** `One or more validation issues require attention`
  - **Embedded Manifest:** `Present`
  - **Claim Signature:** `Valid` (the signature over the manifest itself validates)
  - **Asset Binding:** `Invalid` (the covered bytes do not match the hash recorded in the manifest: `assertion.dataHash.mismatch`)
  - **Talk Track:** *"The manifest signature validates, but the covered bytes no longer match the recorded hash. OriginLens reports that mismatch without claiming who changed anything or why."*

---

### Beat 4: Safe Failure Without Collapse (2:10 – 2:40)
- **Fixture:** [`tests/fixtures/c2pa/truncated.jpg`](tests/fixtures/c2pa/truncated.jpg)
- **Action:** Click **Clear session**, then select `truncated.jpg`.
- **What to Observe:**
  - The application catches the corrupted JPEG decode cleanly with safe code `PIPELINE_DECODE_FAILED`.
  - The session does not crash or freeze.
  - The interface remains interactive and ready for another file.

---

### Beat 5: Provenance Delta (Comparison) (2:40 – 3:30)
- **Fixtures:**
  - File A: [`tests/fixtures/c2pa/plain-3x2.png`](tests/fixtures/c2pa/plain-3x2.png)
  - File B: [`tests/fixtures/c2pa/plain-3x2-filtered.png`](tests/fixtures/c2pa/plain-3x2-filtered.png)
- **Action:** In the "Compare two images" section, load File A and File B, then click **Compare images**.
- **What to Observe:**
  - **Two files, checked independently:** Both files receive independent session IDs and independent pipelines.
  - **User Assertions:** Label File A as `original` and File B as `edited`. Notice the UI explicitly marks these as `user-supplied assertions`, never endorsing them as system truth.
  - **Properties Delta:**
    - Byte size: `Equal` (88 B)
    - Dimensions: `Equal` (3 × 2 px)
    - SHA-256 Hash: `Different`
  - **Preview Pixel Metric:**
    - Peak channel difference: `0 of 255`
    - Differing pixels: `0 of 6 (0.00%)`
    - Explanatory note: different byte streams can decode to the same pixel grid; OriginLens separates byte identity from pixel rendering and does not infer which file is original.

---

### Beat 6: Privacy Defaults & Report Export (3:30 – 3:50)
- **Action:** Click **Download report (JSON)**.
- **What to Observe:**
  - Exports a validated `originlens-report-*.json` conforming to the PRD §9.6 contract.
  - **No image bytes:** `exportOptions.includedOriginalImage: false`.
  - **No precise GPS:** `exportOptions.includedPreciseGps: false`.
  - All check IDs, timestamps, evidence items, and comparison deltas are preserved in the JSON structure.
- **Action:** Click **Clear session**. Volatile session memory is released.

---

## Automated Verification

The demo is covered by an automated Playwright end-to-end test that executes the main steps:

```bash
npx playwright test tests/e2e/demo-rehearsal.spec.ts
```

Do not quote aggregate pass counts from this document. Run the gate and record the actual output in
[`docs/implementation/verification-log.md`](docs/implementation/verification-log.md):

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run audit
```

The V01–V50 acceptance matrix is tracked in
[`docs/implementation/requirements-traceability.md`](docs/implementation/requirements-traceability.md);
rows are only `PASS` where the current tree has recorded evidence.
