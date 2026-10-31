import type { NextRequest } from 'next/server';

/**
 * Small, dependency-free request helpers shared by the two optional model
 * routes. This is an in-process abuse guard for a demo deployment, not a
 * durable multi-instance quota or a monetary spend cap.
 */

export interface RateLimiter {
  check(clientId: string): boolean;
  readonly windowSeconds: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  maxKeys?: number;
}): RateLimiter {
  const maxKeys = options.maxKeys ?? 1_000;
  const entries = new Map<string, { count: number; resetAt: number }>();

  return {
    windowSeconds: Math.ceil(options.windowMs / 1_000),

    check(clientId: string): boolean {
      const now = Date.now();

      // Bound the map so a long-running process cannot accumulate unbounded keys.
      if (entries.size > maxKeys) {
        for (const [key, entry] of entries) {
          if (now > entry.resetAt) {
            entries.delete(key);
          }
        }
      }

      const entry = entries.get(clientId);

      if (entry === undefined || now > entry.resetAt) {
        entries.set(clientId, { count: 1, resetAt: now + options.windowMs });
        return true;
      }

      if (entry.count >= options.maxRequests) {
        return false;
      }

      entry.count += 1;
      return true;
    },
  };
}

/**
 * Extracts a bounded client identifier from headers set by the hosting platform.
 * Falls back to a single local bucket; it does not trust arbitrary header text.
 */
export function getClientId(req: NextRequest): string {
  const candidate =
    req.headers.get('x-nf-client-connection-ip')?.trim() ||
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local-client';

  if (candidate.length <= 45 && /^[a-fA-F0-9:.]+$/.test(candidate)) {
    return candidate;
  }

  return 'local-client';
}
