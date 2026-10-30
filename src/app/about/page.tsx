import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — OriginLens',
  description:
    'OriginLens is an evidence-first media provenance explorer. Learn about our client-side C2PA WebAssembly architecture, Meta Muse Spark Open explainer on Baseten, and commitment to honest uncertainty.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About — OriginLens',
    description:
      'OriginLens is an evidence-first media provenance explorer. Learn about our client-side C2PA WebAssembly architecture, Meta Muse Spark Open explainer on Baseten, and commitment to honest uncertainty.',
    url: 'https://originlens.org/about',
  },
};

export default function AboutPage() {
  return (
    <main className="page page-doc">
      <header className="hero">
        <p className="eyebrow">Project Architecture & Methodology</p>
        <h1>About OriginLens</h1>
        <p className="lede">
          OriginLens is an <strong>Evidence-First Media Provenance Explorer</strong>. It replaces
          opaque AI probability scores and forensic guesswork with cryptographic provenance,
          verifiable evidence ledgers, and honest uncertainty.
        </p>
      </header>

      {/* Core Mission */}
      <section aria-labelledby="mission-heading" className="panel">
        <h2 id="mission-heading">Core Philosophy & Truthful Semantics</h2>
        <p>
          Traditional &ldquo;AI detectors&rdquo; rely on brittle probabilistic black boxes. When an
          image lacks metadata, they mislabel it as &ldquo;100% human-made&rdquo;; when a single
          pixel differs, they generate false accusations of fraud. OriginLens rejects this approach:
        </p>
        <div className="ledger-breakdown-grid">
          <div className="breakdown-item">
            <h3>1. Evidence Ledger</h3>
            <p>
              Every finding traces directly to a real check, structured evidence identifier (
              <code>ev_...</code>), and verifiable validation standard.
            </p>
          </div>
          <div className="breakdown-item">
            <h3>2. Provenance Delta</h3>
            <p>
              Compare two independent images side-by-side without presuming an &ldquo;original&rdquo;
              or inferring intent, chronology, or fraud from a byte or pixel difference alone.
            </p>
          </div>
          <div className="breakdown-item">
            <h3>3. Honest Uncertainty</h3>
            <p>
              Never convert absent credentials into claims of authenticity. Distinguish between
              cryptographic signature validity and signer trust. State what was checked, not
              checked, and what remains unknown.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section aria-labelledby="architecture-heading" className="panel">
        <h2 id="architecture-heading">Technical Architecture</h2>
        <p>
          OriginLens is built on a browser-first, zero-byte privacy architecture designed for speed,
          reproducibility, and verifiable auditability.
        </p>

        <div className="faq-list">
          <div className="faq-item">
            <h3>Local-First Client Processing</h3>
            <p>
              File intake, magic-byte preflight, exact-byte SHA-256 fingerprinting (via Web Crypto
              API), EXIF allowlist extraction, and C2PA credential reading run entirely inside your
              browser&rsquo;s volatile memory using a pinned WebAssembly SDK (
              <code>@contentauth/c2pa-web</code> 0.15.4). Your original image bytes are never
              uploaded or relayed to a server.
            </p>
          </div>

          <div className="faq-item">
            <h3>Meta Muse Spark Open Explainer (Baseten Partner)</h3>
            <p>
              When a user explicitly opts in, OriginLens sends a bounded, privacy-safe summary
              (check codes, evidence IDs, and SHA-256 fingerprint—never image bytes, previews, or
              GPS) to <strong>Meta Muse Spark Open</strong> (<code>meta-models/muse-spark-open-1026</code>)
              hosted via official hackathon partner <strong>Baseten</strong> (
              <code>https://inference.baseten.co/v1</code>).
            </p>
            <ul>
              <li>
                <strong>Reasoning Token Stripping:</strong> Automatically parses and removes native{' '}
                <code>&lt;thought&gt;</code> and <code>&lt;think&gt;</code> tokens so structured JSON
                is parsed cleanly against Zod schemas.
              </li>
              <li>
                <strong>Citation Verification:</strong> Verifies that every assertion cites a valid
                evidence ID (<code>ev_...</code>) present in the active report.
              </li>
              <li>
                <strong>Hedging-Aware Claims Filter (ADR-017):</strong> Enforces strict epistemic
                boundaries—bans unconditional 100% authenticity or fraud verdicts while permitting
                defensive educational negations (e.g. &ldquo;Absence of a manifest does not prove an
                image is fake&rdquo;).
              </li>
              <li>
                <strong>Deterministic Fallback:</strong> If disabled, offline, or unconfigured, the
                system returns a deterministic rule-based template without failing the user
                experience.
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h3>Anti-Doxxing Geolocation Guard</h3>
            <p>
              Camera GPS coordinates are masked by default to protect personal physical residence.
              On-demand coarse viewing (~10 km radius) and volatile in-memory unmasking operate purely
              on client-side ArrayBuffers with zero tracking and safe outbound map links.
            </p>
          </div>
        </div>
      </section>

      {/* Engineering Quality & Verification */}
      <section aria-labelledby="quality-heading" className="panel">
        <h2 id="quality-heading">Engineering Rigor & Quality Gates</h2>
        <p>
          OriginLens adheres to rigorous software engineering standards verified across multiple
          automated pipelines:
        </p>

        <div className="uncertainty-table-wrapper">
          <table className="uncertainty-table">
            <thead>
              <tr>
                <th scope="col">Quality Gate</th>
                <th scope="col">Standard / Framework</th>
                <th scope="col">Status</th>
                <th scope="col">Verification Command</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Unit & Integration Suite</strong></td>
                <td>Vitest (302 tests across 19 suites)</td>
                <td><span className="badge badge-ai">PASS (302/302)</span></td>
                <td><code>npm test</code></td>
              </tr>
              <tr>
                <td><strong>End-to-End Suite</strong></td>
                <td>Playwright (Chromium browser-level)</td>
                <td><span className="badge badge-ai">PASS (49/49)</span></td>
                <td><code>npx playwright test</code></td>
              </tr>
              <tr>
                <td><strong>Type Safety</strong></td>
                <td>TypeScript Strict Mode (<code>--noEmit</code>)</td>
                <td><span className="badge badge-ai">0 Errors</span></td>
                <td><code>npm run typecheck</code></td>
              </tr>
              <tr>
                <td><strong>Code Quality</strong></td>
                <td>ESLint with strict rules</td>
                <td><span className="badge badge-ai">0 Errors / 0 Warnings</span></td>
                <td><code>npm run lint</code></td>
              </tr>
              <tr>
                <td><strong>Accessibility</strong></td>
                <td>WCAG 2.1 AA (Deep Emerald #047857, 5.48:1 contrast, axe-core)</td>
                <td><span className="badge badge-ai">0 Violations</span></td>
                <td><code>npx playwright test tests/e2e/accessibility.spec.ts</code></td>
              </tr>
              <tr>
                <td><strong>Dependency Security</strong></td>
                <td>npm audit</td>
                <td><span className="badge badge-ai">0 Vulnerabilities</span></td>
                <td><code>npm audit</code></td>
              </tr>
              <tr>
                <td><strong>Production Build</strong></td>
                <td>Next.js 16 Turbopack (offline reproducible)</td>
                <td><span className="badge badge-ai">Compiled Cleanly</span></td>
                <td><code>npm run build</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="page-actions-center">
        <Link href="/inspect" className="btn-primary">
          Launch Media Explorer
        </Link>
        <Link href="/how-to-use" className="button-secondary">
          Read User Guide
        </Link>
      </div>
    </main>
  );
}
