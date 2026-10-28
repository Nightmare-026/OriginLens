import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Use — OriginLens',
  description:
    'A concrete, step-by-step guide to inspecting image provenance, comparing two images, and reading media evidence with OriginLens.',
};

export default function HowToUsePage() {
  return (
    <main className="page page-doc">
      <header className="hero">
        <p className="eyebrow">User Guide & Walkthrough</p>
        <h1>How to Use OriginLens</h1>
        <p className="lede">
          OriginLens is an evidence-first media provenance explorer. Follow this complete,
          step-by-step process to inspect digital image credentials and compare independent files.
        </p>
      </header>

      {/* Step by Step Sequence */}
      <section aria-labelledby="steps-heading" className="how-to-steps">
        <h2 id="steps-heading" className="visually-hidden">
          Step-by-Step Instructions
        </h2>

        {/* Step 1 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              1
            </span>
            <div>
              <h3>Choose Your Analysis Mode</h3>
              <p className="step-subtitle">Select between single-file inspection or side-by-side comparison</p>
            </div>
          </div>
          <div className="step-content">
            <p>
              On the <Link href="/inspect">Media Explorer</Link> start screen, choose between two primary
              workflows depending on your inspection goal:
            </p>
            <div className="workflow-options-grid">
              <div className="workflow-option">
                <h4>Mode A: Inspect One Image</h4>
                <p>
                  Best for inspecting a single suspicious or published photo to check whether it
                  carries a signed C2PA manifest (Content Credentials), review its EXIF metadata
                  clues, and calculate its exact original SHA-256 hash.
                </p>
              </div>
              <div className="workflow-option">
                <h4>Mode B: Compare Two Images (Provenance Delta)</h4>
                <p>
                  Best when you have two versions of a photo (e.g. an original candidate and a
                  social media re-upload) and want to compare byte length, dimensions, hashes,
                  metadata, and pixel metrics side-by-side without guessing which one is older.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Step 2 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              2
            </span>
            <div>
              <h3>Select & Validate Supported Files</h3>
              <p className="step-subtitle">Intake guardrails ensure safe, fast local evaluation</p>
            </div>
          </div>
          <div className="step-content">
            <p>
              Select an image from your device using the file picker. OriginLens enforces strict
              security guardrails before any file is decoded:
            </p>
            <ul className="step-checklist">
              <li>
                <strong>Supported Formats:</strong> JPEG (<code>.jpg</code>, <code>.jpeg</code>) and
                PNG (<code>.png</code>).
              </li>
              <li>
                <strong>File Size Cap:</strong> Up to <strong>20 MiB</strong> per file.
              </li>
              <li>
                <strong>Decoded Dimensions:</strong> Up to <strong>20 Megapixels</strong> (to prevent
                decompression memory exhaustion).
              </li>
              <li>
                <strong>Magic Byte Validation:</strong> OriginLens checks the actual file signature
                header, not just the file extension.
              </li>
            </ul>
            <div className="tip-box">
              <strong>Tip:</strong> If a file is corrupted or truncated, OriginLens catches the error
              gracefully with a safe code like <code>PIPELINE_DECODE_FAILED</code> without crashing
              your browser session.
            </div>
          </div>
        </article>

        {/* Step 3 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              3
            </span>
            <div>
              <h3>Read the Evidence Ledger</h3>
              <p className="step-subtitle">Every claim links to a specific check and evidence item</p>
            </div>
          </div>
          <div className="step-content">
            <p>
              Once processed, the <strong>Evidence Ledger</strong> presents your findings in
              structured sections:
            </p>
            <div className="ledger-breakdown-grid">
              <div className="breakdown-item">
                <h4>1. File Identity</h4>
                <p>
                  Shows verified byte size, MIME type, dimensions, and the cryptographic{' '}
                  <strong>SHA-256 fingerprint</strong> calculated over the uncompressed original
                  byte stream.
                </p>
              </div>
              <div className="breakdown-item">
                <h4>2. Embedded Manifest (C2PA)</h4>
                <p>
                  Reports whether a C2PA Content Credentials container was found (
                  <code>Present</code> or <code>Not present</code>).
                </p>
              </div>
              <div className="breakdown-item">
                <h4>3. Signature & Binding</h4>
                <p>
                  Verifies whether the digital signature is valid and whether the asset binding
                  hash matches the image pixel data (detecting post-signing tampering).
                </p>
              </div>
              <div className="breakdown-item">
                <h4>4. Signer Trust</h4>
                <p>
                  Distinguishes between cryptographic validity and organizational trust. If no
                  custom trust anchor is configured, it reports <code>Not evaluated</code> rather than
                  falsely certifying trustworthiness.
                </p>
              </div>
              <div className="breakdown-item">
                <h4>5. EXIF Metadata Clues</h4>
                <p>
                  Displays camera model, lens info, and timestamps as <em>unverified clues</em>,
                  reminding you that standard EXIF metadata can be edited or stripped.
                </p>
              </div>
              <div className="breakdown-item">
                <h4>6. Location Privacy</h4>
                <p>
                  GPS coordinates are masked by default to protect your privacy and safety.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Step 4 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              4
            </span>
            <div>
              <h3>Compare Two Images (Provenance Delta)</h3>
              <p className="step-subtitle">Objective side-by-side analysis without assuming an original</p>
            </div>
          </div>
          <div className="step-content">
            <p>When running a comparison between File A and File B:</p>
            <ol className="step-ordered-list">
              <li>
                <strong>Independent Evaluation:</strong> Both files receive their own isolated
                session IDs and are analyzed independently. A failure on one file never invalidates
                the other.
              </li>
              <li>
                <strong>Property Delta Matrix:</strong> Compares byte sizes, formats, dimensions, and
                hashes, marking each as <code>Equal</code> or <code>Different</code>.
              </li>
              <li>
                <strong>Normalized Preview Metric:</strong> If both images share the same aspect
                ratio and orientation, OriginLens calculates the peak channel difference (0 to 255)
                and the percentage of differing pixels across a normalized preview grid.
              </li>
              <li>
                <strong>User Assertions:</strong> You can optionally label candidates as{' '}
                <code>original</code> or <code>edited</code>. The UI explicitly marks these as{' '}
                <em>user-supplied assertions</em>, refusing to endorse them as objective system truth.
              </li>
            </ol>
          </div>
        </article>

        {/* Step 5 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              5
            </span>
            <div>
              <h3>Download & Share Audit Reports</h3>
              <p className="step-subtitle">Export a tamper-evident JSON audit record conforming to PRD v2.0</p>
            </div>
          </div>
          <div className="step-content">
            <p>
              Click <strong>Download report (JSON)</strong> to save an auditable machine-readable
              record.
            </p>
            <ul>
              <li>
                <strong>Report Schema:</strong> Version 2.0 JSON including UTC ISO timestamps,
                versioned check definitions, and evidence items.
              </li>
              <li>
                <strong>Privacy Guaranteed:</strong> By default, reports exclude raw image bytes (
                <code>includedOriginalImage: false</code>) and precise GPS coordinates (
                <code>includedPreciseGps: false</code>).
              </li>
              <li>
                <strong>Shareable Evidence:</strong> Ideal for journalists, researchers, and
                compliance officers who need verifiable provenance records without transmitting
                heavy media files.
              </li>
            </ul>
          </div>
        </article>

        {/* Step 6 */}
        <article className="step-card">
          <div className="step-header">
            <span className="step-number" aria-hidden="true">
              6
            </span>
            <div>
              <h3>Clear Session & Release Memory</h3>
              <p className="step-subtitle">One-click cleanup of all in-memory buffers</p>
            </div>
          </div>
          <div className="step-content">
            <p>
              When you are finished with your inspection, click <strong>Clear session</strong> or{' '}
              <strong>Inspect another image</strong>:
            </p>
            <ul>
              <li>Releases the underlying WebAssembly C2PA reader instance.</li>
              <li>Revokes temporary object preview URLs.</li>
              <li>Clears all volatile image buffers from browser RAM.</li>
            </ul>
          </div>
        </article>
      </section>

      {/* Honest Uncertainty Cheat Sheet */}
      <section aria-labelledby="cheat-sheet-heading" className="panel">
        <h2 id="cheat-sheet-heading">Honest Uncertainty: What Statuses Really Mean</h2>
        <p className="note">
          OriginLens adheres to honest reporting. Use this guide to understand what findings mean—and
          what they do not mean.
        </p>

        <div className="uncertainty-table-wrapper">
          <table className="uncertainty-table">
            <thead>
              <tr>
                <th scope="col">Interface Finding</th>
                <th scope="col">What It Means</th>
                <th scope="col">What It Does NOT Mean</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Verified provenance evidence found</strong>
                </td>
                <td>
                  An authentic C2PA manifest container is embedded, with a valid signature and
                  unaltered content binding.
                </td>
                <td>
                  Does NOT prove the depicted scene is real, or that the person holding the camera was
                  telling the truth.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>No supported embedded credentials found</strong>
                </td>
                <td>
                  No supported C2PA manifest was found embedded in this specific file.
                </td>
                <td>
                  Does NOT mean the photo is AI-generated, fake, or manipulated. Most images online
                  simply lack C2PA metadata.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>One or more validation issues require attention</strong>
                </td>
                <td>
                  A manifest exists, but the image pixels differ from the hash recorded at signing
                  time (e.g. <code>assertion.dataHash.mismatch</code>).
                </td>
                <td>
                  Does NOT identify who made the change or whether it was malicious vs. an innocent
                  compression step.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Signer trust: Not evaluated</strong>
                </td>
                <td>
                  The signature is mathematically valid, but no custom corporate or government trust
                  anchor was configured.
                </td>
                <td>
                  Does NOT mean the signer is fraudulent; it honestly states that trust policy was
                  not evaluated.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="faq-heading" className="panel">
        <h2 id="faq-heading">Frequently Asked Questions</h2>

        <div className="faq-list">
          <div className="faq-item">
            <h3>Is OriginLens an AI detector?</h3>
            <p>
              No. OriginLens is an <strong>evidence-first media provenance explorer</strong>. It
              inspects cryptographic C2PA Content Credentials and file metadata. It does not guess
              authenticity or generate speculative AI probability scores.
            </p>
          </div>

          <div className="faq-item">
            <h3>Are my photos uploaded to a cloud server?</h3>
            <p>
              No. All operations (hashing, EXIF parsing, C2PA validation, and visual difference
              calculations) run 100% inside your browser using WebAssembly. Your photos never leave
              your device.
            </p>
          </div>

          <div className="faq-item">
            <h3>Why are SVG and WebP images rejected?</h3>
            <p>
              In accordance with PRD v2.0 security specifications, OriginLens accepts JPEG and PNG to
              prevent SVG script injection (XSS) and maintain strict cryptographic C2PA compatibility.
            </p>
          </div>

          <div className="faq-item">
            <h3>Where can I get sample test images with C2PA credentials?</h3>
            <p>
              You can test OriginLens using official sample fixtures from the Content Authenticity
              Initiative (CAI), Adobe, or Sony, or by creating credentials with Content Credentials
              tools like Photoshop, Leica, or Truepic.
            </p>
          </div>
        </div>
      </section>

      <div className="page-actions-center">
        <Link href="/inspect" className="btn-primary">
          Launch Media Explorer
        </Link>
      </div>
    </main>
  );
}
