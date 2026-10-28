import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/c2pa/lookup/route';

describe('/api/c2pa/lookup Route Handler Unit Tests (Feature 2)', () => {
  it('rejects cross-origin requests with sec-fetch-site cross-site', async () => {
    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
        origin: 'https://malicious.example',
      },
      body: JSON.stringify({ sha256: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects payload exceeding 64 KiB with 413 Payload Too Large', async () => {
    const hugeBody = JSON.stringify({
      sha256: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864',
      padding: 'x'.repeat(70 * 1024),
    });

    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: hugeBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain('Payload Too Large');
  });

  it('rejects invalid SHA-256 hash format with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ sha256: 'invalid-hash' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid request body');
  });

  it('blocks SSRF attempt with untrusted registry domain', async () => {
    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({
        sha256: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864',
        registryUrl: 'http://169.254.169.254/latest/meta-data',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('approved HTTPS Content Authenticity registries');
  });

  it('recovers durable manifest for known public test fixture hash', async () => {
    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({
        sha256: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('recovered');
    expect(data.recoveredManifest).toBeDefined();
    expect(data.recoveredManifest.title).toBe('C.jpg');
    expect(data.recoveredManifest.issuer).toBe('C2PA Test Signing Cert');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns not_found for unknown SHA-256 hash', async () => {
    const unknownHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const req = new NextRequest('http://localhost:3000/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ sha256: unknownHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('not_found');
    expect(data.recoveredManifest).toBeNull();
  });
});
