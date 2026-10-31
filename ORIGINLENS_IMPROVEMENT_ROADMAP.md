# OriginLens — Engineering Improvement Roadmap
**Prioritized Action Plan: Immediate Pre-Submission Fixes (P1), Post-Submission Polish (P2) & Future Architecture (P3)**

---

| Roadmap Metadata | Details |
|---|---|
| **Project** | OriginLens — Evidence-First Media Provenance Explorer |
| **Audit Date** | October 31 – November 1, 2026 |
| **Author** | Lead Technical Auditor & Report Synthesizer (`worker_m4`) |
| **Target Submission Deadline** | November 4, 2026 at 9:00 PM ET |
| **Roadmap Tiers** | **P1 (Immediate Pre-Submission)**, **P2 (Judging / Post-Submission Polish)**, **P3 (Future Architecture)** |

---

## Executive Summary & Engineering Priority Matrix

To maximize judging impact and eliminate all remaining defects before the **November 4, 2026 deadline**, engineering work is segmented into three distinct execution phases:

1. **Phase P1 (Pre-Submission Critical Fixes — ~45 Minutes Total Effort):**
   Addresses the four confirmed defects (BUG-001 through BUG-004) identified during the three-pass technical audit. These are pure, low-risk patches that immediately resolve tablet navigation collapse, achieve 100% WCAG 2.1 AA accessibility compliance, eliminate browser 404 errors, and fix OpenGraph social share cards.
2. **Phase P2 (Post-Submission & Judging Polish — ~1–2 Days Effort):**
   Replaces the illustrative Difference Heatmap with an actual canvas-driven pixel diff bitmap, pre-caches major newsroom CA trust roots, and adds multi-turn refinement to the AI explainer.
3. **Phase P3 (Long-Term Architecture & Multi-Modal Provenance — 2+ Weeks):**
   Expands format support to WebP containers and MP4 video C2PA manifests, introduces decentralized trust registries, and integrates local browser-based small language models (WebLLM).

```
+-------------------------------------------------------------------------------------------------------+
|                                    PRIORITIZED ROADMAP MATRIX                                         |
+----------+------------------------------------+----------------+------------+----------+--------------+
| Priority | Engineering Work Item              | Expected Impact| Complexity | Effort   | Category     |
+----------+------------------------------------+----------------+------------+----------+--------------+
| **P1.1** | Fix 768px Tablet Nav Collision     | High (UX)      | Low        | 10 mins  | Responsive   |
| **P1.2** | Darken Stepper Pill Colors         | Medium (A11y)  | Low        | 10 mins  | WCAG 2.1 AA  |
| **P1.3** | Deploy `/favicon.ico` Asset        | Low (Hygiene)  | Low        | 5 mins   | Assets       |
| **P1.4** | Fix Base URL in Sitemaps/Metadata  | High (SEO/OG)  | Low        | 15 mins  | Metadata     |
+----------+------------------------------------+----------------+------------+----------+--------------+
| **P2.1** | Canvas-Driven Pixel Diff Heatmap   | High (Product) | Medium     | 3 hours  | Compare UI   |
| **P2.2** | Pre-cached CA Trust Anchor List    | High (Forensic)| Medium     | 4 hours  | C2PA Trust   |
| **P2.3** | Multi-Turn AI Provenance Dialogue  | Medium (AI)    | Medium     | 4 hours  | Meta AI      |
+----------+------------------------------------+----------------+------------+----------+--------------+
| **P3.1** | WebP Container Support (P1-002)    | Medium (Scope) | Medium     | 6 hours  | Formats      |
| **P3.2** | Video (MP4) C2PA Verification      | Very High      | High       | 3 days   | Video WASM   |
| **P3.3** | WebLLM Client-Side Inference       | Very High (Priv| High       | 5 days   | Edge AI      |
+----------+------------------------------------+----------------+------------+----------+--------------+
```

---

## Phase P1: Immediate Pre-Submission Fixes (Must Execute First)

*Target Completion: Within 2 hours of report delivery.*

### P1.1: Resolve 768px Tablet Navigation Breakpoint Collision (BUG-001)
- **Problem:** At exactly 768px viewport width, both `.desktop-nav-links` and `.menu-toggle-btn` are hidden with `display: none !important`, leaving no navigation controls for tablet users.
- **Root Cause:** Inclusive overlapping media queries in `src/app/globals.css:1106` (`min-width: 48rem`) and line `1943` (`max-width: 48rem`).
- **Action Plan:**
  1. Open `src/app/globals.css`.
  2. At line 1943, replace `@media (max-width: 48rem)` with `@media (max-width: 47.9375rem)`.
  3. Run `npm run build` and verify that at 768px width, the desktop navigation links render cleanly.
- **Estimated Effort:** 10 minutes.

### P1.2: Achieve 100% WCAG 2.1 / 2.2 AA Color Contrast (BUG-002)
- **Problem:** On `/`, `.stage-indicator-pill` (4.09:1) and `.stage-tab-num` (3.78:1) fail the WCAG minimum 4.5:1 contrast requirement for normal text.
- **Root Cause:** Foreground `#0284c7` (Sky-600) on white and light cyan backgrounds.
- **Action Plan:**
  1. Open `src/app/globals.css`.
  2. In rule `.stage-indicator-pill` (line 2389), replace `color: #0284c7;` with `color: #0369a1;`.
  3. In rule `.stage-tab-num` (line 2488), replace `color: #0284c7;` with `color: #0369a1;`.
  4. Run `npx playwright test tests/e2e/accessibility.spec.ts` and confirm 0 violations across all pages.
- **Estimated Effort:** 10 minutes.

### P1.3: Eliminate Browser 404 by Deploying Favicon Asset (BUG-003)
- **Problem:** Browsers request `/favicon.ico` on initial page load, resulting in HTTP 404 errors in developer console logs.
- **Action Plan:**
  1. Copy `public/logo.png` to `public/favicon.ico` or place a dedicated multi-size ICO asset in `public/`.
  2. Declare standard metadata icon tags in `src/app/layout.tsx`.
  3. Verify with `curl.exe -I https://originlens-ai.vercel.app/favicon.ico` returning HTTP 200.
- **Estimated Effort:** 5 minutes.

### P1.4: Update Hardcoded Base URL to Production Domain (BUG-004)
- **Problem:** `sitemap.xml`, `robots.txt`, and OpenGraph metadata hardcode the non-resolving domain `https://originlens.org`, breaking social card previews and search crawler indexing.
- **Action Plan:**
  1. Update `src/app/sitemap.ts:4` and `src/app/robots.ts:10` to use `process.env.NEXT_PUBLIC_SITE_URL || 'https://originlens-ai.vercel.app'`.
  2. Update metadata objects in `src/app/inspect/page.tsx`, `compare/page.tsx`, `how-to-use/page.tsx`, `about/page.tsx`, and `privacy/page.tsx`.
  3. Test via `curl.exe https://originlens-ai.vercel.app/sitemap.xml` and verify all `<loc>` tags resolve to Vercel.
- **Estimated Effort:** 15 minutes.

---

## Phase P2: Post-Submission & Judging Polish

*Target Completion: November 5–7, 2026 (During Judging Window).*

### P2.1: Dynamic Canvas-Driven Pixel Difference Heatmap
- **Current State:** Toggling the Difference Heatmap on `/compare` displays an illustrative static CSS radial gradient overlay (`radial-gradient(circle at 60% 50%, rgba(239, 68, 68, 0.45)...)`).
- **Desired State:** Render an authentic, canvas-drawn pixel difference overlay where altered pixels glow based on exact RGBA delta values calculated during `compareImagesClient`.
- **Implementation Plan:**
  1. In `src/lib/compare/browser.ts`, export the computed pixel difference `Uint8ClampedArray` as an `ImageData` object alongside MAE metrics.
  2. In `src/components/inspector/compare-screen.tsx`, paint this difference buffer onto an overlay `<canvas>` positioned above Image B when `showHeatmap` is true.
  3. Apply a colormap (e.g., Magma or Turbo) where pixel intensity maps proportionally to absolute color difference.
- **Impact:** Elevates the tool from an illustrative viewer to a true forensic comparison suite; impresses technical judges.
- **Estimated Effort:** 3 hours.

### P2.2: Pre-Cached CA Trust Anchor Registry
- **Current State:** Signer trust is reported as `not_evaluated` for all credentials because no root certificate authorities are bundled (`originlens-embedded-only-no-trust-anchors-v1`).
- **Desired State:** Deliver positive `trusted` status for verified credentials signed by established media organizations (e.g., Reuters, BBC, Adobe, Truepic).
- **Implementation Plan:**
  1. Extract public X.509 root certificates from the official Content Authenticity Initiative trust list.
  2. Bundle a sanitized JSON certificate store under `src/lib/c2pa/trust-anchors.json`.
  3. Pass the trust anchor store to `@contentauth/c2pa-web` during worker initialization.
  4. Map SDK `signingCredential.trusted` to state `trusted` in `src/lib/c2pa/check.ts`.
- **Impact:** Demonstrates end-to-end cryptographic trust chain verification.
- **Estimated Effort:** 4 hours.

### P2.3: Interactive Multi-Turn AI Provenance Dialogue
- **Current State:** The AI Explainer performs a single-shot synthesis of the Evidence Ledger.
- **Desired State:** Allow users to ask follow-up questions directly on an inspected image (e.g., *"Why does this Canon camera indicate orientation 6?"* or *"What does assertion.dataHash.mismatch mean?"*).
- **Implementation Plan:**
  1. Extend `/api/explain` to accept an optional `conversationHistory` array.
  2. Maintain server-side evidence citation bounds: the model is instructed to answer follow-up questions only by referencing previously extracted evidence items.
  3. Implement an expandable chat tray below the Evidence Ledger in `src/components/inspector/evidence-ledger.tsx`.
- **Estimated Effort:** 4 hours.

---

## Phase P3: Long-Term Architecture & Multi-Modal Expansion

*Target Completion: Q1 2027 (Post-Hackathon Production Roadmap).*

### P3.1: WebP Image Container Support (PRD P1-002)
- **Objective:** Extend preflight intake and C2PA extraction to `.webp` images.
- **Technical Challenge:** Requires auditing browser WebAssembly JUMBF extraction across WebP chunks (`VP8X` chunk parsing for `c2pa` metadata).
- **Implementation Plan:**
  1. Update magic byte sniffer in `src/lib/pipeline/intake.ts` to detect `RIFF....WEBP`.
  2. Validate `@contentauth/c2pa-web` v0.15.4 JUMBF parsing on WebP fixtures.
  3. Update UI format allowlist indicators and unit test suite.
- **Estimated Effort:** 6 hours.

### P3.2: Short Video (MP4) C2PA Provenance Verification
- **Objective:** Enable journalists to inspect provenance manifests embedded in MP4 / MOV video clips.
- **Technical Challenge:** Video files are significantly larger (50–200 MB), requiring range-request chunking to read MP4 `moov` / `uuid` boxes without loading entire video buffers into browser RAM.
- **Implementation Plan:**
  1. Integrate `@contentauth/c2pa-web` video streaming reader.
  2. Add client-side video preview player with synchronized provenance timeline markers.
- **Estimated Effort:** 3 days.

### P3.3: 100% Offline Edge AI Inference via WebLLM / Llama-3.2-1B
- **Objective:** Complete the zero-byte privacy mission by running model explanation directly inside the user's browser via WebGPU, eliminating all outbound API requests.
- **Technical Challenge:** WebGPU memory limits and model quantization (int4/q4f16).
- **Implementation Plan:**
  1. Integrate `@mlc-ai/web-llm` with a lightweight open-weights model (such as Llama-3.2-1B-Instruct).
  2. Cache model weights in CacheStorage / OPFS after initial user opt-in.
  3. Execute ADR-017 prompt filtering entirely within a client-side Web Worker.
- **Estimated Effort:** 5 days.

---

## Engineering Execution Schedule (Immediate Countdown)

| Milestone Date | Action Item | Responsible Agent | Success Criteria |
|---|---|---|---|
| **Nov 1 (Today)** | Apply P1.1 (Nav CSS), P1.2 (Contrast), P1.3 (Favicon), P1.4 (Base URL) | Engineering Team | 0 Axe violations; 768px nav visible; 404 eliminated |
| **Nov 2** | Run automated Playwright rehearsal & deploy production build | QA Engineer | Production build exit 0; 326 unit tests PASS |
| **Nov 3** | Record final judging demonstration video & rehearse story beats | Product Lead | 3-minute video highlighting zero-byte C2PA + Meta AI |
| **Nov 4 (9 PM ET)** | **Submit project on Cerebral Valley Hackathon Portal** | Submitter | Formal entry in Indie Developer Track confirmed |
