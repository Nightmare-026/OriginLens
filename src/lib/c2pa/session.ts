import { C2PA_STAGE_TIMEOUT_MS } from '@/lib/security/limits';
import type { C2paErrorCode } from '@/lib/security/errors';
import { C2PA_WASM_PATH } from './asset';
import { mapManifestStore } from './map';
import {
  C2PA_SUPPORTED_FORMATS,
  type C2paInspection,
  type C2paModuleLike,
  type C2paReaderLike,
  type C2paRuntimeLike,
  type C2paSupportedFormat,
} from './types';

/**
 * Owns one C2PA runtime for the lifetime of a session.
 *
 * - The WebAssembly runtime is created lazily and reused; a failed creation is
 *   not cached, so a later attempt can recover.
 * - Every inspection has an explicit time budget and honours an external abort
 *   signal.
 * - A reader is released in a `finally` path after success and after every
 *   exception, including a reader that only resolves after the inspection was
 *   abandoned.
 * - Disposal means "cancelled": the check reports no result rather than a
 *   failure about the image.
 */

const ABORTED = Symbol('c2pa-inspection-aborted');

type InspectionStage = 'runtime' | 'read' | 'store';

export type C2paInspectInput = Readonly<{
  file: Blob;
  format: C2paSupportedFormat;
  signal?: AbortSignal;
}>;

export type C2paSessionOptions = Readonly<{
  module: C2paModuleLike;
  wasmSrc?: string;
  timeoutMs?: number;
}>;

async function freeQuietly(reader: C2paReaderLike): Promise<void> {
  try {
    await reader.free();
  } catch {
    // A cleanup failure must not replace the inspection outcome.
  }
}

const STAGE_ERROR_CODES: Readonly<Record<InspectionStage, C2paErrorCode>> = {
  runtime: 'C2PA_RUNTIME_UNAVAILABLE',
  read: 'C2PA_READ_FAILED',
  store: 'C2PA_STORE_READ_FAILED',
};

export class C2paSession {
  readonly #module: C2paModuleLike;
  readonly #wasmSrc: string;
  readonly #timeoutMs: number;
  #runtime: Promise<C2paRuntimeLike> | null = null;
  #disposed = false;

  constructor(options: C2paSessionOptions) {
    this.#module = options.module;
    this.#wasmSrc = options.wasmSrc ?? C2PA_WASM_PATH;
    this.#timeoutMs = options.timeoutMs ?? C2PA_STAGE_TIMEOUT_MS;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  async inspect(input: C2paInspectInput): Promise<C2paInspection> {
    if (!C2PA_SUPPORTED_FORMATS.includes(input.format)) {
      return { status: 'unsupported' };
    }

    if (this.#disposed || input.signal?.aborted === true) {
      return { status: 'cancelled' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    const onExternalAbort = () => controller.abort();
    // Read through a call so TypeScript does not freeze the initial abort state.
    const externallyAborted = () => input.signal?.aborted === true;

    input.signal?.addEventListener('abort', onExternalAbort, { once: true });

    const ownedReaders: C2paReaderLike[] = [];
    let settled = false;
    let stage: InspectionStage = 'runtime';

    const aborted = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(ABORTED), { once: true });
    });

    try {
      const runtime = await Promise.race([this.#getRuntime(), aborted]);

      if (this.#disposed) {
        return { status: 'cancelled' };
      }

      stage = 'read';

      const readPromise = this.#module.Reader.fromBlob(runtime, input.format, input.file).then(
        (created) => {
          if (created === null) {
            return null;
          }

          if (settled) {
            // The inspection was abandoned first; release the late reader here
            // because the `finally` path has already run.
            void freeQuietly(created);

            return null;
          }

          ownedReaders.push(created);

          return created;
        },
      );

      const reader = await Promise.race([readPromise, aborted]);

      if (reader === null) {
        return { status: 'not_present' };
      }

      stage = 'store';

      const raw = await Promise.race([reader.manifestStore(), aborted]);

      if (this.#disposed) {
        return { status: 'cancelled' };
      }

      const store = mapManifestStore(raw);

      if (store === null) {
        return { status: 'failed', errorCode: 'C2PA_STORE_READ_FAILED' };
      }

      return { status: 'present', store };
    } catch (error) {
      if (error === ABORTED) {
        return externallyAborted() ? { status: 'cancelled' } : { status: 'timed_out' };
      }

      if (this.#disposed) {
        return { status: 'cancelled' };
      }

      return { status: 'failed', errorCode: STAGE_ERROR_CODES[stage] };
    } finally {
      settled = true;
      clearTimeout(timer);
      input.signal?.removeEventListener('abort', onExternalAbort);

      for (const reader of ownedReaders) {
        await freeQuietly(reader);
      }
    }
  }

  async dispose(): Promise<void> {
    this.#disposed = true;

    const pending = this.#runtime;
    this.#runtime = null;

    if (pending === null) {
      return;
    }

    try {
      const runtime = await pending;
      runtime.dispose();
    } catch {
      // Creation never completed, so there is no runtime to release.
    }
  }

  async #getRuntime(): Promise<C2paRuntimeLike> {
    if (this.#disposed) {
      throw new Error('C2PA session is disposed');
    }

    const existing = this.#runtime;

    if (existing !== null) {
      return existing;
    }

    const pending = this.#module.createC2pa({ wasmSrc: this.#wasmSrc });
    this.#runtime = pending;

    // Never keep a rejected creation cached: a transient WASM failure must be
    // retryable without rebuilding the session.
    void pending.catch(() => {
      if (this.#runtime === pending) {
        this.#runtime = null;
      }
    });

    return pending;
  }
}
