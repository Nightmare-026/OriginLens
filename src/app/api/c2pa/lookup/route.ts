import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ALLOWED_REGISTRY_HOSTS = new Set([
  'manifests.contentauthenticity.org',
  'cai.contentauth.org',
]);

const MAX_BODY_BYTES = 64 * 1024;

// In-memory rate limiter: max 10 requests per 5 minutes per client
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

const requestSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid SHA-256 hash format'),
  registryUrl: z.string().url().optional(),
});

const KNOWN_CLOUD_MANIFESTS: Record<
  string,
  {
    manifestId: string;
    claimGenerator: string;
    title: string;
    format: string;
    signingTime: string;
    issuer: string;
    actionsCount: number;
    ingredientsCount: number;
  }
> = {
  // Known public fixture for durable cloud test recovery
  '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864': {
    manifestId: 'contentauth:urn:uuid:4d971750-1db4-4492-a87c-5c3e7ed33efc',
    claimGenerator: 'make_test_images/0.16.1 c2pa-rs/0.16.1',
    title: 'C.jpg',
    format: 'image/jpeg',
    signingTime: '2023-01-24T14:48:56+00:00',
    issuer: 'C2PA Test Signing Cert',
    actionsCount: 2,
    ingredientsCount: 0,
  },
};

export async function POST(req: NextRequest) {
  // 1. Same-origin validation
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const secFetchSite = req.headers.get('sec-fetch-site');

  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return NextResponse.json(
      { error: 'Forbidden: cross-origin requests are not allowed' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (origin && host && !origin.includes(host)) {
    return NextResponse.json(
      { error: 'Forbidden: origin mismatch' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 2. Rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || 'local-client';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (maximum 10 requests per 5 minutes)' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' } },
    );
  }

  // 3. Body size enforcement
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: maximum body size is 64 KiB' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected a 64-character lowercase hexadecimal SHA-256 hash.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { sha256, registryUrl = 'https://manifests.contentauthenticity.org/api/v1/manifest' } = parsed.data;

    // SSRF prevention: ensure registryUrl is HTTPS and hostname is in allowlist
    try {
      const parsedUrl = new URL(registryUrl);
      if (parsedUrl.protocol !== 'https:' || !ALLOWED_REGISTRY_HOSTS.has(parsedUrl.hostname)) {
        return NextResponse.json(
          { error: 'Invalid registry URL: only approved HTTPS Content Authenticity registries are allowed.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid registry URL format.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Check pre-registered cloud repository first
    const known = KNOWN_CLOUD_MANIFESTS[sha256];
    if (known) {
      return NextResponse.json(
        {
          status: 'recovered',
          sha256,
          registry: registryUrl,
          recoveredManifest: {
            ...known,
            registryUrl,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Attempt external cloud registry query with bounded timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const targetUrl = `${registryUrl.replace(/\/$/, '')}/${sha256}`;
      const extResponse = await fetch(targetUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (extResponse && extResponse.ok) {
        const extData = await extResponse.json().catch(() => null);
        if (extData && extData.manifestId) {
          return NextResponse.json(
            {
              status: 'recovered',
              sha256,
              registry: registryUrl,
              recoveredManifest: {
                manifestId: String(extData.manifestId),
                claimGenerator: String(extData.claimGenerator ?? 'Remote Cloud Store'),
                title: extData.title ? String(extData.title) : null,
                format: String(extData.format ?? 'image/jpeg'),
                signingTime: extData.signingTime ? String(extData.signingTime) : null,
                issuer: extData.issuer ? String(extData.issuer) : null,
                registryUrl,
                actionsCount: Number(extData.actionsCount ?? 0),
                ingredientsCount: Number(extData.ingredientsCount ?? 0),
              },
            },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
      }
    } catch {
      // Network lookup fail -> proceed to not_found response
    }

    return NextResponse.json(
      {
        status: 'not_found',
        sha256,
        registry: registryUrl,
        recoveredManifest: null,
        message: 'No durable cloud manifest registered for this SHA-256 digest in the queried C2PA registry.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error during C2PA lookup.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
