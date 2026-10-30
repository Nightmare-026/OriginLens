import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/explain/route';

describe('/api/explain Route Handler Unit Tests', () => {
  it('rejects cross-origin requests with sec-fetch-site cross-site', async () => {
    const req = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
        origin: 'https://malicious-site.example',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden');
  });

  it('rejects payloads exceeding 64 KiB with 413 Payload Too Large', async () => {
    const hugeBody = JSON.stringify({
      schemaVersion: '2.0',
      consent: true,
      model: 'meta-models/muse-spark-open-1026',
      report: {
        hugeText: 'x'.repeat(70 * 1024),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'same-origin',
      },
      body: hugeBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain('Payload Too Large');
  });

  it('rejects invalid schema with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify({ schemaVersion: '1.0', consent: false }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Bad Request');
  });

  it('accepts valid request and returns 200 with structured explanation', async () => {
    const validBody = {
      schemaVersion: '2.0',
      consent: true,
      model: 'meta-models/muse-spark-open-1026',
      report: {
        reportId: 'rpt_valid_123456',
        summaryCodes: ['no_supported_embedded_credentials'],
        trustPolicyId: 'c2pa_default',
        files: [
          {
            fileId: 'file_valid_123',
            detectedMimeType: 'image/jpeg',
            byteSize: 2048,
            width: 100,
            height: 100,
            sha256: 'b'.repeat(64),
          },
        ],
        checks: [
          {
            checkId: 'chk_c2pa_val',
            kind: 'c2pa',
            executionState: 'completed',
            outcome: 'not_present',
            warnings: [],
            limitations: [],
          },
        ],
        evidence: [
          {
            evidenceId: 'ev_sha256_b',
            sourceCheckId: 'chk_c2pa_val',
            key: 'sha256',
            valueType: 'hash',
            value: 'b'.repeat(64),
            authority: 'file_measurement',
          },
        ],
        disclaimers: ['Test disclaimer'],
      },
    };

    const req = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBeDefined();
    expect(data.plainLanguageSummary).toBeDefined();
    expect(Array.isArray(data.whatThisSupports)).toBe(true);
    expect(Array.isArray(data.whatRemainsUnknown)).toBe(true);
  });
});
