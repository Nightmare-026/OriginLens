import type { C2paInspection, MappedC2paStore } from '@/lib/c2pa/types';
import {
  METADATA_LIMITATIONS,
  METADATA_PARSER,
  type MetadataInspection,
} from '@/lib/metadata/inspect';
import type {
  AnalyzeDependencies,
  DecodeOutcome,
  StageEvent,
} from '@/lib/pipeline/types';
import type { C2paErrorCode } from '@/lib/security/errors';

/**
 * Deterministic fakes for the Phase 5 orchestration tests. Nothing here touches
 * the network, WebAssembly, the real SDK, a canvas, or a browser image decoder.
 * Every dependency is recorded so a test can assert what actually ran, in the
 * order it ran, and with which input.
 */

export const BASE_TIME_MS = Date.parse('2026-10-27T12:00:00.000Z');
export const FIXED_SHA256 = '9f'.repeat(32);

/** A minimal byte sequence that passes the JPEG signature check. */
export function jpegBytes(size = 128): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);

  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  bytes.fill(0x20, 10);

  return bytes;
}

export function jpegFile(name = 'sample.jpg', size = 128): File {
  return new File([jpegBytes(size)], name, { type: 'image/jpeg' });
}

export function emptyMetadata(): MetadataInspection {
  return {
    status: 'not_present',
    fields: [],
    gpsPresence: 'not_present',
    parser: METADATA_PARSER,
    warnings: [],
    limitations: [...METADATA_LIMITATIONS],
  };
}

export function extractedMetadata(): MetadataInspection {
  return {
    status: 'extracted',
    fields: [
      {
        key: 'software',
        label: 'Software',
        value: 'Test Camera Firmware 1.0',
        valueType: 'text',
        authority: 'unverified_metadata',
      },
    ],
    gpsPresence: 'present',
    parser: METADATA_PARSER,
    warnings: [],
    limitations: [...METADATA_LIMITATIONS],
  };
}

export function failedMetadata(): MetadataInspection {
  return {
    status: 'failed',
    fields: [],
    gpsPresence: 'unknown',
    parser: METADATA_PARSER,
    warnings: ['Embedded metadata could not be parsed. Independent checks are unaffected.'],
    limitations: [...METADATA_LIMITATIONS],
    errorCode: 'METADATA_PARSE_FAILED',
  };
}

/** The recorded shape of the real verified fixture, mapped by the adapter. */
export function verifiedStore(): MappedC2paStore {
  return {
    validationState: 'Valid',
    statusEntries: [
      {
        code: 'timeStamp.validated',
        group: 'success',
        explanation: null,
        url: null,
      },
      {
        code: 'claimSignature.insideValidity',
        group: 'success',
        explanation: null,
        url: null,
      },
      {
        code: 'claimSignature.validated',
        group: 'success',
        explanation: null,
        url: null,
      },
      {
        code: 'assertion.hashedURI.match',
        group: 'success',
        explanation: null,
        url: null,
      },
      {
        code: 'assertion.dataHash.match',
        group: 'success',
        explanation: null,
        url: null,
      },
      {
        code: 'signingCredential.untrusted',
        group: 'failure',
        explanation: null,
        url: null,
      },
    ],
    claimGenerator: 'test-claim-generator',
    title: 'sample.jpg',
    format: 'image/jpeg',
    activeManifestLabel: 'urn:uuid:00000000-0000-4000-8000-000000000000',
    actions: [],
    ingredients: [],
    omittedEntryCount: 0,
  };
}

export function invalidStore(): MappedC2paStore {
  return {
    ...verifiedStore(),
    validationState: 'Invalid',
    statusEntries: [
      ...verifiedStore().statusEntries,
      {
        code: 'claimSignature.mismatch',
        group: 'failure',
        explanation: null,
        url: null,
      },
    ],
  };
}

export type HarnessOptions = Readonly<{
  /** Offset for deterministic identifiers, so two analyses get distinct IDs. */
  startId?: number;
  readHeader?: (file: File) => Promise<Uint8Array>;
  decodeDimensions?: (file: File) => Promise<DecodeOutcome>;
  readBytes?: (file: File) => Promise<ArrayBuffer>;
  sha256?: (bytes: ArrayBuffer) => Promise<string>;
  inspectMetadata?: (bytes: ArrayBuffer) => MetadataInspection;
  inspectC2pa?: (input: {
    file: File;
    format: 'image/jpeg' | 'image/png';
    signal: AbortSignal;
  }) => Promise<C2paInspection>;
}>;

export type Harness = Readonly<{
  deps: AnalyzeDependencies;
  controller: AbortController;
  events: StageEvent[];
  calls: string[];
  headerInputs: File[];
  byteInputs: File[];
  c2paInputs: { file: File; format: string }[];
}>;

/**
 * Builds the injected dependency set. `now` advances by 10 ms per call and
 * identifiers are sequential, so an assertion can never depend on wall-clock
 * timing or randomness.
 */
export function createHarness(options: HarnessOptions = {}): Harness {
  const controller = new AbortController();
  const events: StageEvent[] = [];
  const calls: string[] = [];
  const headerInputs: File[] = [];
  const byteInputs: File[] = [];
  const c2paInputs: { file: File; format: string }[] = [];

  let clock = 0;
  let ids = options.startId ?? 0;

  const deps: AnalyzeDependencies = {
    readHeader: async (file) => {
      calls.push('readHeader');
      headerInputs.push(file);

      return options.readHeader === undefined
        ? new Uint8Array(await file.slice(0, 16).arrayBuffer())
        : options.readHeader(file);
    },
    decodeDimensions: async (file) => {
      calls.push('decodeDimensions');

      return options.decodeDimensions === undefined
        ? { ok: true, dimensions: { width: 64, height: 48 } }
        : options.decodeDimensions(file);
    },
    readBytes: async (file) => {
      calls.push('readBytes');
      byteInputs.push(file);

      return options.readBytes === undefined ? file.arrayBuffer() : options.readBytes(file);
    },
    sha256: async (bytes) => {
      calls.push('sha256');

      return options.sha256 === undefined ? FIXED_SHA256 : options.sha256(bytes);
    },
    inspectMetadata: (bytes) => {
      calls.push('inspectMetadata');

      return options.inspectMetadata === undefined ? emptyMetadata() : options.inspectMetadata(bytes);
    },
    inspectC2pa: async (input) => {
      calls.push('inspectC2pa');
      c2paInputs.push({ file: input.file, format: input.format });

      return options.inspectC2pa === undefined
        ? { status: 'not_present' }
        : options.inspectC2pa(input);
    },
    createId: (prefix) => {
      ids += 1;

      return `${prefix}_${String(ids).padStart(6, '0')}`;
    },
    now: () => {
      clock += 1;

      return new Date(BASE_TIME_MS + clock * 10);
    },
  };

  return {
    deps,
    controller,
    events,
    calls,
    headerInputs,
    byteInputs,
    c2paInputs,
  };
}

/** A C2PA failure code with a valid, stable vocabulary member. */
export const C2PA_READ_FAILED: C2paErrorCode = 'C2PA_READ_FAILED';
