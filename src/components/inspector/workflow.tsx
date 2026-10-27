'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { C2paSession } from '@/lib/c2pa/session';
import { c2paModule } from '@/lib/c2pa/sdk';
import { sanitizeDisplayName } from '@/lib/intake/preflight';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import { createBrowserDependencies } from '@/lib/pipeline/browser';
import { pipelineError } from '@/lib/pipeline/errors';
import type {
  DisplayError,
  FileAnalysis,
  StageEvent,
} from '@/lib/pipeline/types';
import { buildReport, reportFileName } from '@/lib/report/build';
import { createId } from '@/lib/results/ids';
import { EvidenceLedger } from './ledger';
import { STAGE_ORDER } from './labels';
import { ProgressPanel, type StageView } from './progress-panel';
import { StartScreen } from './start-screen';

/**
 * Owns one browser session: at most one analysis at a time, one C2PA runtime,
 * and a run token that keeps a stale or cancelled result from being attached
 * to a newer file. Media is never persisted; clearing releases the runtime.
 */

type SessionState =
  | Readonly<{ kind: 'idle'; notice?: string; error: DisplayError | null }>
  | Readonly<{
      kind: 'running';
      displayName: string;
      byteSize: number;
      stages: readonly StageView[];
      cancelling: boolean;
    }>
  | Readonly<{ kind: 'ready'; analysis: FileAnalysis; downloadError: string | null }>;

function initialStages(): StageView[] {
  return STAGE_ORDER.map((stage) => ({ stage, executionState: 'queued' as const }));
}

function applyStageEvent(stages: readonly StageView[], event: StageEvent): StageView[] {
  return stages.map((stage) => (stage.stage === event.stage ? { ...stage, ...event } : stage));
}

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

  const inspect = useCallback(
    async (file: File): Promise<void> => {
      runTokenRef.current += 1;
      const token = runTokenRef.current;

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;

      setState({
        kind: 'running',
        displayName: sanitizeDisplayName(file.name),
        byteSize: file.size,
        stages: initialStages(),
        cancelling: false,
      });

      const result = await runFileAnalysis(
        {
          file,
          signal: controller.signal,
          onStage: (event) => {
            if (runTokenRef.current !== token) {
              return;
            }

            setState((previous) =>
              previous.kind === 'running'
                ? { ...previous, stages: applyStageEvent(previous.stages, event) }
                : previous,
            );
          },
        },
        createBrowserDependencies(getSession()),
      ).catch(() => ({
        status: 'error' as const,
        error: pipelineError('PIPELINE_CONTRACT_VIOLATION'),
      }));

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
    [getSession],
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
    if (state.kind !== 'ready') {
      return;
    }

    const result = buildReport({
      analyses: [state.analysis],
      now: new Date(),
      createId,
    });

    if (result.status === 'error') {
      setState({ ...state, downloadError: result.error.message });

      return;
    }

    let objectUrl: string | null = null;

    try {
      const blob = new Blob([result.json], { type: 'application/json' });

      objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');

      anchor.href = objectUrl;
      anchor.download = reportFileName(result.report);
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setState({ ...state, downloadError: null });
    } catch {
      setState({
        ...state,
        downloadError:
          'The report could not be prepared for download. The on-screen result is unchanged, and you can retry.',
      });
    } finally {
      if (objectUrl !== null) {
        const url = objectUrl;

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
    }
  }, [state]);

  const intakeValidated =
    state.kind === 'running' &&
    state.stages.find((stage) => stage.stage === 'intake')?.executionState === 'completed';

  return (
    <main className="page">
      {state.kind === 'idle' ? (
        <StartScreen onFile={(file) => void inspect(file)} error={state.error} notice={state.notice} />
      ) : null}

      {state.kind === 'running' ? (
        <>
          <p className="eyebrow">OriginLens</p>
          <ProgressPanel
            displayName={intakeValidated ? state.displayName : null}
            byteSize={intakeValidated ? state.byteSize : null}
            stages={state.stages}
            cancelling={state.cancelling}
            onCancel={cancel}
          />
        </>
      ) : null}

      {state.kind === 'ready' ? (
        <EvidenceLedger
          analysis={state.analysis}
          downloadError={state.downloadError}
          onDownload={download}
          onClear={() => reset('Session cleared. The analysis and the credential runtime were released.')}
          onInspectAnother={() =>
            reset('The previous analysis was discarded. Select another image to begin.')
          }
        />
      ) : null}
    </main>
  );
}
