'use client';

import { useEffect, useRef, useState } from 'react';
import { C2PA_WASM_PATH } from '@/lib/c2pa/asset';
import { buildC2paResult } from '@/lib/c2pa/check';
import { c2paModule } from '@/lib/c2pa/sdk';
import { C2paSession } from '@/lib/c2pa/session';
import { createId } from '@/lib/results/ids';
import {
  collectDanglingC2paEvidenceRefs,
  type C2paFinding,
  type CheckResult,
} from '@/lib/results/schemas';

/**
 * Developer-only harness for the real pinned C2PA SDK. It exercises the same
 * session, mapping, and check builders the product uses and prints the raw
 * contract output so lifecycle behaviour can be verified in a real browser.
 *
 * It is not part of the product workflow and displays no product result.
 */

// Derived from the pinned path so a version bump cannot leave the simulation
// silently pointing at a real asset.
const MISSING_WASM_SRC = `${C2PA_WASM_PATH}.missing`;

type SmokeReport = Readonly<{
  runCount: number;
  inspectionStatus: string;
  check: CheckResult;
  finding: C2paFinding | null;
  danglingEvidenceRefs: string[];
}>;

type PageState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'running' }>
  | Readonly<{ kind: 'error'; message: string }>
  | Readonly<{ kind: 'done'; report: SmokeReport }>;

export function C2paSmokeClient() {
  const sessionRef = useRef<C2paSession | null>(null);
  const runCountRef = useRef(0);
  const [useMissingWasm, setUseMissingWasm] = useState(false);
  const [state, setState] = useState<PageState>({ kind: 'idle' });

  useEffect(() => {
    return () => {
      const session = sessionRef.current;

      sessionRef.current = null;
      void session?.dispose();
    };
  }, []);

  function getSession(): C2paSession {
    const current = sessionRef.current;

    if (current !== null) {
      return current;
    }

    const session = new C2paSession({
      module: c2paModule,
      ...(useMissingWasm ? { wasmSrc: MISSING_WASM_SRC } : {}),
    });

    sessionRef.current = session;

    return session;
  }

  async function disposeSession(): Promise<void> {
    const session = sessionRef.current;

    sessionRef.current = null;
    runCountRef.current = 0;

    await session?.dispose();
  }

  async function run(file: File): Promise<void> {
    const format =
      file.type === 'image/png' ? 'image/png' : file.type === 'image/jpeg' ? 'image/jpeg' : null;

    if (format === null) {
      setState({ kind: 'error', message: 'Select a JPEG or PNG file.' });

      return;
    }

    setState({ kind: 'running' });

    const session = getSession();
    const checkId = createId('chk');
    const fileId = createId('file');
    const startedAtUtc = new Date().toISOString();
    const inspection = await session.inspect({ file, format });
    const finishedAtUtc = new Date().toISOString();
    const { check, finding } = buildC2paResult({
      checkId,
      fileId,
      startedAtUtc,
      finishedAtUtc,
      inspection,
    });

    runCountRef.current += 1;

    const danglingEvidenceRefs =
      finding === null
        ? []
        : collectDanglingC2paEvidenceRefs(
            finding,
            check.evidence.map((item) => item.evidenceId),
          );

    setState({
      kind: 'done',
      report: {
        runCount: runCountRef.current,
        inspectionStatus: inspection.status,
        check,
        finding,
        danglingEvidenceRefs,
      },
    });
  }

  async function clear(): Promise<void> {
    await disposeSession();
    setState({ kind: 'idle' });
  }

  return (
    <main className="page">
      <h1>C2PA smoke harness</h1>
      <p>
        Developer-only harness. It runs the real pinned <code>c2pa-web</code> session and prints the
        ledger contract. It is not the product interface and produces no user-facing verdict.
      </p>

      <p>
        <label>
          <input
            data-testid="smoke-missing-wasm"
            type="checkbox"
            checked={useMissingWasm}
            onChange={(event) => {
              const checked = event.currentTarget.checked;

              setUseMissingWasm(checked);
              void disposeSession();
              setState({ kind: 'idle' });
            }}
          />{' '}
          Simulate a missing WebAssembly asset (starts a new session pointing at a
          non-existent file)
        </label>
      </p>

      <p>
        <label htmlFor="smoke-file">Image file</label>{' '}
        <input
          id="smoke-file"
          data-testid="smoke-file"
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            if (file !== undefined) {
              void run(file);
            }

            event.currentTarget.value = '';
          }}
        />
      </p>

      <p>
        <button
          data-testid="smoke-clear"
          type="button"
          onClick={() => {
            void clear();
          }}
        >
          Clear session
        </button>
      </p>

      <p data-testid="smoke-status">
        {state.kind === 'idle' ? 'idle' : null}
        {state.kind === 'running' ? 'running' : null}
        {state.kind === 'error' ? `error: ${state.message}` : null}
        {state.kind === 'done'
          ? `done: ${state.report.inspectionStatus} / ${state.report.check.outcome ?? state.report.check.executionState}`
          : null}
      </p>

      <pre data-testid="smoke-json">
        {state.kind === 'done' ? JSON.stringify(state.report, null, 2) : ''}
      </pre>
    </main>
  );
}
