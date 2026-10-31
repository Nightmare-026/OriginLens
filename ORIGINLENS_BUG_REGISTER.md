# OriginLens — Master Engineering Bug Register
**Defect Inventory, Root-Cause Analysis, Reproduction Steps & Copy-Paste Remediation Patches**

---

| Document Metadata | Details |
|---|---|
| **Project** | OriginLens — Evidence-First Media Provenance Explorer |
| **Audit Date** | October 31 – November 1, 2026 |
| **Classification Standard** | P0 (Critical / Fatal), P1 (High / Severe), P2 (Medium / Functional), P3 (Low / Cosmetic) |
| **Target Codebase** | Git commit `06f9d1a72fb94194a5f3331ba3ecffa22df601a7` |
| **Production Target** | `https://originlens-ai.vercel.app/` |
| **Total Defects Cataloged** | 4 Confirmed Defects (0 P0, 1 P1, 2 P2, 1 P3) + 2 Forensic Observations |

---

## Bug Inventory Summary

| Bug ID | Title | Category | Severity | Affected Page / Route | Estimated Fix Time | Status |
|---|---|---|---|---|---|---|
| **BUG-001** | Tablet 768px Navigation Breakpoint Collision | Responsive Layout / CSS | **P1 (High)** | Header Navbar on all pages | 10 mins | Verified & Reproducible |
| **BUG-002** | Hero Stepper WCAG 2.1 AA Contrast Failure | Accessibility (WCAG 1.4.3) | **P2 (Medium)** | Landing Homepage (`/`) | 10 mins | Verified & Reproducible |
| **BUG-003** | Missing `/favicon.ico` Returns HTTP 404 | Asset Hygiene | **P3 (Low)** | Entire site on first visit | 5 mins | Verified & Reproducible |
| **BUG-004** | Hardcoded Non-Resolving Domain `originlens.org` | SEO / Metadata | **P2 (Medium)** | `sitemap.ts`, `robots.ts`, OpenGraph | 15 mins | Verified & Reproducible |
| **OBS-001** | Difference Heatmap Uses Static CSS Radial Gradient | Feature Realism | Advisory (P2) | Compare Screen (`/compare`) | 3 hours | Documented in Roadmap |
| **OBS-002** | CSP Blocks `eval` During WASM Feature Detection | Security / Console Hygiene | Advisory (P3) | Inspect (`/inspect`), Compare | None (Safe) | Documented / By Design |

---

## Detailed Bug Reports & Code Patches

### BUG-001: Tablet 768px Navigation Breakpoint Collision

#### Classification:
- **Bug ID:** `BUG-001`
- **Severity:** **P1 (High)**
- **Category:** Responsive CSS Layout
- **Affected Route:** Global header navbar (`src/app/globals.css`)

#### Symptom & Impact:
At a viewport width of exactly `768px` (standard iPad Portrait width), all header navigation controls disappear. Both the desktop navigation links (`Home`, `Inspect`, `Compare`, `Docs`, `About`) and the mobile hamburger menu toggle button are hidden. Users on 768px tablets cannot navigate between pages without manually editing the URL.

#### Reproduction Steps:
1. Open Google Chrome or Chromium.
2. Navigate to `https://originlens-ai.vercel.app/`.
3. Open DevTools (`F12`), toggle Device Toolbar (`Ctrl+Shift+M`).
4. Set dimensions to `768 × 1024` (iPad Mini / iPad Portrait).
5. Inspect the top header. Observe that neither the desktop links nor the hamburger icon are visible.

#### Root-Cause Analysis:
In `src/app/globals.css`, two conflicting media queries target the exact same breakpoint of `48rem` (`768px`):
1. **Line 1106:**
   ```css
   @media (min-width: 48rem) {
     .menu-toggle-btn,
     .nav-dropdown-wrapper {
       display: none !important;
     }
   }
   ```
2. **Line 1943:**
   ```css
   @media (max-width: 48rem) {
     .desktop-nav-links {
       display: none !important;
     }
   }
   ```
Because `min-width: 48rem` and `max-width: 48rem` are both inclusive, at exactly `768px` both rules evaluate to `true`, applying `display: none !important` to all navigation elements.

#### Copy-Paste Code Patch:
In `src/app/globals.css`, change line 1943 to subtract `0.0625rem` (1px) from the `max-width` query:

```diff
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -1940,7 +1940,7 @@
   margin-left: auto;
 }
 
-@media (max-width: 48rem) {
+@media (max-width: 47.9375rem) {
   .desktop-nav-links {
     display: none !important;
   }
```

#### Verification Method:
1. Re-open DevTools at `768px`.
2. Confirm `.desktop-nav-links` is displayed with `display: flex`.
3. Resize to `767px` and confirm `.menu-toggle-btn` displays with `display: inline-flex`.

---

### BUG-002: Hero Stepper WCAG 2.1 AA Color Contrast Defect

#### Classification:
- **Bug ID:** `BUG-002`
- **Severity:** **P2 (Medium)**
- **Category:** Accessibility (WCAG 2.1 / 2.2 Success Criterion 1.4.3 Contrast Minimum)
- **Affected Route:** Landing Homepage (`/`)

#### Symptom & Impact:
Automated accessibility scanners (Axe-core, Google Lighthouse) flag 4 contrast violations on the landing page interactive pipeline diagram stepper. Normal text with insufficient contrast impairs readability for users with low vision or when viewing under direct sunlight.

#### Reproduction Steps:
1. Open `https://originlens-ai.vercel.app/`.
2. Run Lighthouse in Chrome DevTools (Mode: Navigation, Categories: Accessibility).
3. Observe Lighthouse Accessibility score: `96/100` (fails `color-contrast` audit).
4. Review failing elements:
   - `<span class="stage-indicator-pill">Stage 01 of 04</span>` (Contrast: `4.09:1` vs required `4.5:1`).
   - `<span class="stage-tab-num" aria-hidden="true">02</span>`, `03`, `04` (Contrast: `3.78:1` vs required `4.5:1`).

#### Root-Cause Analysis:
In `src/app/globals.css`:
- **Line 2389 (`.stage-indicator-pill`):**
  Uses `color: #0284c7;` (Tailwind Sky-600) on container background `#ffffff`.
  - Contrast ratio: $4.09:1$ (Fails normal text threshold of $4.5:1$).
- **Line 2488 (`.stage-tab-num`):**
  Uses `color: #0284c7;` on `background: rgba(14, 165, 233, 0.08)` (blended value `#ecf8fd` over white).
  - Contrast ratio: $3.78:1$ (Fails normal text threshold of $4.5:1$).

#### Copy-Paste Code Patch:
In `src/app/globals.css`, darken `#0284c7` to `#0369a1` (Tailwind Sky-700) at lines 2389 and 2488:

```diff
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -2386,7 +2386,7 @@
   letter-spacing: 0.06em;
   padding: 0;
   background: transparent;
-  color: #0284c7;
+  color: #0369a1;
   border: none;
   box-shadow: none;
 }
@@ -2485,7 +2485,7 @@
 .stage-tab-num {
   font-size: 0.75rem;
   font-weight: 700;
-  color: #0284c7;
+  color: #0369a1;
   background: rgba(14, 165, 233, 0.08);
   border: 1px solid rgba(14, 165, 233, 0.25);
```

#### Verification Method:
1. Re-run Lighthouse Accessibility audit on `/`.
2. Confirm Accessibility score increases from `96/100` to `100/100`.
3. Verified contrast ratio: `#0369a1` on `#ffffff` is **5.68:1**; `#0369a1` on `#ecf8fd` is **5.12:1**. Both pass WCAG AA.

---

### BUG-003: Missing `/favicon.ico` Returns HTTP 404

#### Classification:
- **Bug ID:** `BUG-003`
- **Severity:** **P3 (Low)**
- **Category:** Asset Hygiene / Webmaster Health
- **Affected Route:** Global (all initial requests)

#### Symptom & Impact:
Every browser visiting the production deployment attempts to fetch `/favicon.ico`. The server returns HTTP 404 Not Found, polluting browser developer console logs and edge server error telemetry.

#### Reproduction Steps:
1. Run in terminal:
   ```powershell
   curl.exe -i https://originlens-ai.vercel.app/favicon.ico
   ```
2. Observe output:
   ```http
   HTTP/2 404
   content-type: text/html; charset=utf-8
   ```

#### Root-Cause Analysis:
No `favicon.ico` file was placed in `public/` or generated under `src/app/`.

#### Remediation Instructions:
Create or copy a 32x32 `.ico` or `.png` file to `public/favicon.ico` or create `src/app/icon.png`.
If using Node.js script to generate an SVG-derived icon:
```powershell
# Copy logo or generate icon into public directory:
Copy-Item public/logo.png public/favicon.ico
```
Or declare standard Next.js metadata icons in `src/app/layout.tsx`:
```ts
export const metadata: Metadata = {
  icons: {
    icon: '/logo.png',
  },
};
```

#### Verification Method:
Execute:
```powershell
curl.exe -s -o NUL -w "%{http_code}\n" https://originlens-ai.vercel.app/favicon.ico
```
Expected output: `200`.

---

### BUG-004: Hardcoded Non-Resolving Domain `originlens.org`

#### Classification:
- **Bug ID:** `BUG-004`
- **Severity:** **P2 (Medium)**
- **Category:** SEO / Metadata / OpenGraph Integrity
- **Affected Route:** `sitemap.xml`, `robots.txt`, and metadata in `/inspect`, `/compare`, `/how-to-use`, `/about`, `/privacy`

#### Symptom & Impact:
Social media preview cards (Twitter/X, LinkedIn, Slack, Discord) and search engine crawlers receive links pointing to `https://originlens.org/...`. Because `originlens.org` does not resolve in DNS, link shares result in broken connections.

#### Reproduction Steps:
1. Inspect `curl.exe https://originlens-ai.vercel.app/sitemap.xml`.
2. Observe: `<loc>https://originlens.org/inspect</loc>`.
3. Run `curl.exe -I https://originlens.org` -> Returns DNS lookup failure (`Could not resolve host`).

#### Root-Cause Analysis:
The placeholder domain `'https://originlens.org'` is hardcoded in:
- `src/app/sitemap.ts:4`
- `src/app/robots.ts:10`
- `src/app/inspect/page.tsx:15`
- `src/app/compare/page.tsx:15`
- `src/app/how-to-use/page.tsx:15`
- `src/app/about/page.tsx:15`
- `src/app/privacy/page.tsx:16`

#### Copy-Paste Code Patch:

1. **In `src/app/sitemap.ts`:**
```diff
--- a/src/app/sitemap.ts
+++ b/src/app/sitemap.ts
@@ -1,7 +1,7 @@
 import type { MetadataRoute } from 'next';
 
 export default function sitemap(): MetadataRoute.Sitemap {
-  const baseUrl = 'https://originlens.org';
+  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://originlens-ai.vercel.app';
   const now = new Date();
```

2. **In `src/app/robots.ts`:**
```diff
--- a/src/app/robots.ts
+++ b/src/app/robots.ts
@@ -1,5 +1,7 @@
 import type { MetadataRoute } from 'next';
 
+const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://originlens-ai.vercel.app';
+
 export default function robots(): MetadataRoute.Robots {
   return {
     rules: [
@@ -7,6 +9,6 @@
         allow: '/',
       },
     ],
-    sitemap: 'https://originlens.org/sitemap.xml',
+    sitemap: `${baseUrl}/sitemap.xml`,
   };
 }
```

3. **In `src/app/inspect/page.tsx`, `compare/page.tsx`, `how-to-use/page.tsx`, `about/page.tsx`, `privacy/page.tsx`:**
Replace `'https://originlens.org/...'` in `metadata.alternates.canonical` and `metadata.openGraph.url` with:
```ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://originlens-ai.vercel.app';
```

#### Verification Method:
Curl `/sitemap.xml` and `/robots.txt` and confirm all generated URLs point to `https://originlens-ai.vercel.app`.

---

## Forensic Advisory Observations

### OBS-001: Difference Heatmap Uses Static CSS Radial Gradient
- **Location:** `src/components/inspector/compare-screen.tsx:312-324`
- **Finding:**
  When users click "Toggle Difference Heatmap", the application overlays:
  ```tsx
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background:
        'radial-gradient(circle at 60% 50%, rgba(239, 68, 68, 0.45) 0%, rgba(245, 158, 11, 0.25) 30%, transparent 60%)',
      mixBlendMode: 'screen',
      zIndex: 3,
    }}
  />
  ```
- **Analysis:**
  While the mathematical comparison engine in `src/lib/compare/browser.ts` genuinely calculates exact Mean Absolute Error (MAE) and Changed Pixel Share on a 1.2 MP preview canvas, the visual overlay displayed to the user is an illustrative CSS simulation rather than a rendered pixel-difference heatmap.
- **Recommended Action (Roadmap P2):**
  Render the canvas difference buffer calculated during `compareImagesClient` onto an offscreen canvas and paint it directly over the comparison viewport when the toggle is active.

### OBS-002: Benign CSP `eval` Feature-Detection Warning
- **Location:** Web Worker / C2PA WebAssembly initialization
- **Finding:**
  Chrome DevTools logs: `Content Security Policy of your site blocks the use of eval in JavaScript`.
- **Analysis:**
  The Content-Security-Policy header intentionally omits `'unsafe-eval'` and allows only `'wasm-unsafe-eval'`. Some JavaScript runtimes attempt a try/catch `eval('...')` during capability detection. The browser blocks the call and logs a warning, but the C2PA WASM module continues initializing normally.
- **Recommended Action:**
  None required. The strict CSP is an intentional security control. Weakening CSP to allow `'unsafe-eval'` would degrade application security.
