import type { DisplayError } from '@/lib/pipeline/types';
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION, MAX_IMAGE_PIXELS } from '@/lib/security/limits';

/**
 * Screen A - Start (PRD 5.1), plus the recoverable Screen B error state.
 *
 * The screen states what the tool checks, what it does not check, and what a
 * missing credential means, before any file is selected. The comparison action
 * is visible but disabled: it is not implemented in this build, and an honest
 * disabled action is preferable to a partial comparison.
 */

export type StartScreenProps = Readonly<{
  onFile: (file: File) => void;
  disabled?: boolean;
  notice?: string;
  error?: DisplayError | null;
}>;

const MIB = MAX_FILE_BYTES / (1024 * 1024);
const MEGAPIXELS = MAX_IMAGE_PIXELS / 1_000_000;

export function StartScreen({ onFile, disabled = false, notice, error }: StartScreenProps) {
  return (
    <div data-testid="start-screen">
      <header className="hero">
        <p className="eyebrow">Evidence-first media provenance</p>
        <h1>OriginLens</h1>
        <p className="lede">
          Inspect provenance evidence; not a universal AI detector. Every finding is tied to a
          check that actually ran.
        </p>
      </header>

      {notice === undefined ? null : (
        <p className="notice" role="status" data-testid="session-notice">
          {notice}
        </p>
      )}

      {error === undefined || error === null ? null : (
        <section
          className="panel panel-error"
          aria-labelledby="error-heading"
          data-testid="error-panel"
        >
          <h2 id="error-heading">This file was not processed</h2>
          <p>{error.message}</p>
          <p className="note">
            Safe error code: <code data-testid="error-code">{error.code}</code>. Nothing was
            recorded for this file, and you can select another one.
          </p>
        </section>
      )}

      <section aria-labelledby="inspect-heading" className="panel">
        <h2 id="inspect-heading">Inspect one image</h2>
        <p>
          The file stays in this browser. The app validates it before reading the whole file, then
          records a fingerprint, a bounded metadata allowlist, and the result of the pinned C2PA
          validator.
        </p>
        <p className="field">
          <label htmlFor="inspect-file">Image file (JPEG or PNG)</label>
          <input
            id="inspect-file"
            data-testid="inspect-file"
            type="file"
            accept="image/jpeg,image/png"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];

              if (file !== undefined) {
                onFile(file);
              }

              // Allow the same file to be selected again after a clear.
              event.currentTarget.value = '';
            }}
          />
        </p>
      </section>

      <section aria-labelledby="compare-heading" className="panel">
        <h2 id="compare-heading">Compare two images</h2>
        <p>
          A Provenance Delta places two files side by side without presuming which one is original.
        </p>
        <button type="button" disabled data-testid="compare-disabled">
          Compare two images
        </button>
        <p className="note">
          Two-file comparison is not enabled in this build. The action stays disabled rather than
          showing an incomplete comparison.
        </p>
      </section>

      <section aria-labelledby="limits-heading">
        <h2 id="limits-heading">Supported files and limits</h2>
        <dl className="facts">
          <div>
            <dt>Formats</dt>
            <dd>JPEG and PNG only</dd>
          </div>
          <div>
            <dt>Maximum size</dt>
            <dd>{MIB} MiB per file</dd>
          </div>
          <div>
            <dt>Maximum dimensions</dt>
            <dd>{MEGAPIXELS} megapixels per image</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{MAX_FILES_PER_SESSION} files, held in memory only</dd>
          </div>
        </dl>
        <p className="note">
          WebP, SVG, HEIC/HEIF, AVIF, TIFF, RAW, PDF, archives, animated images, and remote URLs are
          rejected. A file whose name, browser-reported type, and actual content disagree is not
          processed.
        </p>
      </section>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <p>
          File analysis runs in this browser. This build does not upload image bytes, fetch remote
          images, require an account, or keep a media history. GPS coordinates are not extracted into
          results, and exported reports exclude image bytes and precise location data.
        </p>
        <p className="note">
          No network-based trust-anchor, timestamp, or revocation lookup runs, and no external model
          request is made from this build. Either would require a separate disclosure and explicit
          opt-in before it could be enabled.
        </p>
      </section>

      <section aria-labelledby="absence-heading" className="note-block">
        <h2 id="absence-heading">What absence of evidence means</h2>
        <p>
          “No supported embedded credentials found” means this check found no supported manifest
          embedded in the file. It is not proof that the image is human-made, unedited, or true.
          Conversely, a valid credential is not proof that the depicted event happened as described.
        </p>
      </section>
    </div>
  );
}
