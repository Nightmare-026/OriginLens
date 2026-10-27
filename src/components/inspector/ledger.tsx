import type { CheckResult, EvidenceItem } from '@/lib/results/schemas';
import type { Ref } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import { buildCoverage, SUMMARY_DESCRIPTIONS, SUMMARY_HEADLINES } from '@/lib/pipeline/summary';
import { C2PA_SDK_VERSION, C2PA_TRUST_POLICY_ID } from '@/lib/c2pa/asset';
import { APP_VERSION } from '@/lib/security/limits';
import {
  C2PA_FIELD_HELP,
  CHECK_DESCRIPTIONS,
  CHECK_LABELS,
  EXECUTION_STATE_LABELS,
  MANIFEST_LABELS,
  OUTCOME_LABELS,
  REVOCATION_LABELS,
  TRUST_LABELS,
  VALIDATION_LABELS,
  formatByteSize,
  formatDimensions,
} from './labels';
import { ModelExplanationCard } from './model-explanation';


/**
 * Screen D - Evidence Ledger report (PRD 5.4).
 *
 * Every value shown here comes from a runtime-validated domain object. The
 * ledger separates execution state from findings, names the checker and trust
 * policy, and lists the structured evidence behind the recorded checks.
 *
 * The same sections render for one file and for each side of a comparison.
 * A prefix keeps element and test identifiers unique when two ledgers share a
 * page; the single-file case keeps the unprefixed identifiers.
 */

export type LedgerProps = Readonly<{
  analysis: FileAnalysis;
  notice?: string;
  downloadError: string | null;
  onDownload: () => void;
  onClear: () => void;
  onInspectAnother: () => void;
  /**
   * Receives the result heading so the workflow can move focus to the new
   * content once a run completes (PRD 5.6: status changes are announced).
   */
  headingRef?: Ref<HTMLHeadingElement>;
}>;

export type FileSectionsProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix: string;
  /** Comparison heading such as "File A". Omitted for a single-file ledger. */
  title?: string;
}>;

export type ReportActionsProps = Readonly<{
  downloadError: string | null;
  onDownload: () => void;
  onClear: () => void;
  onInspectAnother: () => void;
  compare: boolean;
}>;

function EvidenceList({ items }: Readonly<{ items: readonly EvidenceItem[] }>) {
  if (items.length === 0) {
    return <p className="note">No evidence items were recorded by this check.</p>;
  }

  return (
    <ol className="evidence-list">
      {items.map((item) => (
        <li key={item.evidenceId}>
          <code className="evidence-id">{item.evidenceId}</code>{' '}
          <span className="evidence-key">{item.key}</span>:{' '}
          <span className="evidence-value">{String(item.value)}</span>{' '}
          <span className="note">({item.authority})</span>
        </li>
      ))}
    </ol>
  );
}

export function CheckRow({
  check,
  idPrefix,
}: Readonly<{ check: CheckResult; idPrefix: string }>) {
  return (
    <li className="check-row" data-testid={`${idPrefix}check-${check.kind}`}>
      <div className="check-heading">
        <span className="check-name">{CHECK_LABELS[check.kind]}</span>
        <span className="badge" data-execution-state={check.executionState}>
          {EXECUTION_STATE_LABELS[check.executionState]}
        </span>
        {check.outcome === undefined ? null : (
          <span className="badge badge-outcome">
            Finding: {OUTCOME_LABELS[check.outcome]}
          </span>
        )}
      </div>
      <p className="note">
        {CHECK_DESCRIPTIONS[check.kind]} Checker: {check.checkerName}
        {check.checkerVersion === undefined ? '' : ` ${check.checkerVersion}`}. Check ID:{' '}
        <code>{check.checkId}</code>.
      </p>
      {check.errorCode === undefined ? null : (
        <p className="note">
          Safe error code: <code>{check.errorCode}</code>
        </p>
      )}
      {check.warnings.length === 0 ? null : (
        <ul className="warning-list">
          {check.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <details>
        <summary>Evidence items ({check.evidence.length})</summary>
        <EvidenceList items={check.evidence} />
      </details>
    </li>
  );
}

function CredentialSection({ analysis, idPrefix }: Readonly<{ analysis: FileAnalysis; idPrefix: string }>) {
  const check = analysis.checks.find((candidate) => candidate.kind === 'c2pa');
  const finding = analysis.finding;

  if (check === undefined) {
    return (
      <p className="note">
        No credential check is recorded for this file. Nothing is claimed about embedded
        credentials.
      </p>
    );
  }

  if (check.executionState !== 'completed') {
    return (
      <>
        <p>
          The credential check is recorded as {EXECUTION_STATE_LABELS[check.executionState]}.
          {check.errorCode === undefined ? null : (
            <>
              {' '}
              Safe error code: <code>{check.errorCode}</code>.
            </>
          )}{' '}
          No credential conclusion is available, and other completed checks are unaffected.
        </p>
        <p className="note">{C2PA_FIELD_HELP.manifest}</p>
      </>
    );
  }

  if (check.outcome === 'unsupported') {
    return (
      <p>
        This file is outside the credential checker’s supported format scope, so no credential
        evidence was inspected. That is not a finding about the image.
      </p>
    );
  }

  if (finding === null || finding.manifestPresence !== 'present') {
    return (
      <>
        <dl className="kv">
          <div>
            <dt>Embedded manifest</dt>
            <dd data-testid={`${idPrefix}c2pa-presence`}>
              {finding === null ? 'No structured finding' : MANIFEST_LABELS[finding.manifestPresence]}
            </dd>
          </div>
        </dl>
        <p>
          No supported embedded credential was found by this check. Only credentials embedded in the
          supplied file are inspected; external and durable credentials were not searched.
        </p>
        <p className="note">{C2PA_FIELD_HELP.manifest}</p>
        <p className="note">
          Absence is not evidence that the image is unedited, human-made, or trustworthy.
        </p>
      </>
    );
  }

  return (
    <>
      <dl className="kv">
        <div>
          <dt>Embedded manifest</dt>
          <dd data-testid={`${idPrefix}c2pa-presence`}>{MANIFEST_LABELS[finding.manifestPresence]}</dd>
        </div>
        <div>
          <dt>Manifest validation</dt>
          <dd data-testid={`${idPrefix}c2pa-manifest`}>{VALIDATION_LABELS[finding.manifestValidation]}</dd>
        </div>
        <div>
          <dt>Claim signature</dt>
          <dd data-testid={`${idPrefix}c2pa-signature`}>{VALIDATION_LABELS[finding.signatureValidation]}</dd>
        </div>
        <div>
          <dt>Asset binding</dt>
          <dd data-testid={`${idPrefix}c2pa-binding`}>{VALIDATION_LABELS[finding.contentBindingValidation]}</dd>
        </div>
        <div>
          <dt>Signer trust</dt>
          <dd data-testid={`${idPrefix}c2pa-trust`}>{TRUST_LABELS[finding.signerTrust]}</dd>
        </div>
        <div>
          <dt>Timestamp check</dt>
          <dd data-testid={`${idPrefix}c2pa-timestamp`}>{VALIDATION_LABELS[finding.timestampValidation]}</dd>
        </div>
        <div>
          <dt>Revocation status</dt>
          <dd data-testid={`${idPrefix}c2pa-revocation`}>{REVOCATION_LABELS[finding.revocationStatus]}</dd>
        </div>
        <div>
          <dt>Trust policy</dt>
          <dd>
            <code>{finding.trustPolicyId || C2PA_TRUST_POLICY_ID}</code>
          </dd>
        </div>
        <div>
          <dt>Checker</dt>
          <dd>
            c2pa-web {finding.sdkVersion || C2PA_SDK_VERSION}
          </dd>
        </div>
      </dl>

      <ul className="note-list">
        <li>{C2PA_FIELD_HELP.signature}</li>
        <li>{C2PA_FIELD_HELP.contentBinding}</li>
        <li>{C2PA_FIELD_HELP.signerTrust}</li>
        <li>{C2PA_FIELD_HELP.timestamp}</li>
        <li>{C2PA_FIELD_HELP.revocation}</li>
      </ul>

      {finding.actions.length === 0 ? null : (
        <div>
          <h3>Recorded actions</h3>
          <p className="note">{C2PA_FIELD_HELP.actions}</p>
          <ul>
            {finding.actions.map((action) => (
              <li key={action.sourceEvidenceId}>
                <code>{action.actionCode}</code>{' '}
                <span className="note">(evidence {action.sourceEvidenceId})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {finding.ingredients.length === 0 ? null : (
        <div>
          <h3>Recorded ingredients</h3>
          <p className="note">{C2PA_FIELD_HELP.ingredients}</p>
          <ul>
            {finding.ingredients.map((ingredient) => (
              <li key={ingredient.sourceEvidenceId}>
                {ingredient.title ?? ingredient.relationship ?? 'Unnamed ingredient'}{' '}
                <span className="note">(evidence {ingredient.sourceEvidenceId})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3>Validator status codes</h3>
        <p className="note">
          Raw codes from the pinned validator, preserved as recorded. An unrecognised code is never
          mapped to a successful result.
        </p>
        {finding.sdkCodes.length === 0 ? (
          <p className="note">No status codes were returned.</p>
        ) : (
          <ul className="code-list" data-testid={`${idPrefix}c2pa-codes`}>
            {finding.sdkCodes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      {finding.warnings.length === 0 ? null : (
        <ul className="warning-list">
          {finding.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function MetadataSection({ analysis, idPrefix }: Readonly<{ analysis: FileAnalysis; idPrefix: string }>) {
  const check = analysis.checks.find((candidate) => candidate.kind === 'metadata');
  const metadata = analysis.metadata;

  if (check !== undefined && check.executionState === 'failed') {
    return (
      <p>
        The metadata parser did not complete
        {check.errorCode === undefined ? '' : ` (${check.errorCode})`}. No metadata clue was
        recorded, and the other completed checks are unaffected.
      </p>
    );
  }

  if (metadata === null) {
    return (
      <p className="note">
        The metadata check did not run. Nothing is claimed about embedded metadata.
      </p>
    );
  }

  if (metadata.status === 'not_present' || metadata.fields.length === 0) {
    return (
      <>
        <p>No selected metadata fields were found by the configured parser.</p>
        <p className="note">
          That is not evidence that metadata was deliberately removed. Re-encoding and ordinary
          processing can remove it.
        </p>
        <p className="note" data-testid={`${idPrefix}metadata-gps`}>
          {metadata.gpsPresence === 'present'
            ? 'Location metadata is present in the file. Coordinates are not extracted, displayed, or exported.'
            : metadata.gpsPresence === 'not_present'
              ? 'No location metadata was found by this parser.'
              : 'Location-metadata presence was not evaluated.'}
        </p>
      </>
    );
  }

  return (
    <>
      <dl className="kv">
        {metadata.fields.map((field) => (
          <div key={`${field.key}-${field.label}`}>
            <dt>{field.label}</dt>
            <dd>{String(field.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="note" data-testid={`${idPrefix}metadata-gps`}>
        {metadata.gpsPresence === 'present'
          ? 'Location metadata is present in the file. Coordinates are not extracted, displayed, or exported.'
          : metadata.gpsPresence === 'not_present'
            ? 'No location metadata was found by this parser.'
            : 'Location-metadata presence was not evaluated.'}
      </p>
      <p className="note">
        Every field above is an unverified clue marked {`"${metadata.parser.name} ${metadata.parser.version}"`}.
        Metadata can be absent, copied, edited, or misleading, and is not cryptographic provenance.
      </p>
    </>
  );
}

function uniqueLimitations(analysis: FileAnalysis): string[] {
  const seen = new Set<string>();
  const limitations: string[] = [];

  for (const check of analysis.checks) {
    for (const limitation of check.limitations) {
      if (!seen.has(limitation) && limitations.length < 12) {
        seen.add(limitation);
        limitations.push(limitation);
      }
    }
  }

  return limitations;
}

/**
 * The Evidence Ledger body for one analyzed file. `idPrefix` is empty for the
 * single-file ledger, and `a-` or `b-` inside a comparison.
 */
export function FileEvidenceSections({ analysis, idPrefix, title }: FileSectionsProps) {
  const coverage = buildCoverage(analysis.checks);
  const headlineCode = analysis.summaryCodes[0];
  const limitations = uniqueLimitations(analysis);
  const tid = (suffix: string): string => `${idPrefix}${suffix}`;

  return (
    <div data-testid={tid('file-ledger')}>
      {title === undefined ? null : (
        <header className="file-header">
          <p className="eyebrow" data-testid={tid('file-title')}>
            {title}
          </p>
          <h2 data-testid={tid('file-name')}>{analysis.file.displayName}</h2>
          <p className="lede" data-testid={tid('file-facts')}>
            {formatByteSize(analysis.file.byteSize)} · {analysis.file.detectedMimeType} ·{' '}
            {formatDimensions(analysis.file.width, analysis.file.height)}
          </p>
        </header>
      )}

      {analysis.cancelled ? (
        <p className="notice" role="status">
          The analysis was cancelled. Completed checks remain visible, and skipped or cancelled
          checks are marked as such. No conclusion follows from the missing coverage.
        </p>
      ) : null}

      <section aria-labelledby={tid('summary-heading')} className="panel">
        <h2 id={tid('summary-heading')}>Summary</h2>
        {headlineCode === undefined ? (
          <p className="note">No summary code was recorded for this analysis.</p>
        ) : (
          <>
            <p className="headline" data-testid={tid('summary-headline')}>
              {SUMMARY_HEADLINES[headlineCode]}
            </p>
            <p>{SUMMARY_DESCRIPTIONS[headlineCode]}</p>
          </>
        )}

        <h3>Coverage</h3>
        <p data-testid={tid('coverage-summary')}>
          {coverage.completed} of {coverage.total} checks completed · {coverage.failed} failed ·{' '}
          {coverage.timedOut} timed out · {coverage.cancelled} cancelled · {coverage.skipped}{' '}
          skipped
          {coverage.unsupported === 0 ? '' : ` · ${coverage.unsupported} unsupported`}
          {coverage.inconclusive === 0 ? '' : ` · ${coverage.inconclusive} inconclusive`}
        </p>
        <p className="note">
          Coverage counts checks, not verdicts. A check that did not complete is incomplete
          coverage, not a negative finding about the image.
        </p>

        {analysis.summaryCodes.length > 1 ? (
          <ul className="note-list" data-testid={tid('summary-codes')}>
            {analysis.summaryCodes.slice(1).map((code) => (
              <li key={code}>{SUMMARY_HEADLINES[code]}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby={tid('fingerprint-heading')} className="panel">
        <h2 id={tid('fingerprint-heading')}>File fingerprint</h2>
        <dl className="kv">
          <div>
            <dt>SHA-256 of the original bytes</dt>
            <dd>
              <code className="hash" data-testid={tid('file-sha256')}>
                {analysis.file.sha256}
              </code>
            </dd>
          </div>
          <div>
            <dt>Byte size</dt>
            <dd>{formatByteSize(analysis.file.byteSize)}</dd>
          </div>
          <div>
            <dt>Detected format</dt>
            <dd>{analysis.file.detectedMimeType}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>{formatDimensions(analysis.file.width, analysis.file.height)}</dd>
          </div>
          <div>
            <dt>Decode pipeline</dt>
            <dd>
              <code>{analysis.file.decodePipelineVersion}</code>
            </dd>
          </div>
          <div>
            <dt>File ID</dt>
            <dd>
              <code data-testid={tid('file-id')}>{analysis.file.fileId}</code>
            </dd>
          </div>
          {analysis.file.userLabel === undefined ? null : (
            <div>
              <dt>User-supplied label</dt>
              <dd data-testid={tid('user-label')}>
                {analysis.file.userLabel === 'original' ? 'Original' : 'Edited'}
              </dd>
            </div>
          )}
          <div>
            <dt>App version</dt>
            <dd>{APP_VERSION}</dd>
          </div>
        </dl>
        {analysis.file.userLabel === undefined ? null : (
          <p className="note" data-testid={tid('user-label-note')}>
            This label is the user&apos;s own assertion. It was not measured, verified, or inferred
            from the files, and it does not establish which file came first.
          </p>
        )}
        <p className="note">
          The fingerprint identifies this exact byte version. It does not establish who created the
          file, when an event occurred, or whether the content is true.
        </p>
      </section>

      <section aria-labelledby={tid('credential-heading')} className="panel">
        <h2 id={tid('credential-heading')}>C2PA credential findings</h2>
        <CredentialSection analysis={analysis} idPrefix={idPrefix} />
      </section>

      <section aria-labelledby={tid('metadata-heading')} className="panel">
        <h2 id={tid('metadata-heading')}>Metadata clues</h2>
        <p className="note">
          Metadata is unverified. It is shown only from a bounded allowlist and is never treated as
          cryptographic provenance.
        </p>
        <MetadataSection analysis={analysis} idPrefix={idPrefix} />
      </section>

      <section aria-labelledby={tid('explanation-heading')} className="panel">
        <h2 id={tid('explanation-heading')}>Evidence explanation</h2>
        <p data-testid={tid('explanation')}>{analysis.explanation}</p>
        <p className="note">
          Deterministic template generated from the typed results above. No model was called, and no
          finding was added.
        </p>
        <ModelExplanationCard analysis={analysis} idPrefix={idPrefix} />
      </section>

      <section aria-labelledby={tid('checks-heading')} className="panel">
        <h2 id={tid('checks-heading')}>Checks and evidence</h2>
        <p className="note">
          Every displayed finding belongs to one of these checks and is backed by the structured
          evidence items listed with it.
        </p>
        <ol className="check-list">
          {analysis.checks.map((check) => (
            <CheckRow key={check.checkId} check={check} idPrefix={idPrefix} />
          ))}
        </ol>
      </section>

      <section aria-labelledby={tid('limitations-heading')} className="panel">
        <h2 id={tid('limitations-heading')}>Limitations</h2>
        <ul data-testid={tid('limitations')}>
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
          <li>Only the checks listed above ran. Anything not listed was not evaluated.</li>
          <li>
            This is not a real-or-fake verdict, a forensic certificate, or proof of origin,
            authorship, chronology, intent, or scene truth.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function ReportActions({
  downloadError,
  onDownload,
  onClear,
  onInspectAnother,
  compare,
}: ReportActionsProps) {
  return (
    <section aria-labelledby="actions-heading" className="panel">
      <h2 id="actions-heading">Actions</h2>
      <p className="note">
        The JSON report keeps check states, outcomes, evidence references, coverage gaps, and
        limitations. It excludes image bytes and precise GPS coordinates, and it is not digitally
        signed.
        {compare
          ? ' A two-file report also records the Provenance Delta block and excludes image bytes from it.'
          : ''}
      </p>
      <div className="actions">
        <button type="button" onClick={onDownload} data-testid="download-report">
          Download JSON report
        </button>
        <button type="button" onClick={onInspectAnother} data-testid="inspect-another">
          {compare ? 'Start a new comparison' : 'Inspect another file'}
        </button>
        <button type="button" onClick={onClear} data-testid="clear-session">
          Clear session
        </button>
      </div>
      {downloadError === null ? null : (
        <p className="panel-error-inline" role="alert" data-testid="download-error">
          {downloadError}
        </p>
      )}
      <p className="note">
        Clearing the session discards the analysis and releases the credential-check runtime. No
        media history is stored, and refreshing the page loses the result by design.
      </p>
    </section>
  );
}

export function EvidenceLedger({
  analysis,
  notice,
  downloadError,
  onDownload,
  onClear,
  onInspectAnother,
  headingRef,
}: LedgerProps) {
  return (
    <div data-testid="ledger">
      <header className="hero">
        <p className="eyebrow">Evidence Ledger</p>
        <h1 id="ledger-heading" ref={headingRef} tabIndex={-1} data-testid="ledger-heading">
          {analysis.file.displayName}
        </h1>
        <p className="lede" data-testid="file-facts">
          {formatByteSize(analysis.file.byteSize)} · {analysis.file.detectedMimeType} ·{' '}
          {formatDimensions(analysis.file.width, analysis.file.height)}
        </p>
      </header>

      {notice === undefined ? null : (
        <p className="notice" role="status" data-testid="session-notice">
          {notice}
        </p>
      )}

      <FileEvidenceSections analysis={analysis} idPrefix="" />

      <ReportActions
        downloadError={downloadError}
        onDownload={onDownload}
        onClear={onClear}
        onInspectAnother={onInspectAnother}
        compare={false}
      />
    </div>
  );
}
