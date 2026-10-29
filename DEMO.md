# OriginLens — Hackathon Judging Demo Script

**OriginLens** is an **Evidence-First Media Provenance Explorer & Meta Llama Co-Pilot**. It inspects cryptographic and metadata provenance evidence for images and performs side-by-side comparative analysis between two files without jumping to ungrounded conclusions about image authenticity, origin, or scene truth.

> **Core Philosophy:**
> 1. **Evidence Ledger:** Every finding traces directly to a specific check, evidence ID, and validation standard.
> 2. **Provenance Delta:** Compare two images side-by-side without presuming an "original" or inferring intent.
> 3. **Honest Uncertainty:** Never convert absent evidence into a claim of authenticity ("human-made"); distinguish between signature validity and signer trust; state what was not checked.
> 4. **Meta Llama Provenance Co-Pilot:** Explain cryptographic facts objectively across three distinct personas (General, Fact-Checkers, Cryptographers) with zero hallucination guarantee.

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
- **Talk Track:** *"OriginLens doesn't guess whether an image is AI or real with black-box percentages. It shows what cryptographic credentials, metadata clues, and exact byte fingerprints actually establish. All processing runs in the browser in volatile memory—zero image byte uploads."*
- **Action:** Open `http://localhost:3000`. Point out the scope disclosure: "Inspect supported media provenance evidence. OriginLens is not a universal AI detector, forensic certification product, or truth detector."

---

### Beat 1: Known Provenance Credential & Categorized Tabs (0:20 – 1:00)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C.jpg`](tests/fixtures/c2pa/adobe-20220124-C.jpg) (Adobe C2PA test fixture)
- **Action:** Drag or select `adobe-20220124-C.jpg` into the Single File Inspector (or click sample preset `C2PA Valid Credential`).
- **What to Observe:**
  - **Summary Headline:** `Verified provenance evidence found`
  - **Embedded Manifest:** `Present`
  - **Manifest Validation:** `Valid`
  - **Claim Signature:** `Valid`
  - **Asset Binding:** `Valid`
  - **Signer Trust:** `Not evaluated` — signature validity was checked, but this build configures no trust anchors (policy `originlens-embedded-only-no-trust-anchors-v1`), so no trust decision is made.
  - **Categorized Tabs:** Click through the 6 full-width tabs (`Executive Overview`, `C2PA Credentials`, `Camera & EXIF`, `AI Clues & Co-Pilot`, `Technical Audit`, `Complete View`).

---

### Beat 2: Absence of Evidence & Anti-Doxxing Geolocation Guard (1:00 – 1:40)
- **Action:** Click **Clear session**, then select a camera image with EXIF or [`tests/fixtures/c2pa/plain-3x2.png`](tests/fixtures/c2pa/plain-3x2.png).
- **Talk Track:** *"Many images have no provenance manifest. Conventional tools may label them 'human-made' or 'authentic'. OriginLens does not."*
- **What to Observe:**
  - **Headline:** `No supported embedded credentials found`
  - **Limitations Notice:** *"Absence is not evidence that the image is unedited, human-made, or trustworthy."*
  - **Geolocation Privacy:** If GPS is present, coordinates are masked by default (`••••••••••••`). Click `Reveal Coordinates (Local Only)` to unmask in volatile memory, switch between `Precise` and `Coarse (~10 km safe region)`, and view safe external mapping links.

---

### Beat 3: Content Binding Mismatch (1:40 – 2:10)
- **Fixture:** [`tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg`](tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg) (a byte in the image scan data was changed outside the C2PA JUMBF metadata)
- **Action:** Click **Clear session**, then select `adobe-20220124-C-tampered.jpg`.
- **What to Observe:**
  - **Headline:** `One or more validation issues require attention`
  - **Claim Signature:** `Valid` (the signature over the manifest itself validates)
  - **Asset Binding:** `Invalid` (the covered bytes do not match the hash recorded in the manifest: `assertion.dataHash.mismatch`)
  - **Talk Track:** *"The manifest signature validates, but the covered bytes no longer match the recorded hash. OriginLens reports that mismatch without claiming who changed anything or why."*

---

### Beat 4: Safe Failure Without Collapse (2:10 – 2:35)
- **Fixture:** [`tests/fixtures/c2pa/truncated.jpg`](tests/fixtures/c2pa/truncated.jpg)
- **Action:** Click **Clear session**, then select `truncated.jpg`.
- **What to Observe:**
  - The application catches the corrupted JPEG decode cleanly with safe code `PIPELINE_DECODE_FAILED`.
  - The session does not crash or freeze; the interface remains responsive.

---

### Beat 5: Provenance Delta & Visual Swipe Slider (2:35 – 3:15)
- **Fixtures:**
  - File A: [`tests/fixtures/c2pa/plain-3x2.png`](tests/fixtures/c2pa/plain-3x2.png)
  - File B: [`tests/fixtures/c2pa/plain-3x2-filtered.png`](tests/fixtures/c2pa/plain-3x2-filtered.png)
- **Action:** Navigate to **Compare two images**, load File A and File B, then click **Compare images**.
- **What to Observe:**
  - **Interactive Swipe Slider:** Drag the visual slider handle left and right to inspect visual divergence in real time.
  - **Normalized Pixel Metric:** Peak channel difference and differing pixel percentage calculated with mathematical bounds.
  - **User Assertions:** Label File A as `original` and File B as `edited`—the UI highlights these as user-supplied assertions, never endorsed as system truth.

---

### Beat 6: Meta Llama Provenance Co-Pilot (3:15 – 3:45)
- **Action:** Click on the **AI Clues & Co-Pilot** tab. Click **Explain with Meta Llama**.
- **What to Observe:**
  - **Audience Personas:** Switch between **General Public**, **Newsroom Fact-Checkers**, and **Forensic Specialists**.
  - **Citation Verification:** Every finding cited by Llama maps directly to a verified Evidence ID (`ev_...`).
  - **Anti-Hallucination Guard:** The model explicitly states what the evidence supports and what remains unknown, refusing to fabricate claims of authenticity or intent.

---

### Beat 7: Multi-Format Export Hub (3:45 – 4:00)
- **Action:**
  - Click **Print / Save as PDF** to preview the executive print layout with watermark headers.
  - Click **Download Social Card (PNG)** to generate a 1200×630 Canvas preview card.
  - Click **Download Report (JSON)** to inspect the machine-readable Schema 2.0 report.
  - Observe zero-leakage guarantees: `includedOriginalImage: false` and `includedPreciseGps: false`.

---

## Automated Verification

The demo is covered by an automated Playwright end-to-end test that executes all key steps:

```bash
npx playwright test tests/e2e/demo-rehearsal.spec.ts
```

All 50 quality gates and test suites are tracked in [`docs/implementation/verification-log.md`](docs/implementation/verification-log.md).
