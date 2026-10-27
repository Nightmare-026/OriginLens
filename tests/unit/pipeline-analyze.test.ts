import { describe, expect, it } from 'vitest';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import type { FileAnalysis } from '@/lib/pipeline/types';
import type { CheckKind, CheckResult } from '@/lib/results/schemas';
import { MAX_FILE_BYTES } from '@/lib/security/limits';
import {
  createHarness,
  extractedMetadata,
  failedMetadata,
  FIXED_SHA256,
  invalidStore,
  jpegFile,
  verifiedStore,
} from './helpers/pipeline-harness';

/**
 * Phase 5 orchestration contract. These tests run the real pipeline with
 * injected fakes; they assert execution order, cancellation semantics,
 * recovery, original-byte fingerprinting, and runtime-contract enforcement.
 */

const JPEG = 'image/jpeg';

function onlyAnalysis(result: Awaited<ReturnType<typeof runFileAnalysis>>): FileAnalysis {
  expect(result.status).toBe('ok');

  if (result.status !== 'ok') {
    throw new Error(`expected ok, received ${result.status}`);
  }

  return result.analysis;
}

function checkOf(analysis: FileAnalysis, kind: CheckKind): CheckResult {
  const check = analysis.checks.find((candidate) => candidate.kind === kind);

  expect(check, `missing ${kind} check`).toBeDefined();

  if (check === undefined) {
    throw new Error(`missing ${kind} check`);
  }

  return check;
}

describe('runFileAnalysis - successful single-file analysis', () => {
  it('runs intake, fingerprint, metadata, then the credential check with the original file', async () => {
    const file = jpegFile();
    const harness = createHarness();

    const analysis = onlyAnalysis(
      await runFileAnalysis(
        { file, signal: harness.controller.signal, onStage: (event) => harness.events.push(event) },
        harness.deps,
      ),
    );

    expect(harness.calls).toEqual([
      'readHeader',
      'decodeDimensions',
      'readBytes',
      'sha256',
      'inspectMetadata',
      'inspectC2pa',
    ]);
    expect(harness.byteInputs).toEqual([file]);
    expect(harness.c2paInputs).toHaveLength(1);
    expect(harness.c2paInputs[0]?.file).toBe(file);
    expect(harness.c2paInputs[0]?.format).toBe(JPEG);

    expect(analysis.checks.map((check) => check.kind)).toEqual([
      'intake',
      'fingerprint',
      'metadata',
      'c2pa',
    ]);
    expect(analysis.checks.every((check) => check.executionState === 'completed')).toBe(true);
    expect(analysis.file.sha256).toBe(FIXED_SHA256);
    expect(analysis.file.displayName).toBe('sample.jpg');
    expect(analysis.file.detectedMimeType).toBe(JPEG);
    expect(analysis.file.byteSize).toBe(file.size);
    expect(analysis.file.width).toBe(64);
    expect(analysis.file.height).toBe(48);
    expect(analysis.file.decodePipelineVersion).toBe('originlens-browser-decode/1');
    expect(analysis.cancelled).toBe(false);
    expect(analysis.finding?.manifestPresence).toBe('not_present');
  });

  it('emits one running event and one terminal event per stage, with no percentage', async () => {
    const harness = createHarness();

    await runFileAnalysis(
      {
        file: jpegFile(),
        signal: harness.controller.signal,
        onStage: (event) => harness.events.push(event),
      },
      harness.deps,
    );

    expect(harness.events).toHaveLength(8);
    expect(harness.events.filter((event) => event.executionState === 'running')).toHaveLength(4);
    expect(harness.events.map((event) => event.stage)).toEqual([
      'intake',
      'intake',
      'fingerprint',
      'fingerprint',
      'metadata',
      'metadata',
      'c2pa',
      'c2pa',
    ]);
    expect(Object.keys(harness.events[0] ?? {})).not.toContain('percent');
  });

  it('keeps the canonical evidence list identical to the per-check evidence', async () => {
    const harness = createHarness();

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const perCheck = analysis.checks.flatMap((check) => check.evidence);

    expect(analysis.evidence).toEqual(perCheck);
    expect(new Set(analysis.evidence.map((item) => item.evidenceId)).size).toBe(
      analysis.evidence.length,
    );

    for (const item of analysis.evidence) {
      expect(analysis.checks.some((check) => check.checkId === item.sourceCheckId)).toBe(true);
    }

    expect(checkOf(analysis, 'fingerprint').evidence[0]?.value).toBe(FIXED_SHA256);
    expect(checkOf(analysis, 'fingerprint').evidence[0]?.valueType).toBe('hash');
  });

  it('reports no supported credentials as a summary, not as a verdict', async () => {
    const harness = createHarness();

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    expect(analysis.summaryCodes).toEqual(['no_supported_embedded_credentials']);
    expect(analysis.explanation).toContain('No supported embedded credential was found');
    expect(analysis.explanation).not.toMatch(/fake|authentic|tamper/i);
  });

  it('reports verified credential components without promoting signer trust', async () => {
    const harness = createHarness({
      inspectC2pa: async () => ({ status: 'present', store: verifiedStore() }),
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    expect(analysis.summaryCodes).toEqual(['verified_provenance_evidence_found']);
    expect(checkOf(analysis, 'c2pa').outcome).toBe('present');

    const finding = analysis.finding;
    expect(finding).not.toBeNull();
    expect(finding?.manifestValidation).toBe('valid');
    expect(finding?.signatureValidation).toBe('valid');
    expect(finding?.contentBindingValidation).toBe('valid');
    expect(finding?.signerTrust).toBe('not_evaluated');
    expect(analysis.explanation).toContain('Signer trust is not evaluated');
    expect(analysis.summaryCodes).not.toContain('evidence_incomplete');
  });

  it('reports a failing credential component as a validation issue', async () => {
    const harness = createHarness({
      inspectC2pa: async () => ({ status: 'present', store: invalidStore() }),
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    expect(analysis.summaryCodes[0]).toBe('validation_issues_require_attention');
    expect(analysis.finding?.signatureValidation).toBe('invalid');
    expect(analysis.explanation).toContain('did not validate');
    expect(analysis.explanation).toContain('not proof of intent');
  });

  it('records extracted metadata as unverified and withholds GPS coordinates', async () => {
    const harness = createHarness({ inspectMetadata: () => extractedMetadata() });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const metadataCheck = checkOf(analysis, 'metadata');

    expect(metadataCheck.outcome).toBe('extracted');
    expect(
      metadataCheck.evidence.every((item) => item.authority === 'unverified_metadata'),
    ).toBe(true);

    const gps = metadataCheck.evidence.find((item) => item.key === 'metadata.gps_presence');
    expect(gps?.value).toBe('present');
    expect(metadataCheck.evidence.some((item) => item.key.startsWith('metadata.gps.'))).toBe(false);
    expect(analysis.explanation).toContain('coordinates are withheld');
  });
});

describe('runFileAnalysis - independent recovery', () => {
  it('keeps the completed credential check when the metadata parser fails', async () => {
    const harness = createHarness({
      inspectMetadata: () => failedMetadata(),
      inspectC2pa: async () => ({ status: 'present', store: verifiedStore() }),
    });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );
    const analysis = onlyAnalysis(result);

    const metadataCheck = checkOf(analysis, 'metadata');
    expect(metadataCheck.executionState).toBe('failed');
    expect(metadataCheck.errorCode).toBe('METADATA_PARSE_FAILED');
    expect(metadataCheck.outcome).toBeUndefined();
    expect(checkOf(analysis, 'c2pa').executionState).toBe('completed');
    expect(analysis.summaryCodes).toContain('evidence_incomplete');
    expect(analysis.summaryCodes).toContain('verified_provenance_evidence_found');
  });

  it('keeps completed metadata when the credential check fails', async () => {
    const harness = createHarness({
      inspectC2pa: async () => ({ status: 'failed', errorCode: 'C2PA_READ_FAILED' }),
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const c2pa = checkOf(analysis, 'c2pa');
    expect(c2pa.executionState).toBe('failed');
    expect(c2pa.errorCode).toBe('C2PA_READ_FAILED');
    expect(c2pa.outcome).toBeUndefined();
    expect(analysis.finding).toBeNull();
    expect(checkOf(analysis, 'metadata').executionState).toBe('completed');
    expect(analysis.summaryCodes).toContain('evidence_incomplete');
    expect(analysis.explanation).toContain('credential check failed');
  });

  it('turns a thrown credential exception into a failed check, not a crash', async () => {
    const harness = createHarness({
      inspectC2pa: async () => {
        throw new Error('sdk exploded with an internal stack');
      },
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const c2pa = checkOf(analysis, 'c2pa');
    expect(c2pa.executionState).toBe('failed');
    expect(c2pa.errorCode).toBe('C2PA_INTERNAL_ERROR');
    expect(analysis.explanation).not.toContain('sdk exploded');
    expect(analysis.summaryCodes).toContain('evidence_incomplete');
  });

  it('records an unsupported credential check without losing completed local evidence', async () => {
    const harness = createHarness({
      inspectC2pa: async () => ({ status: 'unsupported' }),
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const c2pa = checkOf(analysis, 'c2pa');
    expect(c2pa.executionState).toBe('completed');
    expect(c2pa.outcome).toBe('unsupported');
    // A structured finding is recorded, but it states only that presence was
    // outside the checker's scope. No component may read as evaluated.
    expect(analysis.finding?.manifestPresence).toBe('unsupported');
    expect(analysis.finding?.manifestValidation).toBe('not_evaluated');
    expect(analysis.finding?.signatureValidation).toBe('not_evaluated');
    expect(analysis.finding?.contentBindingValidation).toBe('not_evaluated');
    expect(analysis.finding?.signerTrust).toBe('not_evaluated');
    expect(checkOf(analysis, 'intake').executionState).toBe('completed');
    expect(checkOf(analysis, 'fingerprint').executionState).toBe('completed');
    expect(checkOf(analysis, 'metadata').executionState).toBe('completed');
    // Unsupported is incomplete coverage, never "no credentials found".
    expect(analysis.summaryCodes).toEqual(['evidence_incomplete']);
  });
});

describe('runFileAnalysis - product limits', () => {
  it('rejects a file above the 20 MiB limit before reading any of its bytes', async () => {
    const harness = createHarness();
    const bytes = new Uint8Array(MAX_FILE_BYTES + 1);

    bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

    const file = new File([bytes], 'oversize.jpg', { type: 'image/jpeg' });

    const result = await runFileAnalysis(
      { file, signal: harness.controller.signal, onStage: (event) => harness.events.push(event) },
      harness.deps,
    );

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('FILE_TOO_LARGE');
    }

    expect(harness.calls).toEqual([]);
    expect(harness.events.at(-1)).toEqual({
      stage: 'intake',
      executionState: 'failed',
      errorCode: 'FILE_TOO_LARGE',
    });
  });

  it('rejects an image above 20 MP before reading the original bytes', async () => {
    const harness = createHarness({
      decodeDimensions: async () => ({ ok: true, dimensions: { width: 6000, height: 4000 } }),
    });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIXEL_LIMIT_EXCEEDED');
    }

    expect(harness.calls).toEqual(['readHeader', 'decodeDimensions']);
  });
});

describe('runFileAnalysis - intake rejection', () => {
  it('rejects an SVG before reading the whole file', async () => {
    const harness = createHarness();
    const file = new File([new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')], 'image.jpg', {
      type: 'image/jpeg',
    });

    const result = await runFileAnalysis(
      { file, signal: harness.controller.signal, onStage: (event) => harness.events.push(event) },
      harness.deps,
    );

    expect(result.status).toBe('error');

    if (result.status !== 'error') {
      throw new Error('expected an error result');
    }

    expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
    expect(harness.calls).toEqual(['readHeader']);
    expect(harness.events.at(-1)).toEqual({
      stage: 'intake',
      executionState: 'failed',
      errorCode: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejects a format whose signature contradicts its extension', async () => {
    const harness = createHarness();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const file = new File([png], 'photo.jpg', { type: 'image/jpeg' });

    const result = await runFileAnalysis({ file, signal: harness.controller.signal }, harness.deps);

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('FORMAT_MISMATCH');
    }
  });

  it('reports a decode failure as recoverable and runs no later check', async () => {
    const harness = createHarness({
      decodeDimensions: async () => ({ ok: false, code: 'PIPELINE_DECODE_FAILED' }),
    });

    const result = await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps);

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIPELINE_DECODE_FAILED');
    }

    expect(harness.calls).toEqual(['readHeader', 'decodeDimensions']);
  });
});

describe('runFileAnalysis - cancellation', () => {
  it('returns cancelled with no ledger when cancelled before the fingerprint exists', async () => {
    const harness = createHarness({
      readHeader: async (file) => {
        const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

        harness.controller.abort();

        return header;
      },
    });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );

    expect(result).toEqual({ status: 'cancelled' });
    expect(harness.calls).toEqual(['readHeader']);
  });

  it('keeps the completed fingerprint and marks unstarted work skipped', async () => {
    const harness = createHarness({
      readBytes: async (file) => {
        const bytes = await file.arrayBuffer();

        harness.controller.abort();

        return bytes;
      },
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis(
        {
          file: jpegFile(),
          signal: harness.controller.signal,
          onStage: (event) => harness.events.push(event),
        },
        harness.deps,
      ),
    );

    expect(analysis.cancelled).toBe(true);
    expect(analysis.checks.map((check) => check.executionState)).toEqual([
      'completed',
      'completed',
      'skipped',
      'skipped',
    ]);
    expect(analysis.summaryCodes).toContain('evidence_incomplete');
    expect(harness.calls).toEqual(['readHeader', 'decodeDimensions', 'readBytes', 'sha256']);
    expect(harness.events.slice(-2)).toEqual([
      { stage: 'metadata', executionState: 'skipped' },
      { stage: 'c2pa', executionState: 'skipped' },
    ]);
  });

  it('marks an interrupted credential check cancelled rather than skipped', async () => {
    const harness = createHarness({
      inspectC2pa: async ({ signal }) => {
        harness.controller.abort();

        return signal.aborted ? { status: 'cancelled' } : { status: 'not_present' };
      },
    });

    const analysis = onlyAnalysis(
      await runFileAnalysis({ file: jpegFile(), signal: harness.controller.signal }, harness.deps),
    );

    const c2pa = checkOf(analysis, 'c2pa');
    expect(c2pa.executionState).toBe('cancelled');
    expect(c2pa.outcome).toBeUndefined();
    expect(c2pa.startedAtUtc).toBeDefined();
    expect(analysis.cancelled).toBe(true);
    expect(analysis.finding).toBeNull();
    expect(checkOf(analysis, 'metadata').executionState).toBe('completed');
    expect(analysis.summaryCodes).toContain('evidence_incomplete');
  });

  it('discards a stale result when the session was disposed without a user abort', async () => {
    const harness = createHarness({
      inspectC2pa: async () => ({ status: 'cancelled' }),
    });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );

    expect(result).toEqual({ status: 'cancelled' });
  });
});

describe('runFileAnalysis - original-byte and contract enforcement', () => {
  it('hashes exactly the bytes read from the selected file', async () => {
    const harness = createHarness();
    const file = jpegFile();
    let hashed: ArrayBuffer | null = null;

    const deps = {
      ...harness.deps,
      sha256: async (bytes: ArrayBuffer) => {
        hashed = bytes;

        return FIXED_SHA256;
      },
    };

    await runFileAnalysis({ file, signal: harness.controller.signal }, deps);

    expect(hashed).not.toBeNull();
    expect((hashed as ArrayBuffer | null)?.byteLength).toBe(file.size);
  });

  it('fails closed when the read buffer is shorter than the declared file', async () => {
    const harness = createHarness({
      readBytes: async () => new ArrayBuffer(8),
    });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIPELINE_CONTRACT_VIOLATION');
    }
  });

  it('fails closed when a check violates its runtime contract', async () => {
    const harness = createHarness();
    const deps = {
      ...harness.deps,
      createId: (prefix: 'file' | 'chk' | 'ev' | 'rpt') => `${prefix}_duplicate`,
    };

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      deps,
    );

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIPELINE_CONTRACT_VIOLATION');
    }
  });

  it('fails closed when a hash is not a SHA-256 hex digest', async () => {
    const harness = createHarness({ sha256: async () => 'not-a-hash' });

    const result = await runFileAnalysis(
      { file: jpegFile(), signal: harness.controller.signal },
      harness.deps,
    );

    expect(result.status).toBe('error');

    if (result.status === 'error') {
      expect(result.error.code).toBe('PIPELINE_CONTRACT_VIOLATION');
    }
  });
});
