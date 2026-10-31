import { chromium } from 'playwright';

const BASE_URL = 'https://originlens-ai.vercel.app';

async function testCompareSlider() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to /compare on production...');
  await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle' });

  // Open presets
  const presetsAccordion = page.locator('.presets-panel summary');
  const isOpen = await page.locator('.presets-panel').getAttribute('open');
  if (isOpen === null) {
    await presetsAccordion.click();
    await page.waitForTimeout(300);
  }

  // Click compare-pair preset
  console.log('Clicking preset-compare-pair...');
  await page.locator('[data-testid="preset-compare-pair"]').click();

  // Wait for compare screen to be ready
  await page.waitForSelector('[data-testid="compare-heading"]', { timeout: 45000 });
  console.log('Compare screen loaded! Heading:', await page.locator('[data-testid="compare-heading"]').textContent());

  // Check VisualDiffSlider
  const hasSliderPanel = await page.locator('.visual-diff-panel').isVisible();
  const slider = page.locator('[role="slider"]');
  const hasSlider = await slider.isVisible();
  const sliderValue = await slider.getAttribute('aria-valuenow');

  console.log('VisualDiffSlider panel visible:', hasSliderPanel);
  console.log('Slider handle visible:', hasSlider, 'initial value:', sliderValue);

  // Test slider presets: 100% A, 50/50, 100% B
  const presetButtons = page.locator('.slider-preset-group button');
  const btnCount = await presetButtons.count();
  console.log(`Found ${btnCount} slider preset buttons`);

  // Click 100% B
  await presetButtons.nth(2).click();
  await page.waitForTimeout(200);
  const valB = await slider.getAttribute('aria-valuenow');
  console.log('After clicking 100% B, slider value:', valB);

  // Test Heatmap Toggle
  const heatmapBtn = page.locator('[data-testid="toggle-diff-heatmap"]');
  console.log('Heatmap button visible:', await heatmapBtn.isVisible());
  await heatmapBtn.click();
  await page.waitForTimeout(300);
  const heatmapCanvas = page.locator('.diff-heatmap-canvas');
  console.log('Heatmap canvas visible:', await heatmapCanvas.isVisible());

  // Test Comparison Tabs
  const compareTabs = page.locator('.category-tabs-nav [role="tab"]');
  const tabCount = await compareTabs.count();
  const tabNames = [];
  for (let i = 0; i < tabCount; i++) {
    tabNames.push((await compareTabs.nth(i).textContent()).trim());
  }
  console.log('Comparison categories tabs:', tabNames);

  await context.close();
  await browser.close();
}

testCompareSlider().catch(console.error);
