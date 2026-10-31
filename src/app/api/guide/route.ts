import { NextRequest, NextResponse } from 'next/server';
import { guideRequestSchema } from '@/lib/guide/schema';
import { answerGuideQuestion } from '@/lib/guide/service';
import { createRateLimiter, getClientId } from '@/lib/security/request';

// The provider can spend time reasoning before it emits the visible answer.
export const maxDuration = 60;

const MAX_BODY_BYTES = 8 * 1024;

// In-memory only. This is an abuse guard for the demo, not a durable quota or
// a provider spend cap. A public production deployment needs a shared store.
const rateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
});

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(req: NextRequest) {
  // 1. Same-origin validation
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const secFetchSite = req.headers.get('sec-fetch-site');

  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return NextResponse.json(
      { error: 'Forbidden: cross-origin requests are not allowed' },
      { status: 403, headers: NO_STORE },
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
        { status: 403, headers: NO_STORE },
      );
    }
  }

  // 2. Rate limiting
  if (!rateLimiter.check(getClientId(req))) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a few minutes before asking again.' },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          'Retry-After': String(rateLimiter.windowSeconds),
        },
      },
    );
  }

  // 3. Bounded body read
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: exceeds 8 KiB limit' },
      { status: 413, headers: NO_STORE },
    );
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, 'utf-8') > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: exceeds 8 KiB limit' },
      { status: 413, headers: NO_STORE },
    );
  }

  // 4. JSON and schema validation
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Bad Request: invalid JSON' },
      { status: 400, headers: NO_STORE },
    );
  }

  const parseResult = guideRequestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Bad Request: schema validation failed',
        details: parseResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  // 5. Answer (model or reviewed fallback)
  const answer = await answerGuideQuestion(parseResult.data);

  return NextResponse.json(answer, {
    status: 200,
    headers: {
      ...NO_STORE,
      'Cache-Control': 'no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
