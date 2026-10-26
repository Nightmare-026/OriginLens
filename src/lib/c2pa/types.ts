import type { C2paErrorCode } from '@/lib/security/errors';

/**
 * Adapter-facing shapes for the pinned C2PA SDK. The SDK returns a large,
 * evolving JSON document; this module deliberately keeps only the fields the
 * Evidence Ledger can justify showing. Everything here is derived from
 * untrusted file content and is bounded by the mapper before it reaches a
 * domain model.
 */

export type C2paSupportedFormat = 'image/jpeg' | 'image/png';

export const C2PA_SUPPORTED_FORMATS: readonly C2paSupportedFormat[] = [
  'image/jpeg',
  'image/png',
];

export type C2paStatusCodeGroup = 'success' | 'informational' | 'failure';

export type C2paStatusEntry = Readonly<{
  /** Bounded, sanitized status code exactly as the SDK reported it. */
  code: string;
  group: C2paStatusCodeGroup;
  /** Sanitized SDK explanation. Never rendered as HTML. */
  explanation: string | null;
  /** Sanitized manifest label or assertion reference the status applies to. */
  url: string | null;
}>;

export type C2paRecordedAction = Readonly<{
  /** Bounded action code recorded in the manifest, e.g. `c2pa.created`. */
  actionCode: string;
}>;

export type C2paRecordedIngredient = Readonly<{
  relationship: string | null;
  title: string | null;
}>;

export type MappedC2paStore = Readonly<{
  /** The SDK's own `validation_state` string, bounded, or null when absent. */
  validationState: string | null;
  statusEntries: readonly C2paStatusEntry[];
  claimGenerator: string | null;
  title: string | null;
  format: string | null;
  /** Null when the store's active manifest could not be identified. */
  activeManifestLabel: string | null;
  actions: readonly C2paRecordedAction[];
  ingredients: readonly C2paRecordedIngredient[];
  /** Entries dropped because of bounded budgets. Reported, never silently lost. */
  omittedEntryCount: number;
}>;

/**
 * The outcome of one inspection attempt. Only `present` carries manifest data.
 * `unsupported`, `cancelled` and `timed_out` are execution facts, never
 * findings about the image.
 */
export type C2paInspection =
  | Readonly<{ status: 'present'; store: MappedC2paStore }>
  | Readonly<{ status: 'not_present' }>
  | Readonly<{ status: 'unsupported' }>
  | Readonly<{ status: 'failed'; errorCode: C2paErrorCode }>
  | Readonly<{ status: 'cancelled' }>
  | Readonly<{ status: 'timed_out' }>;

/**
 * The minimum surface the session needs from the SDK. Keeping it structural
 * lets unit tests drive the lifecycle with fakes while the real SDK is loaded
 * only in `sdk.ts`, which never runs in the Node test process.
 */
export type C2paReaderLike = Readonly<{
  manifestStore(): Promise<unknown>;
  free(): Promise<void>;
}>;

export type C2paRuntimeLike = Readonly<{
  dispose(): void;
}>;

export type C2paModuleLike = Readonly<{
  createC2pa(config: Readonly<{ wasmSrc: string }>): Promise<C2paRuntimeLike>;
  Reader: Readonly<{
    fromBlob(
      runtime: C2paRuntimeLike,
      format: string,
      blob: Blob,
    ): Promise<C2paReaderLike | null>;
  }>;
}>;
