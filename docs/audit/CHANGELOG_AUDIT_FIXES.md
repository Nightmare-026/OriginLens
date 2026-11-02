# OriginLens — Changelog of Audit Remediations and Engineering Fixes

**Audit Phase:** Phase 10 Remediation & Phase 11 Regression  
**Date:** 2026-11-02  
**Auditor / Engineer:** Independent Principal Engineering Auditor  
**Repository Branch:** `main`  
**Base Commit SHA:** `9c0422eec08eaa5b8801172dbe03f82b54b17c7e`  

---

## Overview of Changes

During the final independent engineering audit of OriginLens, 4 defects were diagnosed. In accordance with Section 14 of the Master Audit Directive (*"Fix immediately when the problem is reproducible, root cause is understood, fix is local and reversible, and existing behavior is preserved"*), 3 local engineering defects were resolved. The 4th defect (governance/compliance regarding an exposed API key whose rotation was declined by the project owner) was architecturally mitigated via server-side isolation and deterministic fallback.

All user uncommitted changes (specifically file input selector button styling in `src/app/globals.css:386-427`) have been strictly preserved.

---

## Detailed File-by-File Changelog

### 1. `eslint.config.mjs` (Defect 1 / Tooling)
- **Problem:** `npm run lint` was traversing into the nested `.worktrees/` directory and attempting to lint compiled Next.js server chunks, resulting in 8,457 false-positive errors and a non-zero exit code.
- **Change:** Added `'.worktrees/**'` to the ESLint `ignores` array.
- **Diff:**
```diff
--- a/eslint.config.mjs
+++ b/eslint.config.mjs
@@ -10,6 +10,7 @@ const config = [
       'node_modules/**',
       'coverage/**',
       '.agents/**',
+      '.worktrees/**',
       'next-env.d.ts',
     ],
   },
```
- **Verification:** `npm run lint` now runs in 8 seconds and exits with code 0 (0 errors, 0 warnings).

---

### 2. `src/components/inspector/ledger.tsx` (Defect 2 / Responsive)
- **Problem:** The preview card in the Evidence Ledger had `minHeight: '280px'` coupled with `aspectRatio: '16/10'`, which mathematically forced the container width to `448px` on a 360px mobile viewport, causing horizontal scrolling and failing WCAG 1.4.10 Reflow.
- **Change:** Added `width: '100%'`, `maxWidth: '100%'`, and set `minHeight: '0'` so the container resizes responsively while preserving its aspect ratio.
- **Diff:**
```diff
--- a/src/components/inspector/ledger.tsx
+++ b/src/components/inspector/ledger.tsx
@@ -791,10 +791,12 @@ function MediaPreviewCard({
         className="preview-img-container"
         style={{
           position: 'relative',
+          width: '100%',
+          maxWidth: '100%',
           borderRadius: '12px',
           overflow: 'hidden',
           background: 'var(--surface-sunken, #e2e8f0)',
-          minHeight: '280px',
+          minHeight: '0',
           maxHeight: '500px',
           aspectRatio: '16/10',
           display: 'flex',
```
- **Verification:** Verified via Playwright `inspect.spec.ts` (360px viewport test passed with 0px horizontal overflow).

---

### 3. `src/app/globals.css` (Defect 2 / Responsive)
- **Problem:** Unbroken 64-character SHA-256 hex strings in `.evidence-value` table cells could cause layout expansion on narrow mobile screens.
- **Change:** Added `overflow-wrap: anywhere; word-break: break-all;` to `.evidence-value`. Preserved user's existing uncommitted changes in `input[type='file']::file-selector-button`.
- **Diff:**
```diff
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -858,6 +858,8 @@ button:disabled {
 
 .evidence-value {
   color: var(--text);
+  overflow-wrap: anywhere;
+  word-break: break-all;
 }
 
 /* Key-Value Property List */
```
- **Verification:** Verified that long hash strings wrap cleanly without horizontal expansion.

---

### 4. `src/components/inspector/compare-screen.tsx` (Defect 2 / Responsive)
- **Problem:** In the two-file comparison screen, the interactive `VisualDiffSlider` container viewport had `minHeight: '320px'` with `aspectRatio: '16/10'`, forcing a minimum width of `512px` and causing a 131px horizontal overflow on 360px viewports.
- **Change:** Added `maxWidth: '100%'` and changed `minHeight: '320px'` to `minHeight: '0'`.
- **Diff:**
```diff
--- a/src/components/inspector/compare-screen.tsx
+++ b/src/components/inspector/compare-screen.tsx
@@ -383,7 +383,8 @@ function VisualDiffSlider({
         style={{
           position: 'relative',
           width: '100%',
-          minHeight: '320px',
+          maxWidth: '100%',
+          minHeight: '0',
           maxHeight: '520px',
           aspectRatio: '16/10',
           borderRadius: '12px',
```
- **Verification:** Playwright test `the running screen fits a 360 px viewport and keeps the headers exposed` in `tests/e2e/accessibility.spec.ts` passed (overflow <= 1px).

---

### 5. `tests/e2e/accessibility.spec.ts` (Defect 3 / Test Harness)
- **Problem:** In `accessibility.spec.ts`, after setting files for candidate File A and File B, the test called `document.activeElement.blur()`. In Chromium, this cleared active focus but left the browser's sequential focus navigation position at `compare-file-b`. Pressing `Tab` then resumed into the footer rather than cycling back to `compare-start`. Additionally, the test did not await React's state update enabling the button.
- **Change:** Added `await expect(page.getByTestId('compare-start')).toBeEnabled()` to ensure React has enabled the action, and reset the sequential tab cursor cleanly to the document root using `window.scrollTo(0, 0)` and `page.locator('body').click({ position: { x: 0, y: 0 } })`.
- **Diff:**
```diff
--- a/tests/e2e/accessibility.spec.ts
+++ b/tests/e2e/accessibility.spec.ts
@@ -254,17 +254,18 @@ test('every start-screen control is reachable by Tab and has an accessible name'
   await page.getByTestId('compare-file-a').setInputFiles(fixturePath('plain-3x2.png'));
   await page.getByTestId('compare-file-b').setInputFiles(fixturePath('plain-3x2-filtered.png'));
 
-  // Reset focus to the document so the second pass starts from the top.
+  // Wait for React state to enable compare-start after file inputs are set
+  await expect(page.getByTestId('compare-start')).toBeEnabled();
+
+  // Reset focus to the document so the second pass starts cleanly from the top.
   await page.evaluate(() => {
-    if (document.activeElement instanceof HTMLElement) {
-      document.activeElement.blur();
-    }
+    window.scrollTo(0, 0);
   });
+  await page.locator('body').click({ position: { x: 0, y: 0 } });
 
   const withFiles = await tabStops(15);
 
   expect(withFiles.map((stop) => stop.id)).toContain('compare-start');
-  await expect(page.getByTestId('compare-start')).toBeEnabled();
 
   // Also verify /inspect tab stops
   await page.goto('/inspect');
```
- **Verification:** Playwright test `every start-screen control is reachable by Tab and has an accessible name` now passes in 1.5 seconds.
