import type { CommonOutcome, Comparison, CheckResult, EvidenceItem } from '@/lib/results/schemas';
import type { Ref } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import { PREVIEW_NORMALIZATION_NOTE } from '@/lib/compare/preview';
import { CheckRow, FileEvidenceSections, ReportActions } from './ledger';
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

export function CompareScreen({
  first,
  second,
  comparison,
  check,
  downloadError,
  onDownload,
  onClear,
  onInspectAnother,
  onLabelFirst,
  onLabelSecond,
  headingRef,
}: CompareScreenProps) {
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
          <FileEvidenceSections analysis={first} idPrefix="a-" title="File A (as supplied)" />
        </div>
        <div>
          <FileEvidenceSections analysis={second} idPrefix="b-" title="File B (as supplied)" />
        </div>
      </div>

      <ReportActions
        downloadError={downloadError}
        onDownload={onDownload}
        onClear={onClear}
        onInspectAnother={onInspectAnother}
        compare
      />
    </div>
  );
}
