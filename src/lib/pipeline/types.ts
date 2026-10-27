import type { C2paInspection } from '@/lib/c2pa/types';
import type { ImageDimensions } from '@/lib/intake/preflight';
import type { SupportedMimeType } from '@/lib/intake/format';
import type { MetadataInspection } from '@/lib/metadata/inspect';
import type { IdPrefix } from '@/lib/results/ids';
import type {
  CheckKind,
  CheckResult,
  CommonOutcome,
  C2paFinding,
  EvidenceItem,
  ExecutionState,
  FileRecord,
  SummaryCode,
} from '@/lib/results/schemas';
import type { SafeError } from '@/lib/security/errors';
import type { PipelineError } from './errors';

/**
 * Contract for the local, browser-first analysis of one image. Every external
 * effect is injected so the orchestration can be exercised deterministically
 * in the Node test process without a browser, a decoder, or the real SDK.
 */

/** The stages a single file moves through, in execution order. */
export const PIPELINE_STAGES = ['intake', 'fingerprint', 'metadata', 'c2pa'] as const;

export type PipelineStage = Extract<CheckKind, (typeof PIPELINE_STAGES)[number]>;

/**
 * A real progress event. `executionState` answers "did the check run, and how
 * did it end"; `outcome` is the check-specific finding and is only present
 * once the check completed. There is deliberately no percentage: no stage
 * exposes measurable progress, so none is invented.
 */
export type StageEvent = Readonly<{
  stage: PipelineStage;
  executionState: ExecutionState;
  outcome?: CommonOutcome;
  errorCode?: string;
}>;

export type DecodeOutcome =
  | Readonly<{ ok: true; dimensions: ImageDimensions }>
  | Readonly<{ ok: false; code: 'PIPELINE_DECODE_FAILED' | 'PIPELINE_DECODE_TIMEOUT' }>;

export type AnalyzeDependencies = Readonly<{
  /** Reads only the bounded header used for signature detection. */
  readHeader: (file: File) => Promise<Uint8Array>;
  /** Decodes the image far enough to establish dimensions. */
  decodeDimensions: (file: File) => Promise<DecodeOutcome>;
  /** Reads the original uploaded bytes exactly once. */
  readBytes: (file: File) => Promise<ArrayBuffer>;
  /** SHA-256 over the exact original bytes. */
  sha256: (bytes: ArrayBuffer) => Promise<string>;
  inspectMetadata: (bytes: ArrayBuffer) => MetadataInspection;
  inspectC2pa: (input: {
    file: File;
    format: SupportedMimeType;
    signal: AbortSignal;
  }) => Promise<C2paInspection>;
  createId: (prefix: IdPrefix) => string;
  now: () => Date;
}>;

export type AnalyzeInput = Readonly<{
  file: File;
  signal: AbortSignal;
  onStage?: (event: StageEvent) => void;
}>;

/** Recorded so a decoder change is visible in an exported report. */
export const DECODE_PIPELINE_VERSION = 'originlens-browser-decode/1';

export type FileAnalysis = Readonly<{
  file: FileRecord;
  checks: readonly CheckResult[];
  finding: C2paFinding | null;
  /** Canonical evidence list; every check-local item appears here too. */
  evidence: readonly EvidenceItem[];
  /** Typed metadata view used for display; null when the check never ran. */
  metadata: MetadataInspection | null;
  summaryCodes: readonly SummaryCode[];
  /** Deterministic, template-generated prose derived only from typed results. */
  explanation: string;
  /**
   * True when the user cancelled after the intake check completed. The
   * ledger then shows completed work plus skipped/cancelled checks, so
   * incomplete coverage stays visible instead of looking like a failure.
   */
  cancelled: boolean;
}>;

/** Errors the UI can show without exposing internals. */
export type DisplayError = SafeError | PipelineError;

export type AnalysisResult =
  | Readonly<{ status: 'ok'; analysis: FileAnalysis }>
  | Readonly<{ status: 'error'; error: DisplayError }>
  | Readonly<{ status: 'cancelled' }>;
