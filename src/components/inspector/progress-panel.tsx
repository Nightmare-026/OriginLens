import type { CheckKind, CommonOutcome, ExecutionState } from '@/lib/results/schemas';
import {
  CHECK_LABELS,
  EXECUTION_STATE_LABELS,
  OUTCOME_LABELS,
  formatByteSize,
} from './labels';

/**
 * Screen C - Check progress (PRD 5.3).
 *
 * Execution state and finding are shown as separate columns. Nothing here
 * invents a percentage: the only progress reported is the transition of a
 * stage between real states.
 */

/** Stages a session can report, including the two-file comparison step. */
export type StageName = Exclude<CheckKind, 'meta_explanation'>;

export type StageView = Readonly<{
  stage: StageName;
  executionState: ExecutionState;
  outcome?: CommonOutcome;
  errorCode?: string;
}>;

export type ProgressPanelProps = Readonly<{
  /** "File A", "File B", or "Provenance Delta" in a comparison session. */
  title?: string;
  /** Overrides the heading when the stage is not a single-file analysis. */
  heading?: string;
  /** Overrides the size/validation note under the heading. */
  note?: string;
  /** Null until intake validation succeeded (PRD 5.2). */
  displayName: string | null;
  byteSize: number | null;
  stages: readonly StageView[];
  cancelling: boolean;
  onCancel: () => void;
  showCancel?: boolean;
  idPrefix?: string;
}>;

function currentStatus(stages: readonly StageView[]): string {
  const running = stages.find((stage) => stage.executionState === 'running');

  if (running !== undefined) {
    return `Running: ${CHECK_LABELS[running.stage]}.`;
  }

  const queued = stages.find((stage) => stage.executionState === 'queued');

  if (queued !== undefined) {
    return `Queued: ${CHECK_LABELS[queued.stage]}.`;
  }

  return 'All recorded checks have finished.';
}

export function ProgressPanel({
  title,
  heading,
  note,
  displayName,
  byteSize,
  stages,
  cancelling,
  onCancel,
  showCancel = true,
  idPrefix = '',
}: ProgressPanelProps) {
  return (
    <section
      className="panel"
      aria-labelledby={`${idPrefix}progress-heading`}
      data-testid={`${idPrefix}progress-panel`}
    >
      {title === undefined ? null : (
        <p className="eyebrow" data-testid={`${idPrefix}progress-title`}>
          {title}
        </p>
      )}
      <h2 id={`${idPrefix}progress-heading`}>
        {heading ??
          (displayName === null ? 'Validating the selected file' : `Checking ${displayName}`)}
      </h2>
      {note !== undefined ? (
        <p className="note">{note}</p>
      ) : byteSize === null ? (
        <p className="note">
          Size, format, signature, and pixel budget are verified before any other check runs.
        </p>
      ) : (
        <p className="note">{formatByteSize(byteSize)}</p>
      )}

      <p role="status" aria-live="polite" data-testid={`${idPrefix}progress-status`}>
        {cancelling ? 'Cancelling the remaining checks.' : currentStatus(stages)}
      </p>

      <ol className="stage-list">
        {stages.map((stage) => (
          <li key={stage.stage} data-testid={`${idPrefix}stage-${stage.stage}`}>
            <span className="stage-name">{CHECK_LABELS[stage.stage]}</span>
            <span className="stage-state" data-execution-state={stage.executionState}>
              {EXECUTION_STATE_LABELS[stage.executionState]}
            </span>
            <span className="stage-outcome">
              {stage.outcome === undefined ? '' : OUTCOME_LABELS[stage.outcome]}
            </span>
            {stage.errorCode === undefined ? null : (
              <span className="stage-code">{stage.errorCode}</span>
            )}
          </li>
        ))}
      </ol>

      <p className="note">
        Execution state says whether a check ran and how it ended. The finding is a separate result
        and appears only after the check completes. No percentage is shown because no check reports
        measurable progress.
      </p>

      {showCancel ? (
        <button type="button" onClick={onCancel} disabled={cancelling} data-testid="cancel-button">
          {cancelling ? 'Cancelling…' : 'Cancel remaining checks'}
        </button>
      ) : null}
    </section>
  );
}
