import { Reader, createC2pa, type C2pa } from '@contentauth/c2pa-web';
import type { C2paModuleLike } from './types';

/**
 * The only module that imports the third-party SDK. Tests exercise the session
 * and mapping logic with fakes, so the SDK is never evaluated in the Node test
 * process, and the WebAssembly/worker code is bundled only where a browser runs
 * it.
 *
 * `C2paRuntimeLike` is deliberately opaque. The handle passed to `fromBlob` is
 * the one produced by `createC2pa` moments earlier, so narrowing it back to the
 * SDK's own `C2pa` type is a local, documented seam rather than a general cast.
 */
export const c2paModule: C2paModuleLike = {
  createC2pa: (config) => createC2pa({ wasmSrc: config.wasmSrc }),
  Reader: {
    fromBlob: (runtime, format, blob) =>
      Reader.fromBlob(runtime as unknown as C2pa, format, blob),
  },
};
