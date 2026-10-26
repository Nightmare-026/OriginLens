export default function HomePage() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Evidence-first media provenance</p>
        <h1>OriginLens</h1>
        <p className="lede">
          Inspect the provenance evidence a supported image actually carries, and compare two
          files without turning missing or inconclusive evidence into a verdict.
        </p>
      </header>

      <section aria-labelledby="scope-heading">
        <h2 id="scope-heading">What this tool does</h2>
        <ul>
          <li>Reports whether supported embedded C2PA credentials are present, and what the configured validator establishes about them.</li>
          <li>Shows a bounded allowlist of embedded metadata as unverified clues, not as proof of origin.</li>
          <li>Fingerprints the exact uploaded bytes with SHA-256 and records which checks actually ran.</li>
          <li>Compares two images by fingerprint, file properties, selected metadata, and available provenance findings.</li>
          <li>Exports a versioned JSON report that keeps missing, failed, skipped, and inconclusive evidence visible.</li>
        </ul>
      </section>

      <section aria-labelledby="limits-heading">
        <h2 id="limits-heading">What this tool does not do</h2>
        <ul>
          <li>It is not an AI-image detector, a real-or-fake classifier, or a forensic certification service.</li>
          <li>Missing credentials, manifest presence, a hash, or a pixel difference do not establish whether an image is human-made, fake, tampered with, or true.</li>
          <li>It does not identify who created, owns, or is depicted in an image, or when an event occurred.</li>
          <li>It does not treat metadata as cryptographic provenance. Metadata can be absent, copied, changed, or misleading.</li>
        </ul>
      </section>

      <section aria-labelledby="files-heading">
        <h2 id="files-heading">Supported files and limits</h2>
        <dl className="facts">
          <div>
            <dt>Formats</dt>
            <dd>JPEG and PNG only</dd>
          </div>
          <div>
            <dt>Maximum size</dt>
            <dd>20 MiB per file</dd>
          </div>
          <div>
            <dt>Maximum dimensions</dt>
            <dd>20 megapixels per image</dd>
          </div>
          <div>
            <dt>Comparison</dt>
            <dd>Two user-selected files per session</dd>
          </div>
        </dl>
        <p className="note">
          WebP, SVG, HEIC/HEIF, AVIF, TIFF, RAW, PDF, archives, animated images, and remote URLs
          are not supported.
        </p>
      </section>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <p>
          Image processing is designed to stay in this browser. The P0 build does not upload image
          bytes, store a media history, or require an account. GPS coordinates are not extracted
          into results, and exported reports exclude image bytes and precise location data.
        </p>
      </section>

      <section aria-labelledby="status-heading" className="status">
        <h2 id="status-heading">Build status</h2>
        <p>
          This build contains the project shell plus the tested intake, fingerprint, metadata, and
          report-contract modules. The file-analysis workflow is not enabled on this page yet, so
          no image can be selected and no result is produced here.
        </p>
      </section>
    </main>
  );
}
