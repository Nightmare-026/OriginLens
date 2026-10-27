'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { C2paSession } from '@/lib/c2pa/session';
import { c2paModule } from '@/lib/c2pa/sdk';
import { buildComparison, type ComparisonOutput } from '@/lib/compare/build';
import { measurePreviewPair } from '@/lib/compare/browser';
import { sanitizeDisplayName } from '@/lib/intake/preflight';
import type { OrientationStatus } from '@/lib/metadata/inspect';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import { createBrowserDependencies } from '@/lib/pipeline/browser';
import { pipelineError } from '@/lib/pipeline/errors';
import type {
  AnalysisResult,
  DisplayError,
  FileAnalysis,
  StageEvent,
} from '@/lib/pipeline/types';
import { buildReport, reportFileName } from '@/lib/report/build';
import { createId } from '@/lib/results/ids';
import type { OriginLensReport } from '@/lib/results/schemas';
import { CompareScreen } from './compare-screen';
import { EvidenceLedger } from './ledger';
import { STAGE_ORDER } from './labels';
import { ProgressPanel, type StageView } from './progress-panel';
import { StartScreen } from './start-screen';

/**
 * Owns one browser session: at most one analysis at a time, one C2PA runtime,
 * and a run token that keeps a stale or cancelled result from being attached
 * to a newer session. Media is never persisted; clearing releases the runtime.
 *
 * A comparison runs the single-file pipeline twice and then records the delta.
 * Each file keeps its own panels and results, so a failure or cancellation on
 * the second file never erases the first file's completed evidence.
 */

type UserLabel = 'original' | 'edited';

type RunningPanel = Readonly<{
  key: string;
  title?: string;
  heading?: string;
  note?: string;
  displayName: string;
  byteSize: number;
  stages: readonly StageView[];
  cancelable: boolean;
}>;

type SessionState =
  | Readonly<{ kind: 'idle'; notice?: string; error: DisplayError | null }>
  | Readonly<{
      kind: 'running';
      mode: 'single' | 'compare';
      panels: readonly RunningPanel[];
      cancelling: boolean;
    }>
  | Readonly<{
      kind: 'ready';
      analysis: FileAnalysis;
      notice?: string;
      downloadError: string | null;
    }>
  | Readonly<{
      kind: 'readyCompare';
      first: FileAnalysis;
      second: FileAnalysis;
      comparison: Extract<ComparisonOutput, { status: 'ok' }>;
      labelFirst: UserLabel | null;
      labelSecond: UserLabel | null;
      downloadError: string | null;
    }>;

function initialStages(includeComparison = false): StageView[] {
  const stages: StageView[] = STAGE_ORDER.map((stage) => ({
    stage,
    executionState: 'queued' as const,
  }));

  return includeComparison
    ? [...stages, { stage: 'comparison', executionState: 'queued' as const }]
    : stages;
}

function applyStageEvent(stages: readonly StageView[], event: StageEvent): StageView[] {
  return stages.map((stage) => (stage.stage === event.stage ? { ...stage, ...event } : stage));
}

function updatePanel(
  panels: readonly RunningPanel[],
  key: string,
  update: (panel: RunningPanel) => RunningPanel,
): RunningPanel[] {
  return panels.map((panel) => (panel.key === key ? update(panel) : panel));
}

function freezePanels(panels: readonly RunningPanel[]): RunningPanel[] {
  return panels.map((panel) => (panel.cancelable ? { ...panel, cancelable: false } : panel));
}

function intakeCompleted(panel: RunningPanel): boolean {
  return panel.stages.find((stage) => stage.stage === 'intake')?.executionState === 'completed';
}

function orientationOf(analysis: FileAnalysis): OrientationStatus {
  return analysis.metadata?.orientationStatus ?? 'unknown';
}

/**
 * Applies the user's own original/edited label to a completed analysis. The
 * label is carried verbatim into the report and never feeds a check.
 */
function withUserLabel(analysis: FileAnalysis, label: UserLabel | null): FileAnalysis {
  if (label === null) {
    if (analysis.file.userLabel === undefined) {
      return analysis;
    }

    const file = { ...analysis.file };

    delete file.userLabel;

    return { ...analysis, file };
  }

  return { ...analysis, file: { ...analysis.file, userLabel: label } };
}

function saveReport(report: OriginLensReport, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = reportFileName(report);
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // The download has already started; revoking later keeps the URL valid.
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }
}

const DOWNLOAD_FAILURE =
  'The report could not be prepared for download. The on-screen result is unchanged, and you can retry.';

export function InspectorWorkflow() {
  const [state, setState] = useState<SessionState>({ kind: 'idle', error: null });
  const runTokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<C2paSession | null>(null);

  const disposeSession = useCallback(async (): Promise<void> => {
    const session = sessionRef.current;

    sessionRef.current = null;

    await session?.dispose();
  }, []);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;

      const session = sessionRef.current;

      sessionRef.current = null;
      void session?.dispose();
    };
  }, []);

  const getSession = useCallback((): C2paSession => {
    const existing = sessionRef.current;

    if (existing !== null) {
      return existing;
    }

    const created = new C2paSession({ module: c2paModule });

    sessionRef.current = created;

    return created;
  }, []);

  const analyze = useCallback(
    async (
      file: File,
      signal: AbortSignal,
      onStage: (event: StageEvent) => void,
    ): Promise<AnalysisResult> => {
      try {
        return await runFileAnalysis(
          { file, signal, onStage },
          createBrowserDependencies(getSession()),
        );
      } catch {
        return { status: 'error', error: pipelineError('PIPELINE_CONTRACT_VIOLATION') };
      }
    },
    [getSession],
  );

  const stageHandler = useCallback(
    (key: string, token: number) =>
      (event: StageEvent): void => {
        if (runTokenRef.current !== token) {
          return;
        }

        setState((previous) =>
          previous.kind === 'running'
            ? {
                ...previous,
                panels: updatePanel(previous.panels, key, (panel) => ({
                  ...panel,
                  stages: applyStageEvent(panel.stages, event),
                })),
              }
            : previous,
        );
      },
    [],
  );

  const inspect = useCallback(
    async (file: File): Promise<void> => {
      runTokenRef.current += 1;
      const token = runTokenRef.current;

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;

      setState({
        kind: 'running',
        mode: 'single',
        cancelling: false,
        panels: [
          {
            key: 'single',
            displayName: sanitizeDisplayName(file.name),
            byteSize: file.size,
            stages: initialStages(),
            cancelable: true,
          },
        ],
      });

      const result = await analyze(file, controller.signal, stageHandler('single', token));

      if (runTokenRef.current !== token) {
        return;
      }

      if (result.status === 'ok') {
        setState({ kind: 'ready', analysis: result.analysis, downloadError: null });

        return;
      }

      if (result.status === 'error') {
        setState({ kind: 'idle', error: result.error });

        return;
      }

      setState({
        kind: 'idle',
        error: null,
        notice:
          'The analysis was cancelled before a fingerprint was available, so no result was recorded.',
      });
    },
    [analyze, stageHandler],
  );

  const compare = useCallback(
    async (firstFile: File, secondFile: File): Promise<void> => {
      runTokenRef.current += 1;
      const token = runTokenRef.current;

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;

      setState({
        kind: 'running',
        mode: 'compare',
        cancelling: false,
        panels: [
          {
            key: 'a',
            title: 'File A',
            displayName: sanitizeDisplayName(firstFile.name),
            byteSize: firstFile.size,
            stages: initialStages(),
            cancelable: true,
          },
        ],
      });

      const first = await analyze(firstFile, controller.signal, stageHandler('a', token));

      if (runTokenRef.current !== token) {
        return;
      }

      if (first.status === 'error') {
        setState({ kind: 'idle', error: first.error });

        return;
      }

      if (first.status === 'cancelled') {
        setState({
          kind: 'idle',
          error: null,
          notice:
            'The comparison was cancelled before File A produced a fingerprint, so no comparison result was recorded.',
        });

        return;
      }

      if (first.analysis.cancelled) {
        setState({
          kind: 'ready',
          analysis: first.analysis,
          notice:
            "The comparison was cancelled during File A's checks. File A's completed evidence is shown below. File B was not analysed, and no Provenance Delta was produced.",
          downloadError: null,
        });

        return;
      }

      // File A is complete. Its panel stays visible while File B runs.
      setState((previous) =>
        previous.kind === 'running'
          ? {
              ...previous,
              panels: [
                ...freezePanels(previous.panels),
                {
                  key: 'b',
                  title: 'File B',
                  displayName: sanitizeDisplayName(secondFile.name),
                  byteSize: secondFile.size,
                  stages: initialStages(),
                  cancelable: true,
                },
              ],
            }
          : previous,
      );

      const second = await analyze(secondFile, controller.signal, stageHandler('b', token));

      if (runTokenRef.current !== token) {
        return;
      }

      if (second.status === 'error') {
        setState({
          kind: 'ready',
          analysis: first.analysis,
          notice: `File B could not be analysed (${second.error.code}). File A completed independently and is shown below. No Provenance Delta was produced, and File B contributes nothing to this result.`,
          downloadError: null,
        });

        return;
      }

      if (second.status === 'cancelled') {
        setState({
          kind: 'ready',
          analysis: first.analysis,
          notice:
            'The comparison was cancelled while File B was being analysed. File A completed independently and is shown below. No Provenance Delta was produced.',
          downloadError: null,
        });

        return;
      }

      setState((previous) =>
        previous.kind === 'running'
          ? {
              ...previous,
              panels: [
                ...freezePanels(previous.panels),
                {
                  key: 'delta',
                  title: 'Provenance Delta',
                  heading: 'Comparing File A and File B',
                  note:
                    'Both files finished their own checks. The delta records only what those checks established.',
                  displayName: '',
                  byteSize: 0,
                  stages: initialStages(true),
                  cancelable: false,
                },
              ],
            }
          : previous,
      );

      const preview = await measurePreviewPair({
        firstFile,
        secondFile,
        first: first.analysis.file,
        second: second.analysis.file,
        firstOrientation: orientationOf(first.analysis),
        secondOrientation: orientationOf(second.analysis),
        signal: controller.signal,
      });

      if (runTokenRef.current !== token) {
        return;
      }

      if (preview.status === 'cancelled') {
        setState({
          kind: 'ready',
          analysis: first.analysis,
          notice:
            'The comparison was cancelled before the delta was recorded. File A completed independently and is shown below. No Provenance Delta was produced.',
          downloadError: null,
        });

        return;
      }

      const built = buildComparison({
        first: first.analysis,
        second: second.analysis,
        preview,
        createId,
        now: () => new Date(),
      });

      if (runTokenRef.current !== token) {
        return;
      }

      if (built.status === 'error') {
        setState({
          kind: 'idle',
          error: null,
          notice: `Both files were analysed, but the combined result could not be recorded (${built.error.code}). No comparison result or two-file report is available. Select both files again to retry.`,
        });

        return;
      }

      setState((previous) =>
        previous.kind === 'running'
          ? {
              kind: 'readyCompare',
              first: first.analysis,
              second: second.analysis,
              comparison: built,
              labelFirst: null,
              labelSecond: null,
              downloadError: null,
            }
          : previous,
      );
    },
    [analyze, stageHandler],
  );

  const cancel = useCallback((): void => {
    setState((previous) =>
      previous.kind === 'running' ? { ...previous, cancelling: true } : previous,
    );
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(
    (notice: string): void => {
      runTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setState({ kind: 'idle', error: null, notice });
      void disposeSession();
    },
    [disposeSession],
  );

  const download = useCallback((): void => {
    if (state.kind === 'ready') {
      const result = buildReport({
        analyses: [state.analysis],
        now: new Date(),
        createId,
      });

      if (result.status === 'error') {
        setState({ ...state, downloadError: result.error.message });

        return;
      }

      try {
        saveReport(result.report, result.json);
        setState({ ...state, downloadError: null });
      } catch {
        setState({ ...state, downloadError: DOWNLOAD_FAILURE });
      }

      return;
    }

    if (state.kind === 'readyCompare') {
      const result = buildReport({
        analyses: [
          withUserLabel(state.first, state.labelFirst),
          withUserLabel(state.second, state.labelSecond),
        ],
        comparison: state.comparison,
        now: new Date(),
        createId,
      });

      if (result.status === 'error') {
        setState({ ...state, downloadError: result.error.message });

        return;
      }

      try {
        saveReport(result.report, result.json);
        setState({ ...state, downloadError: null });
      } catch {
        setState({ ...state, downloadError: DOWNLOAD_FAILURE });
      }
    }
  }, [state]);

  return (
    <main
      className={
        state.kind === 'readyCompare' || (state.kind === 'running' && state.mode === 'compare')
          ? 'page page-compare'
          : 'page'
      }
    >
      {state.kind === 'idle' ? (
        <StartScreen
          onFile={(file) => void inspect(file)}
          onCompare={(first, second) => void compare(first, second)}
          error={state.error}
          notice={state.notice}
        />
      ) : null}

      {state.kind === 'running' ? (
        <>
          <p className="eyebrow">OriginLens</p>
          {state.mode === 'compare' ? (
            <p className="lede">
              Each file is analysed on its own. A result for File A survives a failure or
              cancellation on File B.
            </p>
          ) : null}
          {state.panels.map((panel) => (
            <ProgressPanel
              key={panel.key}
              title={panel.title}
              heading={panel.heading}
              note={panel.note}
              displayName={intakeCompleted(panel) ? panel.displayName : null}
              byteSize={panel.byteSize}
              stages={panel.stages}
              cancelling={state.cancelling}
              onCancel={cancel}
              showCancel={panel.cancelable}
              idPrefix={panel.key === 'single' ? '' : `${panel.key}-`}
            />
          ))}
        </>
      ) : null}

      {state.kind === 'ready' ? (
        <EvidenceLedger
          analysis={state.analysis}
          notice={state.notice}
          downloadError={state.downloadError}
          onDownload={download}
          onClear={() =>
            reset('Session cleared. The analysis and the credential runtime were released.')
          }
          onInspectAnother={() =>
            reset('The previous analysis was discarded. Select another image to begin.')
          }
        />
      ) : null}

      {state.kind === 'readyCompare' ? (
        <CompareScreen
          first={withUserLabel(state.first, state.labelFirst)}
          second={withUserLabel(state.second, state.labelSecond)}
          comparison={state.comparison.comparison}
          check={state.comparison.check}
          downloadError={state.downloadError}
          onDownload={download}
          onClear={() =>
            reset('Session cleared. Both analyses and the credential runtime were released.')
          }
          onInspectAnother={() =>
            reset('The previous comparison was discarded. Select two images to begin.')
          }
          onLabelFirst={(label) =>
            setState((previous) =>
              previous.kind === 'readyCompare' ? { ...previous, labelFirst: label } : previous,
            )
          }
          onLabelSecond={(label) =>
            setState((previous) =>
              previous.kind === 'readyCompare' ? { ...previous, labelSecond: label } : previous,
            )
          }
        />
      ) : null}
    </main>
  );
}
