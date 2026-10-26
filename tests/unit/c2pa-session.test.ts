import { describe, expect, it } from 'vitest';
import { C2paSession } from '@/lib/c2pa/session';
import type { C2paModuleLike, C2paReaderLike, C2paRuntimeLike } from '@/lib/c2pa/types';

/**
 * Lifecycle coverage for V22 (runtime unavailable), V23 (cleanup after
 * success), and V24 (cleanup after an exception). The SDK is replaced by fakes
 * so every cleanup path is observable and the WASM/worker code never loads in
 * the Node test process.
 */

const BLOB = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

type FakeReader = C2paReaderLike & Readonly<{ freeCount: () => number }>;

function makeReader(store: unknown): FakeReader {
  let frees = 0;

  return {
    manifestStore: () => Promise.resolve(store),
    free: () => {
      frees += 1;

      return Promise.resolve();
    },
    freeCount: () => frees,
  };
}

type Harness = Readonly<{
  sdk: C2paModuleLike;
  readers: FakeReader[];
  createCalls: () => number;
  disposeCalls: () => number;
}>;

function makeHarness(
  options: Readonly<{
    store?: unknown;
    fromBlob?: (format: string, blob: Blob) => Promise<C2paReaderLike | null>;
    createRuntime?: () => Promise<C2paRuntimeLike>;
  }> = {},
): Harness {
  const readers: FakeReader[] = [];
  let createCalls = 0;
  let disposeCalls = 0;

  const runtime: C2paRuntimeLike = {
    dispose: () => {
      disposeCalls += 1;
    },
  };

  const fakeModule: C2paModuleLike = {
    createC2pa: async () => {
      createCalls += 1;

      if (options.createRuntime !== undefined) {
        return options.createRuntime();
      }

      return runtime;
    },
    Reader: {
      fromBlob: async (receivedRuntime, format, blob) => {
        void receivedRuntime;

        if (options.fromBlob !== undefined) {
          return options.fromBlob(format, blob);
        }

        const reader = makeReader(options.store ?? { validation_state: 'Valid' });
        readers.push(reader);

        return reader;
      },
    },
  };

  return {
    sdk: fakeModule,
    readers,
    createCalls: () => createCalls,
    disposeCalls: () => disposeCalls,
  };
}

describe('C2PA session lifecycle', () => {
  it('reads a manifest, maps it, and frees the reader after success', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result.status).toBe('present');
    expect(harness.readers).toHaveLength(1);
    expect(harness.readers[0]?.freeCount()).toBe(1);
    expect(harness.createCalls()).toBe(1);
    expect(harness.disposeCalls()).toBe(0);

    await session.dispose();

    expect(harness.disposeCalls()).toBe(1);
  });

  it('passes the validated format and the original blob to the SDK', async () => {
    let receivedFormat = '';
    let receivedBlob: Blob | null = null;
    const harness = makeHarness({
      fromBlob: async (format, blob) => {
        receivedFormat = format;
        receivedBlob = blob;

        return makeReader({ validation_state: 'Valid' });
      },
    });
    const session = new C2paSession({ module: harness.sdk });

    await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(receivedFormat).toBe('image/jpeg');
    expect(receivedBlob).toBe(BLOB);
  });

  it('reuses one runtime across inspections and frees every reader', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });

    await session.inspect({ file: BLOB, format: 'image/jpeg' });
    await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(harness.createCalls()).toBe(1);
    expect(harness.readers).toHaveLength(2);
    expect(harness.readers.every((reader) => reader.freeCount() === 1)).toBe(true);

    await session.dispose();
  });

  it('reports no manifest without inventing a finding', async () => {
    const harness = makeHarness({ fromBlob: async () => null });
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result).toEqual({ status: 'not_present' });
    expect(harness.disposeCalls()).toBe(0);
  });

  it('returns unsupported for a format outside the C2PA scope without starting the SDK', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({
      file: BLOB,
      // A caller cannot reach this branch through the typed API; the runtime
      // guard still matters for untyped callers.
      // @ts-expect-error Deliberately outside the supported format union.
      format: 'image/gif',
    });

    expect(result).toEqual({ status: 'unsupported' });
    expect(harness.createCalls()).toBe(0);
  });

  it('frees the reader when reading the manifest store throws (V24)', async () => {
    let frees = 0;
    const tracked: C2paReaderLike = {
      manifestStore: () => Promise.reject(new Error('store boom')),
      free: () => {
        frees += 1;

        return Promise.resolve();
      },
    };
    const harness = makeHarness({ fromBlob: async () => tracked });
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result).toEqual({ status: 'failed', errorCode: 'C2PA_STORE_READ_FAILED' });
    expect(frees).toBe(1);
  });

  it('reports a read failure when the SDK rejects the asset', async () => {
    const harness = makeHarness({
      fromBlob: () => Promise.reject(new Error('invalid asset')),
    });
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result).toEqual({ status: 'failed', errorCode: 'C2PA_READ_FAILED' });
    expect(harness.readers).toHaveLength(0);
  });

  it('surfaces an unavailable runtime once and recovers on retry (V22)', async () => {
    let attempts = 0;
    const harness = makeHarness({
      createRuntime: async () => {
        attempts += 1;

        if (attempts === 1) {
          throw new Error('wasm missing');
        }

        return { dispose: () => undefined };
      },
    });
    const session = new C2paSession({ module: harness.sdk });

    const first = await session.inspect({ file: BLOB, format: 'image/jpeg' });
    const second = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(first).toEqual({ status: 'failed', errorCode: 'C2PA_RUNTIME_UNAVAILABLE' });
    expect(second.status).toBe('present');
    expect(attempts).toBe(2);
  });

  it('fails closed when the SDK returns an unreadable store', async () => {
    const harness = makeHarness({ store: 'not-a-store' });
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result).toEqual({ status: 'failed', errorCode: 'C2PA_STORE_READ_FAILED' });
  });

  it('keeps the outcome when cleanup itself throws', async () => {
    const reader: C2paReaderLike = {
      manifestStore: () => Promise.resolve({ validation_state: 'Valid' }),
      free: () => Promise.reject(new Error('double free')),
    };
    const harness = makeHarness({ fromBlob: async () => reader });
    const session = new C2paSession({ module: harness.sdk });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result.status).toBe('present');
  });

  it('times out and still frees a reader that arrives afterwards', async () => {
    const late = deferred<C2paReaderLike | null>();
    let frees = 0;
    const lateReader: C2paReaderLike = {
      manifestStore: () => Promise.resolve({ validation_state: 'Valid' }),
      free: () => {
        frees += 1;

        return Promise.resolve();
      },
    };
    const harness = makeHarness({ fromBlob: () => late.promise });
    const session = new C2paSession({ module: harness.sdk, timeoutMs: 25 });

    const result = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(result).toEqual({ status: 'timed_out' });

    late.resolve(lateReader);
    await tick();

    expect(frees).toBe(1);
  });

  it('cancels through an external signal and releases the late reader', async () => {
    const readStarted = deferred<void>();
    const late = deferred<C2paReaderLike | null>();
    let frees = 0;
    const lateReader: C2paReaderLike = {
      manifestStore: () => Promise.resolve({ validation_state: 'Valid' }),
      free: () => {
        frees += 1;

        return Promise.resolve();
      },
    };
    const harness = makeHarness({
      fromBlob: () => {
        readStarted.resolve();

        return late.promise;
      },
    });
    const session = new C2paSession({ module: harness.sdk });
    const controller = new AbortController();

    const inspection = session.inspect({
      file: BLOB,
      format: 'image/jpeg',
      signal: controller.signal,
    });

    await readStarted.promise;
    controller.abort();

    expect(await inspection).toEqual({ status: 'cancelled' });

    late.resolve(lateReader);
    await tick();

    expect(frees).toBe(1);

    await session.dispose();
  });

  it('does not start the SDK when the signal is already aborted', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });
    const controller = new AbortController();

    controller.abort();

    const result = await session.inspect({
      file: BLOB,
      format: 'image/jpeg',
      signal: controller.signal,
    });

    expect(result).toEqual({ status: 'cancelled' });
    expect(harness.createCalls()).toBe(0);
  });

  it('treats disposal as cancellation and disposes the runtime once', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });

    await session.inspect({ file: BLOB, format: 'image/jpeg' });
    await session.dispose();
    await session.dispose();

    expect(harness.disposeCalls()).toBe(1);
    expect(session.disposed).toBe(true);

    const afterDispose = await session.inspect({ file: BLOB, format: 'image/jpeg' });

    expect(afterDispose).toEqual({ status: 'cancelled' });
    expect(harness.createCalls()).toBe(1);
  });

  it('disposes a runtime that finishes starting after disposal', async () => {
    const pending = deferred<C2paRuntimeLike>();
    let disposeCalls = 0;
    const harness = makeHarness({
      createRuntime: () => pending.promise,
    });
    const session = new C2paSession({ module: harness.sdk });

    const inspection = session.inspect({ file: BLOB, format: 'image/jpeg' });
    const disposal = session.dispose();

    pending.resolve({
      dispose: () => {
        disposeCalls += 1;
      },
    });

    expect(await inspection).toEqual({ status: 'cancelled' });
    await disposal;

    expect(disposeCalls).toBe(1);
  });

  it('frees each reader when two inspections overlap', async () => {
    const harness = makeHarness();
    const session = new C2paSession({ module: harness.sdk });

    const [first, second] = await Promise.all([
      session.inspect({ file: BLOB, format: 'image/jpeg' }),
      session.inspect({ file: BLOB, format: 'image/jpeg' }),
    ]);

    expect(first.status).toBe('present');
    expect(second.status).toBe('present');
    expect(harness.createCalls()).toBe(1);
    expect(harness.readers).toHaveLength(2);
    expect(harness.readers.every((reader) => reader.freeCount() === 1)).toBe(true);

    await session.dispose();
  });
});
