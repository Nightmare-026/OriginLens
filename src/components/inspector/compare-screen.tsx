import type { CommonOutcome, Comparison, CheckResult, EvidenceItem } from '@/lib/results/schemas';
import { useState, useRef, useEffect, type Ref } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import { PREVIEW_NORMALIZATION_NOTE } from '@/lib/compare/preview';
import { CheckRow, FileEvidenceSections, ReportActions } from './ledger';
import { CompareDeltaSynthesizer } from './compare-delta-synthesizer';
import {
  SplitIcon,
  FileTextIcon,
  ShieldCheckIcon,
  CameraIcon,
  LayersIcon,
  LayoutGridIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@/components/ui/icons';
import {
  CHECK_LABELS,
  COMPARISON_DIFFERENCE_LABELS,
  COMPARISON_OUTCOME_DESCRIPTIONS,
  COMPARISON_OUTCOME_HEADLINES,
  EXECUTION_STATE_LABELS,
  METADATA_FIELD_LABELS,
  PREVIEW_SKIP_REASON_EXPLANATIONS,
  PREVIEW_SKIP_REASON_LABELS,
  formatByteSize,
  formatDimensions,
} from './labels';

/**
 * Screen E - Provenance Delta (PRD 5.5, Stage 6).
 *
 * Two independently analyzed files are shown side by side. The delta records
 * only what the checks established; it never names an original, never orders
 * the files in time, and never turns a difference into a claim about intent,
 * tampering, or authenticity.
 */

export type CompareScreenProps = Readonly<{
  first: FileAnalysis;
  second: FileAnalysis;
  comparison: Comparison;
  check: CheckResult;
  previewUrlA?: string | null;
  previewUrlB?: string | null;
  downloadError: string | null;
  onDownload: () => void;
  onClear: () => void;
  onInspectAnother: () => void;
  onLabelFirst: (label: 'original' | 'edited' | null) => void;
  onLabelSecond: (label: 'original' | 'edited' | null) => void;
  /** Receives the result heading so focus can move to the new content. */
  headingRef?: Ref<HTMLHeadingElement>;
}>;

type ComparisonOutcome = 'equal' | 'different' | 'inconclusive';

function isComparisonOutcome(value: CommonOutcome | undefined): value is ComparisonOutcome {
  return value === 'equal' || value === 'different' || value === 'inconclusive';
}

function readBoolean(evidence: readonly EvidenceItem[], key: string): boolean | null {
  const item = evidence.find((candidate) => candidate.key === key);

  return typeof item?.value === 'boolean' ? item.value : null;
}

function equalityLabel(value: boolean | null): string {
  if (value === null) {
    return 'Not recorded';
  }

  return value ? 'Equal' : 'Different';
}

const LABEL_OPTIONS: readonly { value: 'original' | 'edited' | ''; label: string; badge?: string }[] = [
  { value: '', label: 'No label' },
  { value: 'original', label: 'I am supplying this as the original', badge: 'Original' },
  { value: 'edited', label: 'I am supplying this as an edited version', badge: 'Edited' },
];

function LabelSelect({
  side,
  analysis,
  onChange,
}: Readonly<{
  side: 'a' | 'b';
  analysis: FileAnalysis;
  onChange: (label: 'original' | 'edited' | null) => void;
}>) {
  const id = `label-select-${side}`;
  const value = analysis.file.userLabel ?? '';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const selectedOption = LABEL_OPTIONS.find((opt) => opt.value === value) ?? LABEL_OPTIONS[0]!;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const handleSelect = (val: 'original' | 'edited' | '') => {
    onChange(val === 'original' || val === 'edited' ? val : null);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(LABEL_OPTIONS.findIndex((opt) => opt.value === value));
      } else {
        setFocusedIndex((prev) => (prev + 1) % LABEL_OPTIONS.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(LABEL_OPTIONS.findIndex((opt) => opt.value === value));
      } else {
        setFocusedIndex((prev) => (prev <= 0 ? LABEL_OPTIONS.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isOpen && focusedIndex >= 0 && focusedIndex < LABEL_OPTIONS.length) {
        e.preventDefault();
        handleSelect(LABEL_OPTIONS[focusedIndex]!.value);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label
        id={`${id}-label`}
        htmlFor={`${id}-trigger`}
        style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-headline)' }}
      >
        Your label for File {side.toUpperCase()} (optional, user-supplied)
      </label>

      {/* Synchronized native select for automated tests & assistive fallback */}
      <select
        id={id}
        data-testid={id}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value;
          onChange(next === 'original' || next === 'edited' ? next : null);
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <option value="">No label</option>
        <option value="original">I am supplying this as the original</option>
        <option value="edited">I am supplying this as an edited version</option>
      </select>

      {/* Neumorphic Custom Dropdown */}
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', marginTop: '0.375rem' }}
        onKeyDown={handleKeyDown}
      >
        <button
          ref={triggerRef}
          id={`${id}-trigger`}
          data-testid={`${id}-trigger`}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-menu`}
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label`}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setFocusedIndex(LABEL_OPTIONS.findIndex((opt) => opt.value === value));
          }}
          className="neumorphic-select-trigger"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 0.875rem',
            background: 'var(--surface-inset)',
            boxShadow: isOpen ? 'var(--neu-inset-focus)' : 'var(--neu-inset)',
            border: isOpen ? '1px solid var(--focus, #10b981)' : '1px solid rgba(200, 212, 228, 0.6)',
            borderRadius: 'var(--rounded-default, 8px)',
            color: 'var(--text-headline)',
            font: 'inherit',
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedOption.badge && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.125rem 0.45rem',
                  borderRadius: '9999px',
                  background: selectedOption.value === 'original' ? '#ecfdf5' : '#f0f9ff',
                  color: selectedOption.value === 'original' ? '#047857' : '#0284c7',
                  border: selectedOption.value === 'original' ? '1px solid #a7f3d0' : '1px solid #bae6fd',
                }}
              >
                {selectedOption.badge}
              </span>
            )}
            <span style={{ color: selectedOption.value ? 'var(--text-headline)' : 'var(--muted)' }}>
              {selectedOption.label}
            </span>
          </span>
          <ChevronDownIcon
            size={16}
            style={{
              color: 'var(--muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              flexShrink: 0,
              marginLeft: '0.5rem',
            }}
          />
        </button>

        {isOpen && (
          <ul
            id={`${id}-menu`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="neumorphic-select-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--surface-canvas, #edf1f7)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: 'var(--rounded-md, 12px)',
              boxShadow:
                '10px 10px 24px rgba(166, 180, 200, 0.48), -8px -8px 20px #ffffff, 0 4px 14px rgba(0, 0, 0, 0.06)',
              padding: '0.375rem',
              margin: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {LABEL_OPTIONS.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === focusedIndex;

              return (
                <li key={opt.value} role="none" style={{ margin: 0, padding: 0 }}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`${id}-option-${opt.value || 'none'}`}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--rounded-default, 8px)',
                      border: isSelected
                        ? '1px solid #a7f3d0'
                        : isFocused
                          ? '1px solid rgba(16, 185, 129, 0.25)'
                          : '1px solid transparent',
                      background: isSelected
                        ? '#ecfdf5'
                        : isFocused
                          ? 'rgba(16, 185, 129, 0.08)'
                          : 'transparent',
                      color: isSelected ? '#065f46' : isFocused ? '#047857' : 'var(--text)',
                      fontWeight: isSelected ? 600 : 400,
                      boxShadow: isSelected || isFocused ? 'var(--neu-flat-sm)' : 'none',
                      font: 'inherit',
                      fontSize: '0.84375rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '9999px',
                            background: opt.value === 'original' ? '#d1fae5' : '#e0f2fe',
                            color: opt.value === 'original' ? '#047857' : '#0284c7',
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && (
                      <CheckIcon size={14} style={{ color: '#059669', flexShrink: 0, marginLeft: '0.5rem' }} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <span className="note" style={{ display: 'block', marginTop: '0.375rem' }}>
        This label is your own assertion, recorded verbatim. The app does not measure, verify, or
        infer which file came first.
      </span>
    </div>
  );
}

function PropertyRow({
  property,
  firstValue,
  secondValue,
  status,
}: Readonly<{
  property: string;
  firstValue: string;
  secondValue: string;
  status: string;
}>) {
  return (
    <tr>
      <th scope="row">{property}</th>
      <td data-column="File A">{firstValue}</td>
      <td data-column="File B">{secondValue}</td>
      <td data-column="Comparison">{status}</td>
    </tr>
  );
}

function VisualDiffSlider({
  previewUrlA,
  previewUrlB,
  nameA,
  nameB,
}: {
  previewUrlA: string;
  previewUrlB: string;
  nameA: string;
  nameB: string;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapComputing, setHeatmapComputing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute authentic pixel difference heatmap when toggled on
  useEffect(() => {
    if (!showHeatmap || !canvasRef.current || !previewUrlA || !previewUrlB) {
      return;
    }

    let cancelled = false;
    setHeatmapComputing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setHeatmapComputing(false);
      return;
    }

    const imgA = new Image();
    const imgB = new Image();
    imgA.crossOrigin = 'anonymous';
    imgB.crossOrigin = 'anonymous';

    Promise.all([
      new Promise<void>((resolve, reject) => {
        imgA.onload = () => resolve();
        imgA.onerror = reject;
        imgA.src = previewUrlA;
      }),
      new Promise<void>((resolve, reject) => {
        imgB.onload = () => resolve();
        imgB.onerror = reject;
        imgB.src = previewUrlB;
      }),
    ])
      .then(() => {
        if (cancelled) return;

        // Bounded resolution for the heatmap overlay (max 800x600 for smooth rendering and low memory)
        const maxDim = 800;
        const w = Math.min(imgA.naturalWidth || 600, imgB.naturalWidth || 600, maxDim);
        const aspectA = (imgA.naturalWidth || 1) / (imgA.naturalHeight || 1);
        const h = Math.max(1, Math.round(w / aspectA));

        canvas.width = w;
        canvas.height = h;

        // Temporary offscreen canvas for pixel extraction
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return;

        // Draw Image A onto opaque white backing
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, w, h);
        offCtx.drawImage(imgA, 0, 0, w, h);
        const dataA = offCtx.getImageData(0, 0, w, h).data;

        // Draw Image B onto opaque white backing
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, w, h);
        offCtx.drawImage(imgB, 0, 0, w, h);
        const dataB = offCtx.getImageData(0, 0, w, h).data;

        // Create authentic difference image data
        const diffImageData = ctx.createImageData(w, h);
        const diffData = diffImageData.data;
        const threshold = 16; // Conforms to PREVIEW_CHANNEL_THRESHOLD

        const totalPixels = w * h;
        for (let i = 0; i < totalPixels * 4; i += 4) {
          const dr = Math.abs(dataA[i]! - dataB[i]!);
          const dg = Math.abs(dataA[i + 1]! - dataB[i + 1]!);
          const db = Math.abs(dataA[i + 2]! - dataB[i + 2]!);
          const maxDelta = Math.max(dr, dg, db);

          if (maxDelta >= threshold) {
            // Authentic highlight of differing pixels: vibrant warm heat color
            diffData[i] = 239;     // R (Tailwind red-500)
            diffData[i + 1] = 68;  // G
            diffData[i + 2] = 68;  // B
            // Alpha scales smoothly with delta intensity (0.35 to 0.85)
            diffData[i + 3] = Math.min(220, Math.max(90, Math.round(maxDelta * 1.5)));
          } else {
            // Unchanged pixels are completely transparent
            diffData[i + 3] = 0;
          }
        }

        ctx.putImageData(diffImageData, 0, 0);

        // Clean up temporary canvas backing store
        offCanvas.width = 0;
        offCanvas.height = 0;
      })
      .catch((err) => {
        console.warn('Could not compute visual difference heatmap:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setHeatmapComputing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showHeatmap, previewUrlA, previewUrlB]);

  const updatePosition = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.round((x / rect.width) * 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <section aria-labelledby="visual-diff-heading" className="panel visual-diff-panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h2 id="visual-diff-heading" style={{ margin: 0 }}>
            Visual Difference Swipe Slider
          </h2>
          <p className="note" style={{ margin: '4px 0 0 0' }}>
            Interactive before/after split viewer. Drag divider or press Arrow Left / Arrow Right.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="slider-preset-group" style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className={`button-small ${sliderPos === 100 ? 'button-active' : ''}`}
              style={{
                background: sliderPos === 100 ? '#0ea5e9' : 'transparent',
                color: sliderPos === 100 ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSliderPos(100)}
              title="View 100% File A"
            >
              100% A
            </button>
            <button
              type="button"
              className={`button-small ${sliderPos === 50 ? 'button-active' : ''}`}
              style={{
                background: sliderPos === 50 ? '#0ea5e9' : 'transparent',
                color: sliderPos === 50 ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSliderPos(50)}
              title="Reset to 50/50 Split"
            >
              50/50
            </button>
            <button
              type="button"
              className={`button-small ${sliderPos === 0 ? 'button-active' : ''}`}
              style={{
                background: sliderPos === 0 ? '#0ea5e9' : 'transparent',
                color: sliderPos === 0 ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSliderPos(0)}
              title="View 100% File B"
            >
              100% B
            </button>
          </div>
          <button
            type="button"
            id="toggle-heatmap"
            className="button-secondary button-small"
            onClick={() => setShowHeatmap((prev) => !prev)}
            data-testid="toggle-diff-heatmap"
          >
            {showHeatmap
              ? 'Hide Difference Heatmap'
              : heatmapComputing
              ? 'Computing Heatmap...'
              : 'Toggle Difference Heatmap'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="slider-viewport"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          minHeight: '0',
          maxHeight: '520px',
          aspectRatio: '16/10',
          borderRadius: '12px',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: '#0f172a',
          cursor: isDragging ? 'ew-resize' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* File B Image (Full background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrlB}
          alt={`File B: ${nameB}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* File A Image (Clipped to slider position) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrlA}
          alt={`File A: ${nameA}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
          }}
        />

        {/* Genuine authentic pixel difference heatmap overlay if toggled on */}
        {showHeatmap && (
          <canvas
            ref={canvasRef}
            className="diff-heatmap-canvas"
            data-testid="diff-heatmap-canvas"
            role="img"
            aria-label="Authentic pixel difference heatmap overlay highlighting changed pixels"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        )}

        {/* Badges on images */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 4,
          }}
        >
          File A (Left)
        </div>
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 4,
          }}
        >
          File B (Right)
        </div>

        {/* Draggable Divider Line & Handle */}
        <div
          role="slider"
          aria-label="Image comparison slider"
          aria-valuenow={sliderPos}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setSliderPos((p) => Math.max(0, p - 5));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setSliderPos((p) => Math.min(100, p + 5));
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sliderPos}%`,
            width: '4px',
            background: '#ffffff',
            cursor: 'ew-resize',
            transform: 'translateX(-50%)',
            zIndex: 5,
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
            }}
          >
            <SplitIcon size={14} />
          </div>
        </div>
      </div>

      <p className="note" style={{ marginTop: '8px' }}>
        Normalized preview measurement only. Pixel differences do not imply tampering, malice, or
        chronological order.
      </p>
    </section>
  );
}

type CompareTabKey = 'overview' | 'ai-delta' | 'c2pa' | 'metadata' | 'visual' | 'audit' | 'all';

interface CompareTabItem {
  id: CompareTabKey;
  label: string;
  icon: typeof FileTextIcon;
}

const COMPARE_TABS: readonly CompareTabItem[] = [
  { id: 'overview', label: 'Delta Overview', icon: FileTextIcon },
  { id: 'ai-delta', label: 'Meta AI Synthesizer', icon: SparklesIcon },
  { id: 'c2pa', label: 'C2PA Credentials', icon: ShieldCheckIcon },
  { id: 'metadata', label: 'Metadata Delta', icon: CameraIcon },
  { id: 'visual', label: 'Visual Diff & Heatmap', icon: SplitIcon },
  { id: 'audit', label: 'File A & B Audit', icon: LayersIcon },
  { id: 'all', label: 'Complete Comparison', icon: LayoutGridIcon },
];

export function CompareScreen({
  first,
  second,
  comparison,
  check,
  previewUrlA,
  previewUrlB,
  downloadError,
  onDownload,
  onClear,
  onInspectAnother,
  onLabelFirst,
  onLabelSecond,
  headingRef,
}: CompareScreenProps) {
  const [activeTab, setActiveTab] = useState<CompareTabKey>('overview');
  const [exportingCard, setExportingCard] = useState(false);

  const handleExportComparisonCard = async () => {
    setExportingCard(true);
    try {
      const { generateComparisonCardBlob, downloadSocialCard } = await import('@/lib/report/card');
      const blob = await generateComparisonCardBlob(
        first,
        second,
        comparison,
        previewUrlA,
        previewUrlB,
      );
      const nameA = first.file.displayName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nameB = second.file.displayName.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadSocialCard(blob, `compare_${nameA}_vs_${nameB}`);
    } catch (err) {
      console.error('Failed to export comparison social card:', err);
    } finally {
      setExportingCard(false);
    }
  };

  const evidence = check.evidence;
  const fingerprintsEqual = readBoolean(evidence, 'comparison.fingerprints_equal');
  const byteSizesEqual = readBoolean(evidence, 'comparison.byte_sizes_equal');
  const formatsEqual = readBoolean(evidence, 'comparison.formats_equal');
  const dimensionsEqual = readBoolean(evidence, 'comparison.dimensions_equal');
  const firstFile = first.file;
  const secondFile = second.file;
  const preview = comparison.preview;
  const outcome = isComparisonOutcome(check.outcome) ? check.outcome : null;

  const renderComparisonResultSection = () => (
    <section aria-labelledby="delta-heading" className="panel">
      <h2 id="delta-heading">Comparison result</h2>
      <p className="badge" data-testid="delta-execution-state" data-execution-state={check.executionState}>
        {EXECUTION_STATE_LABELS[check.executionState]}
      </p>
      {outcome === null ? (
        <p className="note">No comparison outcome was recorded for this check.</p>
      ) : (
        <>
          <p className="headline" data-testid="delta-outcome">
            {COMPARISON_OUTCOME_HEADLINES[outcome]}
          </p>
          <p data-testid="delta-outcome-description">{COMPARISON_OUTCOME_DESCRIPTIONS[outcome]}</p>
        </>
      )}
      <p className="note">
        {CHECK_LABELS.comparison} · checker {check.checkerName} {check.checkerVersion} · check ID{' '}
        <code>{check.checkId}</code>
      </p>

      <table className="delta-table" data-testid="delta-properties">
        <caption>Recorded file properties</caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">File A</th>
            <th scope="col">File B</th>
            <th scope="col">Comparison</th>
          </tr>
        </thead>
        <tbody>
          <PropertyRow
            property="User-supplied label"
            firstValue={firstFile.userLabel === undefined ? 'None' : firstFile.userLabel}
            secondValue={secondFile.userLabel === undefined ? 'None' : secondFile.userLabel}
            status="Not compared by the app"
          />
          <PropertyRow
            property="SHA-256 of the original bytes"
            firstValue={firstFile.sha256}
            secondValue={secondFile.sha256}
            status={equalityLabel(fingerprintsEqual)}
          />
          <PropertyRow
            property="Byte size"
            firstValue={formatByteSize(firstFile.byteSize)}
            secondValue={formatByteSize(secondFile.byteSize)}
            status={equalityLabel(byteSizesEqual)}
          />
          <PropertyRow
            property="Detected format"
            firstValue={firstFile.detectedMimeType}
            secondValue={secondFile.detectedMimeType}
            status={equalityLabel(formatsEqual)}
          />
          <PropertyRow
            property="Dimensions"
            firstValue={formatDimensions(firstFile.width, firstFile.height)}
            secondValue={formatDimensions(secondFile.width, secondFile.height)}
            status={equalityLabel(dimensionsEqual)}
          />
        </tbody>
      </table>
      <p className="note">
        Equal fingerprints mean the two supplied files are identical byte versions. Different
        fingerprints mean the bytes differ; they do not say which file is older, original, or
        edited.
      </p>
    </section>
  );

  const renderLabelsSection = () => (
    <section aria-labelledby="label-heading" className="panel">
      <h2 id="label-heading">Your original/edited labels</h2>
      <p>
        You may tell the app which file you consider the original and which you consider edited.
        The labels stay attached to the supplied files as your assertion and appear in the exported
        report. No check depends on them.
      </p>
      <div className="compare-grid">
        <LabelSelect side="a" analysis={first} onChange={onLabelFirst} />
        <LabelSelect side="b" analysis={second} onChange={onLabelSecond} />
      </div>
    </section>
  );

  const renderMetadataDeltaSection = () => (
    <section aria-labelledby="metadata-delta-heading" className="panel">
      <h2 id="metadata-delta-heading">Metadata clues side by side</h2>
      <p className="note">
        Every value here is an unverified clue from the bounded allowlist. Equal values can be
        copied, and different values need not relate to any editing step. GPS coordinates are never
        extracted, displayed, or exported.
      </p>
      <table className="delta-table" data-testid="delta-metadata">
        <caption>Allowlisted metadata fields</caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">File A</th>
            <th scope="col">File B</th>
            <th scope="col">Comparison</th>
          </tr>
        </thead>
        <tbody>
          {comparison.metadataFields.map((entry) => (
            <tr key={entry.field} data-testid={`delta-metadata-${entry.field}`}>
              <th scope="row">{METADATA_FIELD_LABELS[entry.field]}</th>
              <td data-column="File A">{entry.firstValue ?? '—'}</td>
              <td data-column="File B">{entry.secondValue ?? '—'}</td>
              <td data-column="Comparison">{COMPARISON_DIFFERENCE_LABELS[entry.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        A dash means this parser did not record that field for that file. It does not prove the
        metadata was deliberately removed.
      </p>
    </section>
  );

  const renderPreviewPixelSection = () => (
    <section aria-labelledby="preview-heading" className="panel">
      <h2 id="preview-heading">Preview pixel difference</h2>
      {preview.status === 'measured' ? (
        <>
          <dl className="kv" data-testid="delta-preview-measured">
            <div>
              <dt>Normalized preview size</dt>
              <dd>
                {formatDimensions(preview.width, preview.height)} ·{' '}
                {preview.pixelCount.toLocaleString()} pixels
              </dd>
            </div>
            <div>
              <dt>Mean absolute channel error</dt>
              <dd>{preview.meanAbsoluteChannelError} of 255</dd>
            </div>
            <div>
              <dt>Changed pixels</dt>
              <dd>
                {preview.changedPixelCount.toLocaleString()} of{' '}
                {preview.pixelCount.toLocaleString()} ({(preview.changedPixelShare * 100).toFixed(2)}
                %), counting a channel difference of at least {preview.channelThreshold} of 255
              </dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>
                <code>{preview.methodId}</code> · decoder <code>{preview.decoderId}</code>
              </dd>
            </div>
          </dl>
          <p className="note" data-testid="delta-preview-note">
            {PREVIEW_NORMALIZATION_NOTE}
          </p>
          <p className="note">
            This is a measurement of the displayed preview, not a forensic conclusion. A non-zero
            value is not evidence of tampering, deception, or intent.
          </p>
        </>
      ) : (
        <div data-testid="delta-preview-skipped">
          <p>{PREVIEW_SKIP_REASON_LABELS[preview.reason]}</p>
          <p className="note">{PREVIEW_SKIP_REASON_EXPLANATIONS[preview.reason]}</p>
          <p className="note" data-testid="delta-preview-no-pixels">
            No pixel difference was recorded. This is not a difference of zero.
          </p>
        </div>
      )}
    </section>
  );

  const renderComparisonCheckSection = () => (
    <section aria-labelledby="delta-check-heading" className="panel">
      <h2 id="delta-check-heading">Comparison check and evidence</h2>
      <p className="note">
        The delta is itself a recorded check. Its evidence items are listed with it, and every
        statement above resolves to one of them.
      </p>
      <ol className="check-list">
        <CheckRow check={check} idPrefix="delta-" />
      </ol>
      <h3>Comparison limitations</h3>
      <ul data-testid="delta-limitations">
        {check.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
        <li>
          Only the checks listed for each file ran. Anything not evaluated is reported as not
          evaluated, never as equal or different.
        </li>
      </ul>
    </section>
  );

  const renderSideBySideAuditSection = () => (
    <div className="compare-grid">
      <div>
        <FileEvidenceSections
          analysis={first}
          idPrefix="a-"
          title="File A (as supplied)"
          previewUrl={previewUrlA}
        />
      </div>
      <div>
        <FileEvidenceSections
          analysis={second}
          idPrefix="b-"
          title="File B (as supplied)"
          previewUrl={previewUrlB}
        />
      </div>
    </div>
  );

  const renderC2paComparisonSection = () => {
    const findingA = first.finding;
    const findingB = second.finding;
    return (
      <section aria-labelledby="c2pa-comparison-heading" className="panel">
        <h2 id="c2pa-comparison-heading">C2PA Cryptographic Credentials Comparison</h2>
        <p className="note">
          Side-by-side comparison of embedded C2PA manifests, digital signatures, asset bindings, and signer trust.
        </p>
        <table className="delta-table">
          <caption>C2PA Cryptographic Attributes</caption>
          <thead>
            <tr>
              <th scope="col">Attribute</th>
              <th scope="col">File A ({firstFile.displayName})</th>
              <th scope="col">File B ({secondFile.displayName})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Manifest Presence</th>
              <td>{findingA?.manifestPresence ?? 'Not present'}</td>
              <td>{findingB?.manifestPresence ?? 'Not present'}</td>
            </tr>
            <tr>
              <th scope="row">Signature Validation</th>
              <td>{findingA?.signatureValidation ?? 'Not evaluated'}</td>
              <td>{findingB?.signatureValidation ?? 'Not evaluated'}</td>
            </tr>
            <tr>
              <th scope="row">Asset Binding</th>
              <td>{findingA?.contentBindingValidation ?? 'Not evaluated'}</td>
              <td>{findingB?.contentBindingValidation ?? 'Not evaluated'}</td>
            </tr>
            <tr>
              <th scope="row">Signer Trust</th>
              <td>{findingA?.signerTrust ?? 'Not evaluated'}</td>
              <td>{findingB?.signerTrust ?? 'Not evaluated'}</td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  };

  return (
    <div data-testid="compare-ledger">
      <div className="print-only-header">
        <div style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>OriginLens — Audited Provenance Delta Report</div>
        <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#475569' }}>
          Independent Dual-File Media Verification · WebAssembly C2PA · Pixel Delta Normalization
        </p>
        <p style={{ margin: '4px 0', fontSize: '0.8125rem', color: '#64748b' }}>
          File A: <strong>{firstFile.displayName}</strong> ({firstFile.sha256.slice(0, 16)}…) vs File B: <strong>{secondFile.displayName}</strong> ({secondFile.sha256.slice(0, 16)}…)
        </p>
      </div>

      <header className="hero">
        <p className="eyebrow">Provenance Delta</p>
        <h1 id="compare-heading" ref={headingRef} tabIndex={-1} data-testid="compare-heading">
          Two files, checked independently
        </h1>
        <p className="lede">
          File A and File B were each analysed on their own. Anything that differs is reported as a
          difference in the recorded properties, not as a finding about origin or intent.
        </p>
      </header>

      {/* Interactive Visual Diff Split-Screen Swipe Slider */}
      {previewUrlA && previewUrlB ? (
        <VisualDiffSlider
          previewUrlA={previewUrlA}
          previewUrlB={previewUrlB}
          nameA={firstFile.displayName}
          nameB={secondFile.displayName}
        />
      ) : null}

      {/* Unified Categorized Comparison Tabs */}
      <div className="category-tabs-wrapper">
        <div className="category-tabs-nav" role="tablist" aria-label="Comparison Categories">
          {COMPARE_TABS.map((tab, idx) => {
            const TabIcon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`compare-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`compare-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                className={`category-tab-btn ${isSelected ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = (idx + 1) % COMPARE_TABS.length;
                    const nextTab = COMPARE_TABS[next];
                    if (nextTab) {
                      setActiveTab(nextTab.id);
                      document.getElementById(`compare-tab-${nextTab.id}`)?.focus();
                    }
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prev = (idx - 1 + COMPARE_TABS.length) % COMPARE_TABS.length;
                    const prevTab = COMPARE_TABS[prev];
                    if (prevTab) {
                      setActiveTab(prevTab.id);
                      document.getElementById(`compare-tab-${prevTab.id}`)?.focus();
                    }
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    const firstTab = COMPARE_TABS[0];
                    if (firstTab) {
                      setActiveTab(firstTab.id);
                      document.getElementById(`compare-tab-${firstTab.id}`)?.focus();
                    }
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    const lastTab = COMPARE_TABS[COMPARE_TABS.length - 1];
                    if (lastTab) {
                      setActiveTab(lastTab.id);
                      document.getElementById(`compare-tab-${lastTab.id}`)?.focus();
                    }
                  }
                }}
              >
                <TabIcon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Delta Summary */}
        <div
          role="tabpanel"
          id="compare-panel-overview"
          aria-labelledby="compare-tab-overview"
          className="category-tabpanel"
          hidden={activeTab !== 'overview' && activeTab !== 'all'}
        >
          {renderComparisonResultSection()}
          <CompareDeltaSynthesizer first={first} second={second} comparison={comparison} check={check} />
          {renderLabelsSection()}
          {renderMetadataDeltaSection()}
          {renderPreviewPixelSection()}
          {renderComparisonCheckSection()}
          {renderSideBySideAuditSection()}
        </div>

        {/* Tab 2: Meta AI Provenance Delta Synthesizer */}
        {activeTab === 'ai-delta' && (
          <div
            role="tabpanel"
            id="compare-panel-ai-delta"
            aria-labelledby="compare-tab-ai-delta"
            className="category-tabpanel"
          >
            <CompareDeltaSynthesizer first={first} second={second} comparison={comparison} check={check} />
          </div>
        )}

        {/* Tab 3: C2PA Credentials Comparison */}
        {activeTab === 'c2pa' && (
          <div
            role="tabpanel"
            id="compare-panel-c2pa"
            aria-labelledby="compare-tab-c2pa"
            className="category-tabpanel"
          >
            {renderC2paComparisonSection()}
          </div>
        )}

        {/* Tab 3: Metadata Delta */}
        {activeTab === 'metadata' && (
          <div
            role="tabpanel"
            id="compare-panel-metadata"
            aria-labelledby="compare-tab-metadata"
            className="category-tabpanel"
          >
            {renderMetadataDeltaSection()}
          </div>
        )}

        {/* Tab 4: Visual Difference & Slider */}
        {activeTab === 'visual' && (
          <div
            role="tabpanel"
            id="compare-panel-visual"
            aria-labelledby="compare-tab-visual"
            className="category-tabpanel"
          >
            {renderPreviewPixelSection()}
          </div>
        )}

        {/* Tab 5: Side-by-Side Detailed Audit */}
        {activeTab === 'audit' && (
          <div
            role="tabpanel"
            id="compare-panel-audit"
            aria-labelledby="compare-tab-audit"
            className="category-tabpanel"
          >
            {renderComparisonCheckSection()}
            {renderSideBySideAuditSection()}
          </div>
        )}

        {/* Tab 7: Complete Comparison */}
        {activeTab === 'all' && (
          <div
            role="tabpanel"
            id="compare-panel-all"
            aria-labelledby="compare-tab-all"
            className="category-tabpanel"
          >
            <CompareDeltaSynthesizer first={first} second={second} comparison={comparison} check={check} />
            {renderC2paComparisonSection()}
          </div>
        )}
      </div>

      <ReportActions
        downloadError={downloadError}
        onDownload={onDownload}
        onClear={onClear}
        onInspectAnother={onInspectAnother}
        compare
        onExportComparisonCard={() => void handleExportComparisonCard()}
        exportingComparisonCard={exportingCard}
      />
    </div>
  );
}
