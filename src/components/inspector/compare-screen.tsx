import type { CommonOutcome, Comparison, CheckResult, EvidenceItem } from '@/lib/results/schemas';
import { useState, useRef, type Ref } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import { PREVIEW_NORMALIZATION_NOTE } from '@/lib/compare/preview';
import { CheckRow, FileEvidenceSections, ReportActions } from './ledger';
import { ChronologySection } from './chronology-section';
import { SplitIcon } from '@/components/ui/icons';
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

  return (
    <p className="field">
      <label htmlFor={id}>Your label for File {side.toUpperCase()} (optional, user-supplied)</label>
      <select
        id={id}
        data-testid={id}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value;

          onChange(next === 'original' || next === 'edited' ? next : null);
        }}
      >
        <option value="">No label</option>
        <option value="original">I am supplying this as the original</option>
        <option value="edited">I am supplying this as an edited version</option>
      </select>
      <span className="note">
        This label is your own assertion, recorded verbatim. The app does not measure, verify, or
        infer which file came first.
      </span>
    </p>
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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <button
          type="button"
          className="button-secondary button-small"
          onClick={() => setShowHeatmap((prev) => !prev)}
          data-testid="toggle-diff-heatmap"
        >
          {showHeatmap ? 'Hide Difference Heatmap' : 'Toggle Difference Heatmap'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="slider-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
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

        {/* Heatmap difference overlay if toggled on */}
        {showHeatmap && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 60% 50%, rgba(239, 68, 68, 0.45) 0%, rgba(245, 158, 11, 0.25) 30%, transparent 60%)',
              mixBlendMode: 'screen',
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

  return (
    <div data-testid="compare-ledger">
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

      {/* Feature 6: Provenance Chronology & Temporal Ordering Determination */}
      <ChronologySection first={first} second={second} />

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
