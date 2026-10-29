import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLinkIcon } from '@/components/ui/icons';

export const metadata: Metadata = {
  title: 'Privacy Policy — OriginLens',
  description:
    'Local file inspection: image bytes stay in the browser, no cookies or telemetry, and GPS is hidden by default. The optional model explanation sends bounded check data only after opt-in.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — OriginLens',
    description:
      'Local file inspection: image bytes stay in the browser, no cookies or telemetry, and GPS is hidden by default. The optional model explanation sends bounded check data only after opt-in.',
    url: 'https://originlens.org/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page page-doc">
      <header className="hero">
        <p className="eyebrow">Local-First Architecture</p>
        <h1>Privacy Policy</h1>
        <p className="lede">
          Image bytes stay in your browser during inspection. OriginLens reads embedded C2PA
          credentials with a bundled WebAssembly module, and only the optional model explanation
          sends bounded check data off-device after you opt in.
        </p>
      </header>

      {/* Quick Summary Cards */}
      <section aria-labelledby="privacy-matrix-heading" className="panel">
        <h2 id="privacy-matrix-heading">Privacy Invariants at a Glance</h2>
        <div className="privacy-matrix-grid">
          <div className="privacy-matrix-card">
            <h3>No Image Uploads</h3>
            <p>
              Hashing, metadata parsing, and C2PA reading happen locally in your browser session.
              Image bytes are not transmitted during inspection.
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
              This build includes no analytics, tracking pixels, or ad networks, and sets no cookies
              or persistent identifiers. The hosting infrastructure may process standard request
              metadata such as an IP address to deliver responses and enforce rate limits; the app
              itself does not record it.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Policy Sections */}
      <section aria-labelledby="in-browser-heading" className="doc-section">
        <h2 id="in-browser-heading">1. How In-Browser Processing Works</h2>
        <p>
          Traditional media verification websites require uploading your photos to remote cloud
          servers where files can be stored, analysed, or shared. OriginLens takes a different
          approach:
        </p>
        <ul>
          <li>
            <strong>WebAssembly C2PA Engine:</strong> OriginLens loads a browser build of the
            open-source C2PA library (<code>@contentauth/c2pa-web</code>) as a locally served
            WebAssembly module.
          </li>
          <li>
            <strong>No remote inspection calls:</strong> The C2PA runtime is served from this origin,
            not a third-party CDN. Inspection does not call a remote verification service.
          </li>
          <li>
            <strong>Network use is limited and optional:</strong> The only outbound feature is the
            optional model explanation described in section 4. Inspection itself does not require it.
          </li>
        </ul>
      </section>

      <section aria-labelledby="data-collection-heading" className="doc-section">
        <h2 id="data-collection-heading">2. What Data We Collect</h2>
        <p>
          <strong>OriginLens does not ask for personal data and does not store image data.</strong>{' '}
          Specifically:
        </p>
        <dl className="facts">
          <div>
            <dt>Image Files</dt>
            <dd>Processed in browser memory; not uploaded by the app</dd>
          </div>
          <div>
            <dt>Filenames & Hashes</dt>
            <dd>Held in local browser state; filenames are never sent to a model endpoint</dd>
          </div>
          <div>
            <dt>User Accounts</dt>
            <dd>None required or supported</dd>
          </div>
          <div>
            <dt>Cookies & Tracking</dt>
            <dd>None set by this app</dd>
          </div>
          <div>
            <dt>Model Explanation</dt>
            <dd>Optional; sends bounded check data to the configured endpoint after opt-in</dd>
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
            <strong>Redacted Export:</strong> When downloading a JSON inspection report, the
            report builder sets <code>includedPreciseGps: false</code> and excludes location
            coordinates to prevent accidental doxxing or location leakage.
          </li>
        </ul>
      </section>

      <section aria-labelledby="ai-third-parties-heading" className="doc-section">
        <h2 id="ai-third-parties-heading">4. Optional Model Explanation</h2>
        <p>
          File inspection stays in the browser. A separate, optional feature can ask a language
          model to explain the recorded check states. It is never part of the verification result:
        </p>
        <ul>
          <li>
            <strong>Local Inspection by Default:</strong> Intake, SHA-256 hashing (Web Crypto),
            metadata parsing, and WebAssembly C2PA reading run in your browser. No network request is
            made during standard inspection.
          </li>
          <li>
            <strong>Deliberate Opt-In:</strong> The explanation is requested only after you open the
            dialog and confirm it. No request is sent on page load or during analysis.
          </li>
          <li>
            <strong>Bounded Request:</strong> Check identifiers, execution states, outcomes, bounded
            warnings and limitation codes, evidence identifiers and keys (no values), summary codes,
            the SHA-256 fingerprint, byte size and dimensions, audience mode, and any question you
            typed. Filenames are excluded.
          </li>
          <li>
            <strong>Strict Data Exclusions:</strong> Image bytes, canvas bitmaps, preview pixels, GPS
            coordinates, raw EXIF values, and manifest text are not transmitted to the model
            endpoint.
          </li>
          <li>
            <strong>Provider Depends on Deployment:</strong> If a model is enabled, the server sends
            the bounded request to the inference provider configured by the operator. The provider,
            model, and retention terms depend on that configuration. If no model is configured, a
            deterministic template is generated and no external request is made.
          </li>
          <li>
            <strong>Non-Authoritative:</strong> The explanation cannot add findings or change any
            validation, binding, or trust state shown in the Evidence Ledger.
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
            You control the exported file; OriginLens retains no copy of it.
          </li>
        </ul>
      </section>

      <section aria-labelledby="source-code-heading" className="doc-section">
        <h2 id="source-code-heading">6. Verifying These Claims</h2>
        <p>
          Privacy claims should be verifiable, not taken on faith. The implementation is in the
          project repository: review the client-side intake pipeline, the C2PA adapter, and the{' '}
          <code>/api/explain</code> route to see exactly what is sent.
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
