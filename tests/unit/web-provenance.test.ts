import { describe, expect, it } from 'vitest';
import {
  generateWebSearchLinks,
  queryWebProvenance,
  WEB_PROVENANCE_DISCLOSURES,
} from '@/lib/web-provenance/lookup';

describe('Web Provenance & Reverse Lookup (Feature 4)', () => {
  const sampleSha256 = '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864';

  it('generates valid search engine links for Google Lens, TinEye, Bing, and Wayback', () => {
    const links = generateWebSearchLinks(sampleSha256);

    expect(links.googleLens).toContain('lens.google.com');
    expect(links.googleLens).toContain(sampleSha256);

    expect(links.tineye).toContain('tineye.com');
    expect(links.tineye).toContain(sampleSha256);

    expect(links.bingVisual).toContain('bing.com');
    expect(links.bingVisual).toContain(sampleSha256);

    expect(links.waybackMachine).toContain('archive.org');
    expect(links.waybackMachine).toContain(sampleSha256);
  });

  it('rejects invalid SHA-256 hashes gracefully', async () => {
    const result = await queryWebProvenance('bad-hash');
    expect(result.status).toBe('error');
    expect(result.occurrences).toHaveLength(0);
  });

  it('includes mandatory honest uncertainty disclosures', () => {
    expect(WEB_PROVENANCE_DISCLOSURES.length).toBeGreaterThanOrEqual(3);
    const combined = WEB_PROVENANCE_DISCLOSURES.join(' ');
    expect(combined).toContain('zero image bytes');
    expect(combined).toContain('Absence of online matches');
  });
});
