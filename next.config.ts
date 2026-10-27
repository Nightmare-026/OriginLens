import type { NextConfig } from 'next';

/**
 * Security headers (PRD section 8, Phase 7).
 *
 * The policy below is the one a real production build is verified against: the
 * E2E suite compiles the pinned C2PA WebAssembly module inside a Blob worker
 * and reads the recorded credential fixture, so a directive that breaks the
 * runtime fails a test rather than shipping silently.
 *
 * `'wasm-unsafe-eval'` is required to compile WebAssembly. `'unsafe-eval'` is
 * deliberately NOT granted. `'unsafe-inline'` for scripts is the documented
 * cost of Next.js's inlined hydration bootstrap without a nonce; a nonce-based
 * policy is incompatible with fully static prerendering and is not claimed.
 *
 * Headers are production-only because the development server relies on
 * inline/eval-based hot reloading; relaxing the shipped policy to accommodate
 * dev tooling would mean the policy no longer describes the app.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // c2pa-web runs its WebAssembly in a worker created from a Blob URL.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  // The app contacts no other origin: every check is local, and a future
  // provider adapter must add its own explicitly reviewed origin.
  "connect-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }

    return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
