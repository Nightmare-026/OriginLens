import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/guide/route';

function request(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/guide', {
    method: 'POST',
    headers,
    body,
  });
}

describe('/api/guide route handler', () => {
  beforeEach(() => {
    process.env.MODEL_EXPLANATION_ENABLED = 'false';
    delete process.env.MODEL_API_KEY;
    delete process.env.MODEL_API_BASE_URL;
    delete process.env.MODEL_NAME;
  });

  it('rejects cross-origin requests', async () => {
    const response = await POST(
      request(JSON.stringify({}), {
        'sec-fetch-site': 'cross-site',
        origin: 'https://malicious.example',
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('Forbidden') });
  });

  it('rejects an oversized body before parsing', async () => {
    const response = await POST(
      request(
        JSON.stringify({
          schemaVersion: '1.0',
          consent: true,
          question: 'x'.repeat(9 * 1024),
        }),
        { 'sec-fetch-site': 'same-origin' },
      ),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('Payload Too Large'),
    });
  });

  it('rejects invalid JSON and invalid schemas with 400', async () => {
    const invalidJson = await POST(request('{', { 'sec-fetch-site': 'same-origin' }));
    expect(invalidJson.status).toBe(400);

    const invalidSchema = await POST(
      request(JSON.stringify({ schemaVersion: '1.0', consent: false, question: 'Hi' }), {
        'sec-fetch-site': 'same-origin',
      }),
    );
    expect(invalidSchema.status).toBe(400);
    await expect(invalidSchema.json()).resolves.toMatchObject({
      error: expect.stringContaining('schema validation failed'),
    });
  });

  it('returns a reviewed fallback when the provider is disabled', async () => {
    const response = await POST(
      request(
        JSON.stringify({
          schemaVersion: '1.0',
          consent: true,
          question: 'What formats are supported?',
          page: 'home',
        }),
        { 'sec-fetch-site': 'same-origin' },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');

    const data = await response.json();
    expect(data.mode).toBe('deterministic_fallback');
    expect(data.modelUsed).toBe('reviewed-help-content');
    expect(data.answer).toContain('JPEG');
    expect(Array.isArray(data.links)).toBe(true);
    expect(data.links.length).toBeGreaterThan(0);
  });
});
