import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://originlens-ai.vercel.app';
const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'Small Mobile', width: 360, height: 800 },
];

const ROUTES = [
  '/',
  '/inspect',
  '/compare',
  '/how-to-use',
  '/privacy',
  '/about',
  '/dev/c2pa-smoke',
];

async function runAudit() {
  console.log(`[Audit] Starting production audit against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    routes: {},
    axeScans: {},
    multiViewport: {},
    contrastChecks: {},
    keyboardAudit: {},
    performanceMetrics: {},
    bundleSecretScan: {},
    networkFaultTolerance: {},
    consoleMessages: [],
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    results.consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (err) => {
    results.consoleMessages.push({
      type: 'pageerror',
      text: err.message,
      stack: err.stack,
    });
  });

  // --- 1. Route Discovery & Status ---
  console.log('\n--- 1. Testing Route Availability & Headers ---');
  for (const route of ROUTES) {
    try {
      const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = resp ? resp.status() : null;
      const headers = resp ? resp.headers() : {};
      const title = await page.title();
      const h1Count = await page.locator('h1').count();
      const h1Text = h1Count > 0 ? (await page.locator('h1').first().textContent())?.trim() : null;

      results.routes[route] = {
        status,
        title,
        h1Count,
        h1Text,
        securityHeaders: {
          csp: headers['content-security-policy'] || null,
          xContentTypeOptions: headers['x-content-type-options'] || null,
          xFrameOptions: headers['x-frame-options'] || null,
          referrerPolicy: headers['referrer-policy'] || null,
          permissionsPolicy: headers['permissions-policy'] || null,
          strictTransportSecurity: headers['strict-transport-security'] || null,
          accessControlAllowOrigin: headers['access-control-allow-origin'] || null,
        },
      };
      console.log(`Route: ${route} -> Status: ${status}, Title: "${title}", h1Count: ${h1Count}`);
    } catch (err) {
      results.routes[route] = { error: err.message };
      console.error(`Route: ${route} -> ERROR:`, err.message);
    }
  }

  // --- 2. Automated WCAG 2.2 AA Axe Scans on Core Pages ---
  console.log('\n--- 2. Running Automated Axe Core Accessibility Scans ---');
  const pagesToScan = ['/', '/inspect', '/compare', '/how-to-use', '/privacy', '/about'];
  for (const route of pagesToScan) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      const axeScan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      results.axeScans[route] = {
        violationsCount: axeScan.violations.length,
        violations: axeScan.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map(n => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        })),
        passesCount: axeScan.passes.length,
        incompleteCount: axeScan.incomplete.length,
      };
      console.log(`Axe scan for ${route}: ${axeScan.violations.length} violations, ${axeScan.passes.length} passes, ${axeScan.incomplete.length} incomplete`);
    } catch (err) {
      results.axeScans[route] = { error: err.message };
      console.error(`Axe scan failed for ${route}:`, err.message);
    }
  }

  // --- 3. Multi-Viewport Testing across 5 exact viewports ---
  console.log('\n--- 3. Running Multi-Viewport Checks ---');
  for (const vp of VIEWPORTS) {
    results.multiViewport[vp.name] = {
      viewport: `${vp.width}x${vp.height}`,
      pages: {},
    };

    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of ['/', '/inspect', '/compare', '/how-to-use']) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          overflowPixels: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      });

      const navState = await page.evaluate(() => {
        const hamburger = document.querySelector('#nav-menu-button, button[aria-label*="menu" i], button[aria-label*="navigation" i]');
        const desktopNav = document.querySelector('.main-nav, .nav-links, header nav');
        return {
          hamburgerVisible: hamburger ? window.getComputedStyle(hamburger).display !== 'none' : false,
          desktopNavDisplay: desktopNav ? window.getComputedStyle(desktopNav).display : null,
        };
      });

      results.multiViewport[vp.name].pages[route] = {
        overflow,
        navState,
      };
    }
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}) complete.`);
  }

  // Save intermediate results
  fs.writeFileSync('d:/Projects/OriginLens/.agents/teamwork/worker_m2_gen2/audit-results-part1.json', JSON.stringify(results, null, 2));

  await context.close();
  await browser.close();
  console.log('\n[Audit] Part 1 successfully completed and saved.');
}

runAudit().catch(console.error);
