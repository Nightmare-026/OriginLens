import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://originlens-ai.vercel.app';
const ROUTES = ['/', '/inspect', '/compare', '/how-to-use', '/about', '/privacy'];

async function measureWebVitals() {
  console.log(`[WebVitals] Starting browser metrics audit on ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const metricsReport = {};

  for (const route of ROUTES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    let lcp = null;
    let cls = 0;
    let longTasks = [];

    // Inject PerformanceObservers before navigation
    await page.addInitScript(() => {
      window.__webVitals = {
        lcp: null,
        cls: 0,
        longTasks: [],
      };

      // LCP observer
      try {
        const lcpObs = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          window.__webVitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // CLS observer
      try {
        const clsObs = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__webVitals.cls += entry.value;
            }
          }
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      // Long task observer (for TBT estimation)
      try {
        const ltObs = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            window.__webVitals.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        ltObs.observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    });

    const requests = [];
    page.on('requestfinished', async (req) => {
      try {
        const resp = await req.response();
        if (resp) {
          const headers = resp.headers();
          const size = Number(headers['content-length'] || 0);
          requests.push({
            url: req.url(),
            resourceType: req.resourceType(),
            status: resp.status(),
            size,
          });
        }
      } catch (e) {}
    });

    const startTime = Date.now();
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000); // Allow paints and observers to settle

    const vitals = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || null;
      const navEntry = performance.getEntriesByType('navigation')[0];

      return {
        fcp,
        lcp: window.__webVitals?.lcp || null,
        cls: window.__webVitals?.cls || 0,
        longTasks: window.__webVitals?.longTasks || [],
        ttfb: navEntry ? navEntry.responseStart - navEntry.requestStart : null,
        domInteractive: navEntry ? navEntry.domInteractive : null,
        domContentLoaded: navEntry ? navEntry.domContentLoadedEventEnd : null,
        loadComplete: navEntry ? navEntry.loadEventEnd : null,
      };
    });

    // Calculate TBT: sum of (duration - 50ms) for tasks between FCP and TTI/Load
    const tbt = vitals.longTasks
      .filter((t) => t.startTime >= (vitals.fcp || 0))
      .reduce((acc, t) => acc + Math.max(0, t.duration - 50), 0);

    const totalTransferredBytes = requests.reduce((acc, r) => acc + r.size, 0);

    metricsReport[route] = {
      fcpMs: Math.round(vitals.fcp || 0),
      lcpMs: Math.round(vitals.lcp || vitals.fcp || 0),
      cls: Number(vitals.cls.toFixed(4)),
      tbtMs: Math.round(tbt),
      ttfbMs: Math.round(vitals.ttfb || 0),
      domContentLoadedMs: Math.round(vitals.domContentLoaded || 0),
      loadCompleteMs: Math.round(vitals.loadComplete || 0),
      totalRequests: requests.length,
      totalTransferredBytes,
      longTaskCount: vitals.longTasks.length,
    };

    console.log(`Route ${route}: FCP=${metricsReport[route].fcpMs}ms, LCP=${metricsReport[route].lcpMs}ms, CLS=${metricsReport[route].cls}, TBT=${metricsReport[route].tbtMs}ms, Requests=${requests.length}`);
    await context.close();
  }

  fs.writeFileSync('d:/Projects/OriginLens/.agents/teamwork/worker_m2_gen2/web-vitals-results.json', JSON.stringify(metricsReport, null, 2));
  await browser.close();
  console.log('[WebVitals] Finished successfully.');
}

measureWebVitals().catch(console.error);
