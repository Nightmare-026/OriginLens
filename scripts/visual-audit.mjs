import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/nites/.gemini/antigravity/brain/d3fb7d74-a7db-466e-957d-88667c42d0af/visual-audit';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const consoleErrors = [];
const consoleWarnings = [];

async function runAudit() {
  console.log('🚀 Starting Comprehensive End-to-End Visual Audit of OriginLens...');
  const browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------
  // Audit 1: Landing Page (/) across Desktop, Tablet, Mobile
  // -------------------------------------------------------------
  console.log('\n--- Auditing Page: / (Landing Page) ---');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ page: '/', text: msg.text() });
      if (msg.type() === 'warning') consoleWarnings.push({ page: '/', text: msg.text() });
    });
    page.on('pageerror', err => {
      consoleErrors.push({ page: '/', text: err.message });
    });

    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_desktop_1440.png'), fullPage: true });

    // Test pipeline cards interactivity
    const pipelineCards = page.locator('.pipeline-step-card, .pipeline-stage-card, .pipeline-card, [role="button"].pipeline-stage');
    const cardCount = await pipelineCards.count();
    console.log(`Found ${cardCount} pipeline interactive items on landing page`);
    if (cardCount > 0) {
      await pipelineCards.nth(0).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_pipeline_card_clicked.png') });
    }

    // Tablet Viewport (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_tablet_768.png'), fullPage: true });

    // Mobile Viewport (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_mobile_375.png'), fullPage: true });

    // Check Mobile Hamburger Menu
    const menuBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_mobile_menu_open.png') });
    }

    await context.close();
  }

  // -------------------------------------------------------------
  // Audit 2: Single-Image Inspector (/inspect)
  // -------------------------------------------------------------
  console.log('\n--- Auditing Page: /inspect (Single-Image Inspector) ---');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ page: '/inspect', text: msg.text() });
      if (msg.type() === 'warning') consoleWarnings.push({ page: '/inspect', text: msg.text() });
    });

    await page.goto('http://localhost:3000/inspect');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_start_screen.png'), fullPage: true });

    // Load C2PA Valid Credential
    console.log('Loading C2PA Valid Credential preset...');
    const c2paBtn = page.locator('button', { hasText: 'Valid Credential' }).first();
    await c2paBtn.click();
    await page.waitForSelector('.category-tabs-nav', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Screenshot Tab 1: Executive Overview
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab1_overview.png'), fullPage: true });

    // Click Tab 2: C2PA Credentials
    console.log('Clicking Tab 2: C2PA Credentials...');
    await page.getByRole('tab', { name: /C2PA Credentials/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab2_c2pa.png'), fullPage: true });

    // Click Tab 3: Camera & EXIF
    console.log('Clicking Tab 3: Camera & EXIF...');
    await page.getByRole('tab', { name: /Camera & EXIF/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab3_metadata.png'), fullPage: true });

    // Check GPS Reveal Button if present
    const revealGpsBtn = page.locator('button.btn-reveal-gps');
    if (await revealGpsBtn.isVisible()) {
      console.log('Testing GPS Reveal Button...');
      await revealGpsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab3_gps_unmasked.png') });
    }

    // Click Tab 4: AI Clues & Co-Pilot
    console.log('Clicking Tab 4: AI Clues & Co-Pilot...');
    await page.getByRole('tab', { name: /AI Clues & Co-Pilot/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab4_ai.png'), fullPage: true });

    // Test Model Explainer button & dialog
    const explainBtn = page.locator('button', { hasText: /Explain with Meta Llama|Generate Plain-Language Summary/i }).first();
    if (await explainBtn.isVisible()) {
      console.log('Triggering Model Explainer...');
      await explainBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab4_ai_consent_modal.png') });

      // Click Confirm/Consent if dialog appears
      const confirmBtn = page.locator('button', { hasText: /Yes, Request Explanation|I Agree|Confirm/i }).first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab4_ai_explanation_result.png') });
      }
    }

    // Click Tab 5: Technical Audit
    console.log('Clicking Tab 5: Technical Audit...');
    await page.getByRole('tab', { name: /Technical Audit/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab5_audit.png'), fullPage: true });

    // Click Tab 6: Complete View
    console.log('Clicking Tab 6: Complete View...');
    await page.getByRole('tab', { name: /Complete View/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_tab6_all.png'), fullPage: true });

    // Test Mobile Responsiveness on /inspect
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspect_mobile_375.png'), fullPage: true });

    await context.close();
  }

  // -------------------------------------------------------------
  // Audit 3: Dual-File Comparison (/compare)
  // -------------------------------------------------------------
  console.log('\n--- Auditing Page: /compare (Provenance Delta) ---');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ page: '/compare', text: msg.text() });
      if (msg.type() === 'warning') consoleWarnings.push({ page: '/compare', text: msg.text() });
    });

    await page.goto('http://localhost:3000/compare');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_start_screen.png'), fullPage: true });

    console.log('Loading Compare Pair preset on /compare...');
    const comparePairBtn = page.locator('button[data-testid="preset-compare-pair"]').first();
    if (await comparePairBtn.isVisible()) {
      await comparePairBtn.click();
      await page.waitForSelector('.category-tabs-nav', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Screenshot comparison screen
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_results_tab1.png'), fullPage: true });

      // Test Visual Diff Tab
      console.log('Clicking Visual Diff Tab...');
      await page.getByRole('tab', { name: /Visual Diff & Heatmap/i }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_tab_visual_diff.png'), fullPage: true });

      // Test swipe slider dragging
      const sliderHandle = page.locator('.slider-handle, .visual-diff-handle, [role="slider"]').first();
      if (await sliderHandle.isVisible()) {
        const box = await sliderHandle.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x - 100, box.y + box.height / 2);
          await page.mouse.up();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_slider_dragged.png') });
        }
      }

      // Test Metadata Delta Tab
      await page.getByRole('tab', { name: /Metadata Delta/i }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_tab_metadata.png'), fullPage: true });

      // Mobile comparison layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_compare_mobile_375.png'), fullPage: true });
    }

    await context.close();
  }

  // -------------------------------------------------------------
  // Audit 4: How-to-Use (/how-to-use) & Privacy (/privacy)
  // -------------------------------------------------------------
  console.log('\n--- Auditing Page: /how-to-use & /privacy ---');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/how-to-use');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_how_to_use_desktop.png'), fullPage: true });

    await page.goto('http://localhost:3000/privacy');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_privacy_desktop.png'), fullPage: true });

    // 404 test
    await page.goto('http://localhost:3000/non-existent-page-test-404');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_404_page.png'), fullPage: true });

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log(`✅ Visual Audit completed! Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`Total Console Errors captured: ${consoleErrors.length}`);
  console.log(`Total Console Warnings captured: ${consoleWarnings.length}`);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', JSON.stringify(consoleErrors, null, 2));
  }
  if (consoleWarnings.length > 0) {
    console.log('Console Warnings:', JSON.stringify(consoleWarnings, null, 2));
  }
}

runAudit().catch(err => {
  console.error('Audit run failed with error:', err);
  process.exit(1);
});
