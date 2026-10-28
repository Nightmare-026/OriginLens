import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLinkIcon } from '@/components/ui/icons';

export const metadata: Metadata = {
  title: 'Privacy Policy — OriginLens',
  description:
    'Our core architectural guarantee: 100% in-browser media analysis, zero image uploads, zero cookies, zero telemetry, and GPS masking by default.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — OriginLens',
    description:
      'Our core architectural guarantee: 100% in-browser media analysis, zero image uploads, zero cookies, zero telemetry, and GPS masking by default.',
    url: 'https://originlens.org/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page page-doc">
      <header className="hero">
        <p className="eyebrow">Zero-Knowledge Architecture</p>
        <h1>Privacy Policy</h1>
        <p className="lede">
          Our core architectural guarantee: your media never leaves your device. OriginLens runs
          entirely inside your browser using WebAssembly.
        </p>
      </header>

      {/* Quick Summary Cards */}
      <section aria-labelledby="privacy-matrix-heading" className="panel">
        <h2 id="privacy-matrix-heading">Privacy Invariants at a Glance</h2>
        <div className="privacy-matrix-grid">
          <div className="privacy-matrix-card">
            <h3>Zero Image Uploads</h3>
            <p>
              100% of hashing, EXIF parsing, and C2PA cryptographic signature verification occurs
              locally in your browser session. No media bytes are ever transmitted over the network.
            </p>
          </div>

          <div className="privacy-matrix-card">
            <h3>Volatile Session Memory</h3>
            <p>
              Images exist only in transient browser RAM during analysis. We use no cookies, no
              localStorage, and no IndexedDB. Clicking &ldquo;Clear session&rdquo; immediately wipes
              all buffers.
            </p>
          </div>

          <div className="privacy-matrix-card">
            <h3>GPS Masked by Default</h3>
            <p>
              Precise geolocation coordinates are never displayed by default and are strictly
              excluded from exported JSON audit reports (<code>includedPreciseGps: false</code>).
            </p>
          </div>

          <div className="privacy-matrix-card">
            <h3>Zero Telemetry or Ads</h3>
            <p>
              No Google Analytics, tracking pixels, user profiling, or third-party ad networks. We do
              not log your IP address, device fingerprints, or filenames.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Policy Sections */}
      <section aria-labelledby="in-browser-heading" className="doc-section">
        <h2 id="in-browser-heading">1. How In-Browser Processing Works</h2>
        <p>
          Traditional media verification websites require uploading your photos to remote cloud
          servers where files can be stored, analyzed, or shared. OriginLens uses a radically
          different model:
        </p>
        <ul>
          <li>
            <strong>WebAssembly C2PA Engine:</strong> We compile the open-source C2PA standard
            library (<code>@contentauth/c2pa-web</code>) to WebAssembly that runs directly in your
            browser tab.
          </li>
          <li>
            <strong>Local Web Worker:</strong> Processing happens inside an isolated local Web Worker
            thread, keeping your interface smooth without any remote network requests.
          </li>
          <li>
            <strong>Offline Capability:</strong> Once loaded, you can disconnect your internet
            connection entirely and OriginLens will continue to inspect files and compute
            Provenance Deltas.
          </li>
        </ul>
      </section>

      <section aria-labelledby="data-collection-heading" className="doc-section">
        <h2 id="data-collection-heading">2. What Data We Collect</h2>
        <p>
          <strong>We collect zero personal data and zero image data.</strong> Specifically:
        </p>
        <dl className="facts">
          <div>
            <dt>Image Files</dt>
            <dd>Never sent to any server</dd>
          </div>
          <div>
            <dt>Filenames & Hashes</dt>
            <dd>Kept strictly in local browser state</dd>
          </div>
          <div>
            <dt>User Accounts</dt>
            <dd>None required or supported</dd>
          </div>
          <div>
            <dt>Cookies & Tracking</dt>
            <dd>0 cookies, 0 persistent identifiers</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="gps-privacy-heading" className="doc-section">
        <h2 id="gps-privacy-heading">3. Geolocation & EXIF Metadata Protection</h2>
        <p>
          Digital photos often contain embedded EXIF metadata, including precise latitude and
          longitude coordinates where the picture was taken. OriginLens protects this sensitive
          information:
        </p>
        <ul>
          <li>
            <strong>Masked Display:</strong> If GPS metadata is detected, the UI reports only that
            GPS data is present, without disclosing the exact coordinates on screen by default.
          </li>
          <li>
            <strong>Redacted Export:</strong> When downloading a JSON verification report, the
            report builder sets <code>includedPreciseGps: false</code> and excludes location
            coordinates to prevent accidental doxxing or location leakage.
          </li>
        </ul>
      </section>

      <section aria-labelledby="ai-third-parties-heading" className="doc-section">
        <h2 id="ai-third-parties-heading">4. Cloud AI & Optional Meta Llama 3.2 Vision Co-Pilot</h2>
        <p>
          Many commercial platforms silently transmit full image files to remote proprietary cloud
          services for heuristic analysis. OriginLens maintains a strict browser-first boundary:
        </p>
        <ul>
          <li>
            <strong>100% Client-Side Ingestion by Default:</strong> Initial file intake, SHA-256 byte
            hashing, EXIF metadata extraction, and WebAssembly C2PA credential verification execute
            entirely within your local browser sandbox. No network requests are made during standard
            inspection.
          </li>
          <li>
            <strong>Deliberate Opt-In Activation:</strong> OriginLens provides an optional Meta Llama
            3.2 Vision explanation feature (<code>/api/explain</code>). This service is invoked only
            when you explicitly request an explanation and confirm the consent dialogue.
          </li>
          <li>
            <strong>Bounded Metadata Transmission:</strong> External model requests transmit only
            sanitized, structured evidence codes: the calculated SHA-256 digest, C2PA validation
            outcome codes, check warnings, target audience mode (<code>general</code>,{' '}
            <code>newsroom</code>, or <code>forensic</code>), and your optional inquiry query to the
            configured inference provider (NVIDIA API / Meta).
          </li>
          <li>
            <strong>Strict Data Exclusions:</strong> Media bytes, canvas bitmaps, preview pixels, GPS
            coordinates, and raw EXIF payloads are <em>never</em> transmitted to external model
            endpoints under any circumstance.
          </li>
          <li>
            <strong>Stateless Processing:</strong> Model explanation requests are ephemeral and
            stateless. OriginLens retains no copies of queries or generated prose.
          </li>
        </ul>
      </section>

      <section aria-labelledby="audit-reports-heading" className="doc-section">
        <h2 id="audit-reports-heading">5. Exported Reports Ownership</h2>
        <p>
          When you click &ldquo;Download report (JSON)&rdquo;, the generated file is constructed
          locally on your device and saved to your Downloads folder:
        </p>
        <ul>
          <li>The report contains evidence IDs, check outcomes, and timestamps.</li>
          <li>
            It explicitly excludes raw image bytes (<code>includedOriginalImage: false</code>) and
            precise GPS data.
          </li>
          <li>
            You retain 100% ownership and control over the exported file; no copy is retained by
            OriginLens.
          </li>
        </ul>
      </section>

      <section aria-labelledby="source-code-heading" className="doc-section">
        <h2 id="source-code-heading">6. Open-Source Transparency</h2>
        <p>
          Privacy claims should be verifiable, not taken on faith. OriginLens is completely open
          source. You can inspect every line of our client-side intake pipeline, cryptographic
          adapters, and security headers on GitHub:
        </p>
        <p>
          <a
            href="https://github.com/Nightmare-026/OriginLens"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Review the OriginLens source code on GitHub</span>
            <ExternalLinkIcon size={13} />
          </a>
        </p>
      </section>

      <div className="page-actions-center">
        <Link href="/inspect" className="btn-primary">
          Return to Media Explorer
        </Link>
      </div>
    </main>
  );
}
