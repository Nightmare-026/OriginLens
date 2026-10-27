import { C2paSession } from '@/lib/c2pa/session';
import { sha256Hex } from '@/lib/fingerprint/sha256';
import { inspectMetadata } from '@/lib/metadata/inspect';
import { createId } from '@/lib/results/ids';
import { HEADER_BYTES, LOCAL_STAGE_TIMEOUT_MS, MAX_IMAGE_PIXELS } from '@/lib/security/limits';
import type { AnalyzeDependencies, DecodeOutcome } from './types';

/**
 * Browser implementations of the injected pipeline dependencies.
 *
 * The decoder deliberately reports dimensions *before* forcing a full decode,
 * so the 20 MP guard can reject a decompression bomb before a full raster is
 * produced. In-budget images are then fully decoded with `Image.decode()` to
 * prove the decoder can read the data. No canvas is allocated and no pixels are
 * transformed, which keeps the fingerprint path independent of display.
 */

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('decode'));
    image.src = url;
  });
}

async function attemptDecode(file: File): Promise<DecodeOutcome> {
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return { ok: false, code: 'PIPELINE_DECODE_FAILED' };
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(url);
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
      return { ok: false, code: 'PIPELINE_DECODE_FAILED' };
    }

    // Apply the pixel guard before asking the browser for a full raster. The
    // caller still runs `validateDimensions`, which owns the product error.
    if (width > MAX_IMAGE_PIXELS || height > MAX_IMAGE_PIXELS || width * height > MAX_IMAGE_PIXELS) {
      return { ok: true, dimensions: { width, height } };
    }

    await image.decode();

    return { ok: true, dimensions: { width, height } };
  } catch {
    return { ok: false, code: 'PIPELINE_DECODE_FAILED' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeDimensions(file: File): Promise<DecodeOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<DecodeOutcome>((resolve) => {
    timer = setTimeout(
      () => resolve({ ok: false, code: 'PIPELINE_DECODE_TIMEOUT' }),
      LOCAL_STAGE_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([attemptDecode(file), timeout]);
  } catch {
    // The decoder depends on browser APIs; any unexpected failure is a
    // recoverable decode error, never an unhandled exception in the UI.
    return { ok: false, code: 'PIPELINE_DECODE_FAILED' };
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function createBrowserDependencies(session: C2paSession): AnalyzeDependencies {
  return {
    readHeader: async (file) => new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()),
    decodeDimensions,
    readBytes: (file) => file.arrayBuffer(),
    sha256: (bytes) => sha256Hex(bytes),
    inspectMetadata: (bytes) => inspectMetadata(bytes),
    inspectC2pa: (input) =>
      session.inspect({ file: input.file, format: input.format, signal: input.signal }),
    createId,
    now: () => new Date(),
  };
}
