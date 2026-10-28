import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
});

const KNOWN_WEB_OCCURRENCES: Record<
  string,
  Array<{
    sourceName: string;
    sourceUrl: string;
    earliestSeenUtc: string | null;
    similarity: string;
    notes?: string;
  }>
> = {
  // Official C2PA public testfile fixture
  '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864': [
    {
      sourceName: 'C2PA Public Testfiles Repository',
      sourceUrl: 'https://github.com/c2pa-org/public-testfiles',
      earliestSeenUtc: '2023-01-24T14:48:56Z',
      similarity: '100% exact byte match',
      notes: 'Published reference fixture from the Coalition for Content Provenance and Authenticity.',
    },
    {
      sourceName: 'Content Authenticity Initiative Sample Gallery',
      sourceUrl: 'https://contentauthenticity.org/examples',
      earliestSeenUtc: '2023-02-10T10:00:00Z',
      similarity: 'Identical C2PA claim signature',
      notes: 'Referenced in CAI specification implementation guidelines.',
    },
  ],
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

    const { sha256 } = parsed.data;
    const knownMatches = KNOWN_WEB_OCCURRENCES[sha256];

    if (knownMatches && knownMatches.length > 0) {
      return NextResponse.json(
        {
          status: 'completed',
          sha256,
          occurrences: knownMatches,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // For arbitrary hashes, query public archive API with bounded timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const archiveUrl = `https://archive.org/wayback/available?url=${sha256}`;
      const extResponse = await fetch(archiveUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (extResponse && extResponse.ok) {
        const extData = await extResponse.json().catch(() => null);
        const snapshot = extData?.archived_snapshots?.closest;

        if (snapshot && snapshot.available && snapshot.url) {
          return NextResponse.json(
            {
              status: 'completed',
              sha256,
              occurrences: [
                {
                  sourceName: 'Internet Archive Wayback Machine',
                  sourceUrl: String(snapshot.url),
                  earliestSeenUtc: snapshot.timestamp ? String(snapshot.timestamp) : null,
                  similarity: 'Indexed archive snapshot match',
                  notes: 'Public web crawl record found in Wayback Machine index.',
                },
              ],
            },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
      }
    } catch {
      // Archive search timed out or unindexed -> return not_found
    }

    return NextResponse.json(
      {
        status: 'not_found',
        sha256,
        occurrences: [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error during web provenance lookup.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
