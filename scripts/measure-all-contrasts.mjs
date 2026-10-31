import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://originlens-ai.vercel.app';

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function parseRgb(colorStr) {
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function auditContrasts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Auditing contrast on / ...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  const elementsToTest = [
    { name: 'Hero Stepper Stage 1 Pill', selector: '.stage-indicator-pill' },
    { name: 'Hero Stepper Inactive Tab 2 Number', selector: '#tab-stage-2 .stage-tab-num' },
    { name: 'Hero Stepper Inactive Tab 2 Title', selector: '#tab-stage-2 .stage-tab-title' },
    { name: 'Hero Stepper Active Tab Title', selector: '.stage-tab-active .stage-tab-title' },
    { name: 'Hero Eyebrow Text', selector: '.eyebrow' },
    { name: 'Hero Lede Text', selector: '.lede' },
    { name: 'Primary CTA Button (Inspect)', selector: 'a[href="/inspect"].button, a[href="/inspect"].button-primary, .button' },
    { name: 'Secondary Ghost Button (How to Use)', selector: 'a[href="/how-to-use"]' },
    { name: 'Footer Nav Links', selector: 'footer a' },
  ];

  const contrastFindings = [];

  for (const item of elementsToTest) {
    const loc = page.locator(item.selector).first();
    if (await loc.count() > 0) {
      const data = await loc.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        let bg = computed.backgroundColor;
        let parent = el.parentElement;
        while (bg === 'rgba(0, 0, 0, 0)' && parent) {
          bg = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        if (bg === 'rgba(0, 0, 0, 0)') bg = 'rgb(237, 241, 247)'; // default background
        return {
          fg: computed.color,
          bg,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          text: (el.textContent || '').trim().slice(0, 40),
        };
      });

      const fgRgb = parseRgb(data.fg);
      const bgRgb = parseRgb(data.bg);
      if (fgRgb && bgRgb) {
        const ratio = contrastRatio(fgRgb, bgRgb);
        const fontSizePx = parseFloat(data.fontSize);
        const isBold = parseInt(data.fontWeight, 10) >= 700 || data.fontWeight === 'bold';
        const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && isBold);
        const requiredRatio = isLargeText ? 3.0 : 4.5;
        const passesAA = ratio >= requiredRatio;

        contrastFindings.push({
          name: item.name,
          selector: item.selector,
          text: data.text,
          fg: { rgb: data.fg, hex: rgbToHex(fgRgb) },
          bg: { rgb: data.bg, hex: rgbToHex(bgRgb) },
          fontSize: data.fontSize,
          fontWeight: data.fontWeight,
          isLargeText,
          measuredRatio: Number(ratio.toFixed(2)),
          requiredRatio,
          passesAA,
        });
      }
    }
  }

  // Also check /inspect badges and muted elements
  console.log('Auditing contrast on /inspect ...');
  await page.goto(`${BASE_URL}/inspect`, { waitUntil: 'networkidle' });

  const inspectElements = [
    { name: 'Inspector Dropzone Prompt', selector: '.dropzone-prompt, .dropzone-prompt strong' },
    { name: 'Inspector Dropzone Note', selector: '.dropzone-note, .dropzone-box .note' },
    { name: 'Inspector Preset C2PA Badge', selector: '[data-testid="preset-c2pa-valid"] .preset-badge' },
    { name: 'Inspector Preset Tampered Badge', selector: '[data-testid="preset-c2pa-tampered"] .preset-badge' },
    { name: 'Inspector Preset Camera Badge', selector: '[data-testid="preset-unsigned-photo"] .preset-badge' },
    { name: 'Inspector Preset AI Badge', selector: '[data-testid="preset-ai-sample"] .preset-badge' },
  ];

  for (const item of inspectElements) {
    const loc = page.locator(item.selector).first();
    if (await loc.count() > 0) {
      const data = await loc.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        let bg = computed.backgroundColor;
        let parent = el.parentElement;
        while (bg === 'rgba(0, 0, 0, 0)' && parent) {
          bg = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        if (bg === 'rgba(0, 0, 0, 0)') bg = 'rgb(237, 241, 247)';
        return {
          fg: computed.color,
          bg,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          text: (el.textContent || '').trim().slice(0, 40),
        };
      });

      const fgRgb = parseRgb(data.fg);
      const bgRgb = parseRgb(data.bg);
      if (fgRgb && bgRgb) {
        const ratio = contrastRatio(fgRgb, bgRgb);
        const fontSizePx = parseFloat(data.fontSize);
        const isBold = parseInt(data.fontWeight, 10) >= 700 || data.fontWeight === 'bold';
        const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && isBold);
        const requiredRatio = isLargeText ? 3.0 : 4.5;
        const passesAA = ratio >= requiredRatio;

        contrastFindings.push({
          name: item.name,
          selector: item.selector,
          text: data.text,
          fg: { rgb: data.fg, hex: rgbToHex(fgRgb) },
          bg: { rgb: data.bg, hex: rgbToHex(bgRgb) },
          fontSize: data.fontSize,
          fontWeight: data.fontWeight,
          isLargeText,
          measuredRatio: Number(ratio.toFixed(2)),
          requiredRatio,
          passesAA,
        });
      }
    }
  }

  console.log(JSON.stringify(contrastFindings, null, 2));
  fs.writeFileSync('d:/Projects/OriginLens/.agents/teamwork/worker_m2_gen2/contrast-findings.json', JSON.stringify(contrastFindings, null, 2));

  await browser.close();
}

auditContrasts().catch(console.error);
