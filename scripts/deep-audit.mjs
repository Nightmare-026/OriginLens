import { chromium } from '@playwright/test';

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const auditResults = {
    pages: {},
    interactions: {},
    consoleErrors: [],
    responsive: {},
    frictionPoints: [],
    featureHighlights: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      auditResults.consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  const routes = ['/', '/inspect', '/compare', '/how-to-use', '/privacy', '/dev/c2pa-smoke'];

  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    const title = await page.title();
    const h1 = await page.locator('h1').textContent().catch(() => null);

    // Check canonical and og:url
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content').catch(() => null);

    auditResults.pages[route] = {
      status: res.status(),
      title,
      h1: h1?.trim(),
      canonical,
      ogUrl,
    };
  }

  // --- Test 1: Homepage Hero Pipeline Stepper Navigation ---
  await page.goto('http://localhost:3000/');
  const tabs = page.locator('.pipeline-stage-tab');
  const tabCount = await tabs.count();
  auditResults.interactions.heroTabsCount = tabCount;

  // Click through each tab
  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click();
    const activeText = await page.locator('.pipeline-stage-tab.stage-tab-active .stage-tab-title').textContent();
    auditResults.interactions[`tab_${i}_clicked`] = activeText?.trim();
  }

  // --- Test 2: Inspect Screen - Presets and Ledger ---
  await page.goto('http://localhost:3000/inspect');
  // Check presets accordion collapsed state
  const detailsOpen = await page.locator('.presets-panel').getAttribute('open');
  auditResults.interactions.presetsAccordionOpenByDefault = detailsOpen !== null;

  // Open presets accordion
  await page.locator('.presets-panel summary').click();

  // Click Preset 1 (Verified C2PA)
  const preset1 = page.locator('.preset-chip').first();
  await preset1.click();

  // Wait for ledger
  await page.waitForSelector('.evidence-ledger', { timeout: 15000 });
  const hasLedger = await page.locator('.evidence-ledger').isVisible();
  const hasPreviewCard = await page.locator('.inspected-media-card').isVisible();
  const hasLineageGraph = await page.locator('.c2pa-lineage-graph').isVisible();
  const hasMetaLlamaCard = await page.locator('.model-explanation-card').isVisible();

  // Test Lightbox open and Escape dismiss
  await page.locator('.preview-zoom-btn').click();
  const lightboxVisible = await page.locator('.lightbox-modal').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const lightboxClosed = !(await page.locator('.lightbox-modal').isVisible());

  // Test Meta Llama Audience Mode tabs
  const audienceTabs = page.locator('.audience-tab');
  const audienceTabCount = await audienceTabs.count();
  await audienceTabs.nth(1).click(); // Click Newsroom
  const newsroomActive = await audienceTabs.nth(1).getAttribute('class');

  auditResults.interactions.inspectFlow = {
    hasLedger,
    hasPreviewCard,
    hasLineageGraph,
    hasMetaLlamaCard,
    lightboxOpenedAndEscapedCleanly: lightboxVisible && lightboxClosed,
    audienceTabCount,
    newsroomTabActive: newsroomActive?.includes('active'),
  };

  // Test Clear Session
  await page.locator('button:has-text("Clear session")').first().click();
  await page.waitForTimeout(400);
  const returnedToStart = await page.locator('.intake-dropzone').isVisible();
  auditResults.interactions.clearSessionWorked = returnedToStart;

  // --- Test 3: Compare Screen - 2-Column Inputs & Swipe Slider ---
  await page.goto('http://localhost:3000/compare');
  // Verify 2-column grid
  const compareGrid = await page.locator('.compare-inputs-grid').evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
    };
  });
  auditResults.interactions.compareGrid = compareGrid;

  // Open compare preset accordion
  await page.locator('.presets-panel summary').click();
  // Click Preset 4 (Compare Pair)
  const comparePresetBtn = page.locator('.preset-chip:has-text("Compare Pair")');
  if (await comparePresetBtn.count() > 0) {
    await comparePresetBtn.click();
    await page.waitForSelector('.visual-diff-container', { timeout: 15000 });
    const hasVisualDiff = await page.locator('.visual-diff-container').isVisible();
    const hasSlider = await page.locator('.diff-slider-handle').isVisible();

    // Toggle heatmap
    const heatmapToggle = page.locator('#toggle-heatmap');
    await heatmapToggle.click();
    const heatmapCanvasVisible = await page.locator('.diff-heatmap-canvas').isVisible();

    auditResults.interactions.compareFlow = {
      hasVisualDiff,
      hasSlider,
      heatmapCanvasVisible,
    };
  }

  // --- Test 4: Mobile Viewport Responsiveness ---
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/');
  const heroH1FontSize = await page.locator('.landing-hero-title').evaluate((el) => window.getComputedStyle(el).fontSize);
  const horizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  // Check mobile hamburger button
  const hamburgerVisibleMobile = await page.locator('#nav-menu-button').isVisible();

  // Test menu open on mobile
  await page.locator('#nav-menu-button').click();
  const dropdownVisible = await page.locator('#nav-dropdown-menu').isVisible();

  auditResults.responsive.mobile = {
    viewport: '375x812',
    heroH1FontSize,
    hasHorizontalScroll: horizontalScroll,
    hamburgerVisibleMobile,
    dropdownOpened: dropdownVisible,
  };

  // --- Analyze UX friction points and opportunities ---
  // Check contrast and font sizes
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/inspect');
  await page.locator('.presets-panel summary').click();
  await page.locator('.preset-chip').first().click();
  await page.waitForSelector('.evidence-ledger');

  const ledgerSummaryBox = await page.locator('.ledger-summary-box').evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      background: style.backgroundColor,
      color: style.color,
      borderRadius: style.borderRadius,
    };
  });

  auditResults.uxDetails = {
    ledgerSummaryBox,
  };

  await browser.close();

  console.log(JSON.stringify(auditResults, null, 2));
}

runAudit().catch(console.error);

