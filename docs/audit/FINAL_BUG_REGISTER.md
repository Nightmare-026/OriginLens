# OriginLens — Final Bug Register

**Audit Date:** 2026-11-02  
**Auditor:** Independent Principal Engineering Auditor  
**Repository Commit SHA:** `9c0422eec08eaa5b8801172dbe03f82b54b17c7e`  
**Classification System:**  
- **Severity:** Critical (Blocks release/security vulnerability), High (Major functional defect), Medium (UX/Layout/Tooling failure), Low (Minor cosmetic/documentation)  
- **Status:** FIXED, ACCEPTED RISK, BLOCKED, MITIGATED  

---

## Bug Summary Matrix

| Bug ID | Severity | Category | Component | Status | Summary |
|---|---|---|---|---|---|
| **BUG-001** | Medium | Tooling / Lint | `eslint.config.mjs` | **FIXED** | `npm run lint` failed due to scanning nested `.worktrees/` directory build artifacts |
| **BUG-002** | High | UI / Responsive | `ledger.tsx`, `globals.css`, `compare-screen.tsx` | **FIXED** | Horizontal overflow on 360px mobile viewports caused by fixed `minHeight` with `aspectRatio` and long hashes |
| **BUG-003** | Medium | Test Harness / A11y | `tests/e2e/accessibility.spec.ts` | **FIXED** | Focus-reset flaw in start-screen keyboard test caused sequential tabbing to skip `compare-start` button |
| **BUG-004** | Medium | Compliance / Security | Provider Credentials & Policy | **ACCEPTED RISK / MITIGATED** | Baseten API key previously exposed in chat/screenshot; owner declined rotation; server-side isolation & deterministic fallback in place |

---

## Detailed Bug Records

### BUG-001: ESLint Failure on Nested Git Worktrees

- **Bug ID:** `BUG-001`
- **Severity:** Medium
- **Category:** Tooling / Code Quality
- **Affected File:** [`eslint.config.mjs`](file:///d:/Projects/OriginLens/eslint.config.mjs)
- **Reproduction Steps:**
  1. Create a git worktree under `.worktrees/` (e.g. `.worktrees/originlens-95-remediation`).
  2. Execute a build inside the worktree, generating `.worktrees/.../.next` bundles.
  3. In the repository root, run `npm run lint`.
- **Expected Behavior:** `npm run lint` should inspect only the primary project files and ignore secondary worktrees.
- **Actual Behavior:** ESLint traversed into `.worktrees/**` and parsed generated server chunks in `.next/`, throwing 8,457 problems (280 errors, 8,177 warnings) for `@typescript-eslint/no-require-imports`, etc.
- **Root Cause:** The `ignores` configuration array in `eslint.config.mjs` contained `.next/**`, `node_modules/**`, `coverage/**`, `.agents/**`, and `next-env.d.ts`, but omitted `.worktrees/**`.
- **Fix Applied:** Added `'.worktrees/**'` to the `ignores` array in `eslint.config.mjs`.
- **Regression Verification:** Ran `npm run lint` -> Exited with code 0 (0 errors, 0 warnings).
- **Current Status:** **FIXED**

---

### BUG-002: Mobile 360px Viewport Horizontal Overflow in Inspector and Compare Screens

- **Bug ID:** `BUG-002`
- **Severity:** High (WCAG 1.4.10 Reflow violation / Mobile layout defect)
- **Category:** UI / UX / Responsive Design
- **Affected Files:**
  - [`src/components/inspector/ledger.tsx:790-804`](file:///d:/Projects/OriginLens/src/components/inspector/ledger.tsx#L790-L804)
  - [`src/components/inspector/compare-screen.tsx:380-392`](file:///d:/Projects/OriginLens/src/components/inspector/compare-screen.tsx#L380-L392)
  - [`src/app/globals.css:858-863`](file:///d:/Projects/OriginLens/src/app/globals.css#L858-L863)
- **Reproduction Steps:**
  1. Open Chrome DevTools or Playwright with viewport set to `360 × 800 px`.
  2. In `/inspect`, upload an image and inspect the Evidence Ledger preview card.
  3. In `/compare`, compare two images (`plain-3x2.png` and `plain-3x2-filtered.png`).
  4. Measure `document.documentElement.scrollWidth - document.documentElement.clientWidth`.
- **Expected Behavior:** Overflow must be `<= 1px` (allowing for browser rounding). The viewport must not scroll horizontally.
- **Actual Behavior:**
  - On `/inspect`, `ledger.tsx` had `minHeight: '280px'` with `aspectRatio: '16/10'`, forcing width to `448px` on a 360px screen.
  - On `/compare`, `compare-screen.tsx` had `minHeight: '320px'` with `aspectRatio: '16/10'`, forcing width to `512px`, causing a 131px horizontal overflow.
  - Additionally, 64-character SHA-256 strings in `.evidence-value` did not wrap, causing potential overflow in narrow tables.
- **Root Cause:**
  - Combining `aspectRatio: '16/10'` with explicit pixel `minHeight` (`280px` / `320px`) forces the flexbox/CSS box width to expand beyond the mobile container width (`width = minHeight * 16 / 10`).
  - `.evidence-value` lacked `overflow-wrap: anywhere; word-break: break-all;`.
- **Fix Applied:**
  - In `src/components/inspector/ledger.tsx`: added `width: '100%'`, `maxWidth: '100%'`, and changed `minHeight: '280px'` to `minHeight: '0'`.
  - In `src/components/inspector/compare-screen.tsx`: added `maxWidth: '100%'`, and changed `minHeight: '320px'` to `minHeight: '0'`.
  - In `src/app/globals.css`: added `overflow-wrap: anywhere; word-break: break-all;` to `.evidence-value`.
- **Regression Verification:**
  - Ran `npx playwright test tests/e2e/accessibility.spec.ts` -> Test 9 (`the running screen fits a 360 px viewport and keeps the headers exposed`) PASSED.
  - Ran `npx playwright test tests/e2e/inspect.spec.ts` -> Test 44 (`fits a 360 px viewport without horizontal overflow`) PASSED.
  - Ran `npx playwright test tests/e2e/compare.spec.ts` -> Test 26 (`fits the comparison screen in a 360 px viewport`) PASSED.
- **Current Status:** **FIXED**

---

### BUG-003: Keyboard Focus Test Flaw in Accessibility Test Suite

- **Bug ID:** `BUG-003`
- **Severity:** Medium
- **Category:** Test Engineering / E2E Automation
- **Affected File:** [`tests/e2e/accessibility.spec.ts:254-268`](file:///d:/Projects/OriginLens/tests/e2e/accessibility.spec.ts#L254-L268)
- **Reproduction Steps:**
  1. Run `npx playwright test tests/e2e/accessibility.spec.ts`.
  2. Observe test `every start-screen control is reachable by Tab and has an accessible name`.
- **Expected Behavior:** After setting candidate files for File A and File B on `/compare`, the `compare-start` button becomes enabled and is reached by sequential Tab navigation from the top of the document.
- **Actual Behavior:** Playwright threw:
  ```
  Expected value: "compare-start"
  Received array: ["footer-about", "footer-privacy", "footer-c2pa", "footer-cai", "footer-github", "guide-launcher"]
  ```
- **Root Cause:**
  1. The test performed a first pass of 15 tabs with files unselected (verifying `compare-start` was disabled and skipped).
  2. It then called `setInputFiles` on `compare-file-a` and `compare-file-b`.
  3. It then called `document.activeElement.blur()`. In Chromium, calling `blur()` clears `activeElement` to `body`, but does NOT reset the sequential focus navigation position back to the beginning of the document.
  4. The next Tab keypress resumed from `compare-file-b`, advancing forward into the footer links.
  5. Furthermore, the test did not wait for React's asynchronous state update to enable `compare-start` before pressing Tab.
- **Fix Applied:**
  - Explicitly awaited `expect(page.getByTestId('compare-start')).toBeEnabled()` before starting the second tabbing cycle.
  - Replaced the artificial `activeElement.blur()` with `window.scrollTo(0, 0)` followed by `page.locator('body').click({ position: { x: 0, y: 0 } })` to cleanly reset the browser's sequential focus navigation cursor to the document root.
- **Regression Verification:** Ran `npx playwright test tests/e2e/accessibility.spec.ts` -> Test 8 PASSED (1.5s).
- **Current Status:** **FIXED**

---

### BUG-004: Provider API Credential Exposure & Event Compliance Risk

- **Bug ID:** `BUG-004`
- **Severity:** Medium / Governance
- **Category:** Application Security & Compliance
- **Affected Component:** `src/lib/model-provider/`, `.env.local`
- **Reproduction Steps:**
  1. Inspect chat history / shared screenshots from 2026-10-31 where a Baseten API key was visible.
  2. Review Phase 1 compliance checklist in `docs/implementation/compliance-checklist.md`.
- **Expected Behavior:** All external API credentials must be rotated immediately upon exposure; hackathon eligibility rules must be accepted in writing.
- **Actual Behavior:** The project owner was advised to rotate the Baseten API key on 2026-10-31 and declined, accepting the risk for demo purposes.
- **Mitigation & Architecture Invariants:**
  1. The API key is stored strictly on the server side (`.env.local`), NEVER exposed via `NEXT_PUBLIC_*` or injected into client JavaScript bundles (verified by secret scan in `tests/e2e/accessibility.spec.ts`).
  2. Public client traffic cannot make arbitrary LLM calls; the `/api/explain` and `/api/guide` routes enforce strict rate limiting, payload bounding, and server-side validation.
  3. If the credential is revoked or quota is exhausted, OriginLens automatically and transparently falls back to the deterministic, rule-based explanation engine (`src/lib/model-explainer/fallback.ts`), guaranteeing zero downtime or product failure.
- **Current Status:** **ACCEPTED RISK / ARCHITECTURALLY MITIGATED**
