import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://originlens-ai.vercel.app';

async function runJourneyAndPerfAudit() {
  console.log(`[Journey & Perf Audit] Testing production at ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const report = {
    journeyInspect: {},
    journeyCompare: {},
    keyboardAudit: {},
    performanceMetrics: {},
    bundleSecretScan: {},
    networkFaultTolerance: {},
    errors: [],
  };

  page.on('pageerror', (err) => {
    report.errors.push({ type: 'pageerror', text: err.message });
  });

  // --------------------------------------------------------------------------
  // 1. Performance & Navigation Timings on Production
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Measuring Performance & Navigation Timings ---');
  for (const route of ['/', '/inspect', '/compare']) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    const timing = await page.evaluate(() => {
      const perfNav = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || null;

      return {
        domContentLoaded: perfNav ? perfNav.domContentLoadedEventEnd - perfNav.startTime : null,
        loadComplete: perfNav ? perfNav.loadEventEnd - perfNav.startTime : null,
        ttfb: perfNav ? perfNav.responseStart - perfNav.requestStart : null,
        fcp,
      };
    });
    report.performanceMetrics[route] = timing;
    console.log(`Perf for ${route}:`, timing);
  }

  // --------------------------------------------------------------------------
  // 2. User Experience Journey: Inspect Screen & Presets
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Inspect Screen Interactive Journey ---');
  await page.goto(`${BASE_URL}/inspect`, { waitUntil: 'networkidle' });

  // Check start screen elements
  const startScreenVisible = await page.locator('.intake-dropzone, [data-testid="start-screen"]').isVisible();
  const presetsAccordion = page.locator('.presets-panel summary');
  const hasPresets = (await presetsAccordion.count()) > 0;

  let presetSuccess = false;
  if (hasPresets) {
    const isOpen = await page.locator('.presets-panel').getAttribute('open');
    if (isOpen === null) {
      await presetsAccordion.first().click();
      await page.waitForTimeout(300);
    }

    const presetChips = page.locator('.preset-chip, .preset-btn');
    const chipCount = await presetChips.count();
    console.log(`Found ${chipCount} preset buttons on /inspect`);

    if (chipCount > 0) {
      // Click first preset (Verified C2PA)
      await presetChips.first().click();
      console.log('Clicked first preset, awaiting analysis...');

      try {
        await page.waitForSelector('.evidence-ledger, [data-testid="ledger"]', { timeout: 35000 });
        presetSuccess = true;
      } catch (e) {
        console.warn('Waiting for ledger timed out or failed:', e.message);
      }
    }
  }

  let ledgerTabs = [];
  let lightboxOpened = false;
  let lightboxClosed = false;
  let audienceTabsCount = 0;

  if (presetSuccess) {
    const tabs = page.locator('[role="tab"], .category-tab-btn');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const text = await tabs.nth(i).textContent();
      ledgerTabs.push(text.trim());
    }

    // Test Zoom / Lightbox
    const zoomBtn = page.locator('.preview-zoom-btn, button[aria-label*="zoom" i], button[aria-label*="enlarge" i]');
    if (await zoomBtn.count() > 0 && await zoomBtn.first().isVisible()) {
      await zoomBtn.first().click();
      await page.waitForTimeout(300);
      lightboxOpened = await page.locator('.lightbox-modal, dialog[open]').isVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      lightboxClosed = !(await page.locator('.lightbox-modal, dialog[open]').isVisible());
    }

    // Test Audience tabs
    const audTabs = page.locator('.audience-tab');
    audienceTabsCount = await audTabs.count();
  }

  report.journeyInspect = {
    startScreenVisible,
    hasPresets,
    presetSuccess,
    ledgerTabs,
    lightboxOpened,
    lightboxClosed,
    audienceTabsCount,
  };
  console.log('Journey Inspect result:', report.journeyInspect);

  // --------------------------------------------------------------------------
  // 3. User Experience Journey: Compare Screen
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Compare Screen Interactive Journey ---');
  await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle' });

  const comparePresets = page.locator('.presets-panel summary');
  let compareLoaded = false;
  let hasSlider = false;
  let hasHeatmap = false;

  if ((await comparePresets.count()) > 0) {
    const isOpen = await page.locator('.presets-panel').getAttribute('open');
    if (isOpen === null) {
      await comparePresets.first().click();
      await page.waitForTimeout(300);
    }

    const compareChip = page.locator('.preset-chip, .preset-btn').first();
    if (await compareChip.isVisible()) {
      await compareChip.click();
      console.log('Clicked compare preset, awaiting diff results...');
      try {
        await page.waitForSelector('.visual-diff-container, [data-testid="compare-ledger"]', { timeout: 25000 });
        compareLoaded = true;
        hasSlider = await page.locator('.diff-slider-handle, input[type="range"]').isVisible();
        const heatmapToggle = page.locator('#toggle-heatmap');
        if (await heatmapToggle.count() > 0) {
          hasHeatmap = true;
        }
      } catch (e) {
        console.warn('Compare wait timed out:', e.message);
      }
    }
  }

  report.journeyCompare = {
    compareLoaded,
    hasSlider,
    hasHeatmap,
  };
  console.log('Journey Compare result:', report.journeyCompare);

  // --------------------------------------------------------------------------
  // 4. Keyboard Navigation & Focus Ring Audit
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Keyboard Navigation & Focus Visible Audit ---');
  await page.goto(`${BASE_URL}/inspect`, { waitUntil: 'networkidle' });

  // Tab through first 20 elements on /inspect
  const tabStops = [];
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      const computed = window.getComputedStyle(active);
      return {
        tag: active.tagName.toLowerCase(),
        id: active.id || null,
        ariaLabel: active.getAttribute('aria-label') || null,
        text: (active.textContent || '').trim().slice(0, 30),
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        boxShadow: computed.boxShadow,
      };
    });
    if (stop) {
      const hasFocusIndicator =
        (stop.outlineStyle !== 'none' && stop.outlineWidth !== '0px') ||
        (stop.boxShadow && stop.boxShadow.includes('16, 185, 129'));
      tabStops.push({ ...stop, hasFocusIndicator });
    }
  }
  report.keyboardAudit = {
    tabStopsCount: tabStops.length,
    tabStops,
  };
  console.log(`Recorded ${tabStops.length} tab stops.`);

  // --------------------------------------------------------------------------
  // 5. Client Bundle Scanning for Secret Leakage
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Scanning Client Bundles for Secret Leakage ---');
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).map((s) => s.src);
  });

  const secretScanFindings = [];
  const regexPatterns = [
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9_-]{20,}/g },
    { name: 'Baseten API Key', regex: /baseten-[a-zA-Z0-9_-]{20,}/gi },
    { name: 'Generic Bearer Token', regex: /Bearer\s+[a-zA-Z0-9_\-\.]{30,}/g },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Private Key block', regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/g },
  ];

  for (const scriptUrl of scripts) {
    try {
      const resp = await context.request.get(scriptUrl);
      const text = await resp.text();
      for (const pattern of regexPatterns) {
        const matches = text.match(pattern.regex);
        if (matches) {
          secretScanFindings.push({
            script: scriptUrl,
            pattern: pattern.name,
            matchCount: matches.length,
          });
        }
      }
    } catch (e) {
      console.warn(`Could not fetch script ${scriptUrl}:`, e.message);
    }
  }

  report.bundleSecretScan = {
    scriptsScannedCount: scripts.length,
    findings: secretScanFindings,
    clean: secretScanFindings.length === 0,
  };
  console.log(`Bundle secret scan completed: ${scripts.length} scripts scanned, ${secretScanFindings.length} secrets found.`);

  // Save report
  fs.writeFileSync('d:/Projects/OriginLens/.agents/teamwork/worker_m2_gen2/audit-results-part2.json', JSON.stringify(report, null, 2));

  await context.close();
  await browser.close();
  console.log('\n[Audit] Part 2 successfully completed and saved.');
}

runJourneyAndPerfAudit().catch(console.error);
