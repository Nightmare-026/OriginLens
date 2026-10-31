import { NextRequest, NextResponse } from 'next/server';
import { explainRequestSchema } from '@/lib/model-explainer/schema';
import { explainReportEvidence } from '@/lib/model-explainer/service';
import { createRateLimiter, getClientId } from '@/lib/security/request';

// Muse Spark Open reasons before answering; allow headroom over the client timeout.
export const maxDuration = 60;

// Maximum body size: 64 KiB (PRD P1-001 §10)
const MAX_BODY_BYTES = 64 * 1024;

// In-memory rate limiter: max 10 requests per 5 minutes per IP/client.
// This is an abuse guard, not a durable multi-instance quota or spend cap.
const rateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
});

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

  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }

    if (host === null || originHost === null || originHost !== host) {
      return NextResponse.json(
        { error: 'Forbidden: origin mismatch' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  // 2. Rate limiting
  if (!rateLimiter.check(getClientId(req))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (maximum 10 requests per 5 minutes)' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimiter.windowSeconds),
        },
      },
    );
  }

  // 3. Body size enforcement. Reject declared oversized bodies before reading;
  // the post-read check still covers chunked requests without Content-Length.
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: exceeds 64 KiB limit' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, 'utf-8') > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: exceeds 64 KiB limit' },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 4. Request JSON & Zod validation
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Bad Request: invalid JSON' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const parseResult = explainRequestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Bad Request: schema validation failed',
        details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 5. Execution via service
  const explanation = await explainReportEvidence(parseResult.data);

  return NextResponse.json(explanation, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
