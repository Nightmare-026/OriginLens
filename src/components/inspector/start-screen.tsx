'use client';

import { useEffect, useState } from 'react';
import type { DisplayError } from '@/lib/pipeline/types';
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION, MAX_IMAGE_PIXELS } from '@/lib/security/limits';
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CameraIcon,
  CpuIcon,
  SlidersIcon,
  UploadCloudIcon,
} from '@/components/ui/icons';

/**
 * Screen A - Start (PRD 5.1), plus the recoverable Screen B error state.
 *
 * The screen states what the tool checks, what it does not check, and what a
 * missing credential means, before any file is selected. The comparison form
 * collects two independent files and never asks which one is the original.
 */

export type StartScreenProps = Readonly<{
  onFile: (file: File) => void;
  onCompare: (first: File, second: File) => void;
  disabled?: boolean;
  notice?: string;
  error?: DisplayError | null;
  mode?: 'all' | 'single' | 'compare';
}>;

const MIB = MAX_FILE_BYTES / (1024 * 1024);
const MEGAPIXELS = MAX_IMAGE_PIXELS / 1_000_000;

export function StartScreen({
  onFile,
  onCompare,
  disabled = false,
  notice,
  error,
  mode = 'all',
}: StartScreenProps) {
  const [first, setFirst] = useState<File | null>(null);
  const [second, setSecond] = useState<File | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [isDragOverInspect, setIsDragOverInspect] = useState(false);
  const [isDragOverA, setIsDragOverA] = useState(false);
  const [isDragOverB, setIsDragOverB] = useState(false);

  // Global Clipboard Paste (Ctrl+V) handler
  useEffect(() => {
    if (disabled) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            if (mode === 'compare') {
              if (first === null) {
                setFirst(file);
                setComparisonError(null);
              } else if (second === null) {
                setSecond(file);
                setComparisonError(null);
              }
            } else {
              onFile(file);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, mode, onFile, first, second]);

  // Reset sequential focus caret when active element is explicitly blurred to document body
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget === null) {
        document.body.tabIndex = -1;
        document.body.focus();
      }
    };

    window.addEventListener('focusout', handleFocusOut);
    return () => window.removeEventListener('focusout', handleFocusOut);
  }, []);

  const handleLoadPreset = async (presetId: string) => {
    if (disabled || loadingSample !== null) return;
    setLoadingSample(presetId);
    setPresetError(null);

    try {
      if (presetId === 'c2pa-valid') {
        const res = await fetch('/samples/c2pa-valid.jpg');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        onFile(new File([blob], 'c2pa-valid.jpg', { type: 'image/jpeg' }));
      } else if (presetId === 'c2pa-tampered') {
        const res = await fetch('/samples/c2pa-tampered.jpg');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        onFile(new File([blob], 'c2pa-tampered.jpg', { type: 'image/jpeg' }));
      } else if (presetId === 'unsigned-photo') {
        const res = await fetch('/samples/unsigned-photo.jpg');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        onFile(new File([blob], 'unsigned-photo.jpg', { type: 'image/jpeg' }));
      } else if (presetId === 'ai-sample') {
        const res = await fetch('/samples/ai-generated-sd.png');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        onFile(new File([blob], 'ai-generated-sd.png', { type: 'image/png' }));
      } else if (presetId === 'compare-pair') {
        const [resA, resB] = await Promise.all([
          fetch('/samples/compare-original.jpg'),
          fetch('/samples/compare-edited.jpg'),
        ]);
        if (!resA.ok) throw new Error(`File A: HTTP ${resA.status}`);
        if (!resB.ok) throw new Error(`File B: HTTP ${resB.status}`);
        const [blobA, blobB] = await Promise.all([resA.blob(), resB.blob()]);
        onCompare(
          new File([blobA], 'compare-original.jpg', { type: 'image/jpeg' }),
          new File([blobB], 'compare-edited.jpg', { type: 'image/jpeg' }),
        );
      }
    } catch (err) {
      console.error('Failed to load sample preset:', err);
      setPresetError('Could not load sample asset. Please verify network access or select a local image.');
    } finally {
      setLoadingSample(null);
    }
  };

  const showInspect = mode === 'all' || mode === 'single';
  const showCompare = mode === 'all' || mode === 'compare';

  return (
    <div data-testid="start-screen">
      <header className="hero">
        <p className="eyebrow">
          {mode === 'single'
            ? 'Single Image Credential Inspector'
            : mode === 'compare'
              ? 'Independent Two-File Provenance Delta'
              : 'Evidence-first media provenance'}
        </p>
        <h1>
          Origin<span className="brand-lens-gradient">Lens</span>
          {mode === 'single' ? ' Inspector' : mode === 'compare' ? ' Compare' : ''}
        </h1>
        <p className="lede">
          {mode === 'compare'
            ? 'Compare two independent images side by side. It does not presume which file is original or edited.'
            : 'Inspect provenance evidence; not a universal AI detector. Every finding is tied to a check that actually ran.'}
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
          role="alert"
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

      {showInspect && (
        <section
          aria-labelledby="inspect-heading"
          className={`panel ${isDragOverInspect ? 'dropzone-active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverInspect(true);
          }}
          onDragLeave={() => setIsDragOverInspect(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverInspect(false);
            const file = e.dataTransfer?.files?.[0];
            if (file && !disabled) {
              onFile(file);
            }
          }}
        >
          <h2 id="inspect-heading">Inspect one image</h2>
          <p>
            The file stays in this browser. The app validates it before reading the whole file, then
            records a fingerprint, a bounded metadata allowlist, and the result of the pinned C2PA
            validator.
          </p>

          <div
            className={`prominent-dropzone-box ${isDragOverInspect ? 'dropzone-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setIsDragOverInspect(true);
            }}
            onDragLeave={() => setIsDragOverInspect(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverInspect(false);
              const file = e.dataTransfer?.files?.[0];
              if (file && !disabled) {
                onFile(file);
              }
            }}
          >
            <div className="dropzone-upload-icon-wrapper" aria-hidden="true">
              <UploadCloudIcon size={36} />
            </div>
            <p className="dropzone-main-text">
              <strong>Drag and drop image here</strong>, or paste from clipboard (<code>Ctrl+V</code>)
            </p>
            <p className="field dropzone-file-field">
              <label htmlFor="inspect-file">Image file (JPEG or PNG, or drag &amp; drop / paste)</label>
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
            <p className="dropzone-subtext">
              Supported formats: JPEG (<code>.jpg</code>, <code>.jpeg</code>) and PNG (<code>.png</code>) up to 20 MiB &bull; 20 MP max
            </p>
          </div>
        </section>
      )}

      {showCompare && (
        <section aria-labelledby="compare-heading" className="panel">
          <h2 id="compare-heading">Compare two images</h2>
          <p>
            A Provenance Delta checks each file independently, then places the recorded properties side
            by side. It does not presume which file is original, older, or edited.
          </p>

          <div className="compare-inputs-grid">
            <div
              className={`compare-file-card ${isDragOverA ? 'dropzone-active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverA(true);
              }}
              onDragLeave={() => setIsDragOverA(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverA(false);
                const file = e.dataTransfer?.files?.[0];
                if (file && !disabled) {
                  setFirst(file);
                  setComparisonError(null);
                }
              }}
            >
              <div className="compare-file-card-header">
                <div className="dropzone-upload-icon-wrapper-sm" aria-hidden="true">
                  <UploadCloudIcon size={20} className="compare-card-icon" />
                </div>
                <span className="compare-card-title">Candidate File A</span>
              </div>
              <p className="dropzone-compare-cue">
                <strong>Drag &amp; drop File A here</strong>, or browse
              </p>
              <p className="field">
                <label htmlFor="compare-file-a">File A (JPEG or PNG, or drag &amp; drop)</label>
                <input
                  id="compare-file-a"
                  data-testid="compare-file-a"
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={disabled}
                  onChange={(event) => {
                    setFirst(event.currentTarget.files?.[0] ?? null);
                    setComparisonError(null);
                  }}
                />
              </p>
              {first !== null && (
                <p className="compare-file-info">
                  Selected: <strong>{first.name}</strong> ({(first.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div
              className={`compare-file-card ${isDragOverB ? 'dropzone-active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverB(true);
              }}
              onDragLeave={() => setIsDragOverB(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverB(false);
                const file = e.dataTransfer?.files?.[0];
                if (file && !disabled) {
                  setSecond(file);
                  setComparisonError(null);
                }
              }}
            >
              <div className="compare-file-card-header">
                <div className="dropzone-upload-icon-wrapper-sm" aria-hidden="true">
                  <UploadCloudIcon size={20} className="compare-card-icon" />
                </div>
                <span className="compare-card-title">Candidate File B</span>
              </div>
              <p className="dropzone-compare-cue">
                <strong>Drag &amp; drop File B here</strong>, or browse
              </p>
              <p className="field">
                <label htmlFor="compare-file-b">File B (JPEG or PNG, or drag &amp; drop)</label>
                <input
                  id="compare-file-b"
                  data-testid="compare-file-b"
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={disabled}
                  onChange={(event) => {
                    setSecond(event.currentTarget.files?.[0] ?? null);
                    setComparisonError(null);
                  }}
                />
              </p>
              {second !== null && (
                <p className="compare-file-info">
                  Selected: <strong>{second.name}</strong> ({(second.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="compare-start"
            disabled={disabled || first === null || second === null}
            onClick={() => {
              if (first === null || second === null) {
                setComparisonError('Select both files before starting the comparison.');
                return;
              }

              setComparisonError(null);
              onCompare(first, second);
            }}
          >
            Compare these two files
          </button>
          {comparisonError === null ? null : (
            <p className="panel-error-inline" role="alert" data-testid="compare-form-error">
              {comparisonError}
            </p>
          )}
          <p className="note">
            Each file is analysed separately with the same checks as a single inspection. A failed
            check on one file does not erase the other file&apos;s results. Both files stay in this
            browser.
          </p>
        </section>
      )}

      {/* 1-Click Preset Demo Gallery (Accordion Disclosure for Clean Keyboard Navigation) */}
      <details open className="panel presets-panel" style={{ cursor: 'pointer' }}>
        <summary id="presets-heading" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-headline)' }}>
          1-Click Live Demo Gallery (Sample Credentials & Pairs)
        </summary>
        <p className="note" style={{ marginTop: '10px', marginBottom: '14px' }}>
          Load a committed sample to exercise a valid credential, a modified test copy, unverified
          camera metadata, or a preview difference without opening the file dialog. You can also
          paste an image with <code>Ctrl+V</code>.
        </p>
        <div className="preset-buttons-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {showInspect && (
            <>
              <button
                type="button"
                className="preset-btn"
                disabled={disabled || loadingSample !== null}
                onClick={() => void handleLoadPreset('c2pa-valid')}
                data-testid="preset-c2pa-valid"
              >
                <span className="preset-badge" style={{ color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheckIcon size={13} />
                  <span>C2PA</span>
                </span>
                <strong>Valid Credential</strong>
                <span className="note" style={{ fontSize: '0.75rem' }}>Adobe test fixture; signer trust not evaluated</span>
              </button>

              <button
                type="button"
                className="preset-btn"
                disabled={disabled || loadingSample !== null}
                onClick={() => void handleLoadPreset('c2pa-tampered')}
                data-testid="preset-c2pa-tampered"
              >
                <span className="preset-badge" style={{ color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangleIcon size={13} />
                  <span>Altered copy</span>
                </span>
                <strong>Content Binding Invalid</strong>
                <span className="note" style={{ fontSize: '0.75rem' }}>One bit flipped in scan data (test fixture)</span>
              </button>

              <button
                type="button"
                className="preset-btn"
                disabled={disabled || loadingSample !== null}
                onClick={() => void handleLoadPreset('unsigned-photo')}
                data-testid="preset-unsigned-photo"
              >
                <span className="preset-badge" style={{ color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CameraIcon size={13} />
                  <span>Camera</span>
                </span>
                <strong>No Embedded Credential</strong>
                <span className="note" style={{ fontSize: '0.75rem' }}>Camera EXIF metadata (unverified)</span>
              </button>

              <button
                type="button"
                className="preset-btn"
                disabled={disabled || loadingSample !== null}
                onClick={() => void handleLoadPreset('ai-sample')}
                data-testid="preset-ai-sample"
              >
                <span className="preset-badge" style={{ color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CpuIcon size={13} />
                  <span>AI</span>
                </span>
                <strong>AI Metadata Clues</strong>
                <span className="note" style={{ fontSize: '0.75rem' }}>Stable Diffusion prompts</span>
              </button>
            </>
          )}

          {showCompare && (
            <button
              type="button"
              className="preset-btn"
              disabled={disabled || loadingSample !== null}
              onClick={() => void handleLoadPreset('compare-pair')}
              data-testid="preset-compare-pair"
            >
              <span className="preset-badge" style={{ color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <SlidersIcon size={13} />
                <span>Delta</span>
              </span>
              <strong>Compare Pair</strong>
              <span className="note" style={{ fontSize: '0.75rem' }}>Visual difference slider</span>
            </button>
          )}
        </div>
        {loadingSample && (
          <p className="note" style={{ marginTop: '8px' }}>
            Loading preset sample asset...
          </p>
        )}
        {presetError && (
          <p className="panel-error-inline" role="alert" style={{ marginTop: '8px' }}>
            {presetError}
          </p>
        )}
      </details>

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
