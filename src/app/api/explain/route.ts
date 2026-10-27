import { NextRequest, NextResponse } from 'next/server';
import { explainRequestSchema } from '@/lib/model-explainer/schema';
import { explainReportEvidence } from '@/lib/model-explainer/service';

// Maximum body size: 64 KiB (PRD P1-001 §10)
const MAX_BODY_BYTES = 64 * 1024;

// Simple in-memory rate limiter: max 3 requests per minute per IP/client
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 3) {
    return false;
  }

  entry.count += 1;
  return true;
}

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
      { error: 'Rate limit exceeded (maximum 3 requests per minute)' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } },
    );
  }

  // 3. Body size enforcement
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
