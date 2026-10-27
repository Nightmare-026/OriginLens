import type { OrientationStatus } from '@/lib/metadata/inspect';
import { LOCAL_STAGE_TIMEOUT_MS } from '@/lib/security/limits';
import type { FileRecord } from '@/lib/results/schemas';
import type { ComparisonPreviewOutcome } from './build';
import { measurePreview, planPreview } from './preview';

/**
 * Browser implementation of the bounded difference preview.
 *
 * Both files are decoded with `createImageBitmap` using `imageOrientation:
 * 'none'`, so no EXIF rotation is applied implicitly and the metric always
 * describes the stored pixel grid. Each bitmap is drawn into the same
 * freshly-created canvas at the planned target size, composited onto an opaque
 * white background, and read back once. Bitmaps are closed in `finally` and the
 * canvas is released after the measurement, including after a failure.
 */

export type PreviewPairRequest = Readonly<{
  firstFile: File;
  secondFile: File;
  first: FileRecord;
  second: FileRecord;
  firstOrientation: OrientationStatus;
  secondOrientation: OrientationStatus;
  signal: AbortSignal;
}>;

export type PreviewPairResult = ComparisonPreviewOutcome | Readonly<{ status: 'cancelled' }>;

type Deadline<T> =
  | Readonly<{ status: 'ok'; value: T }>
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'timed_out' }>
  | Readonly<{ status: 'failed' }>;

function raceDeadline<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<Deadline<T>> {
  if (signal.aborted) {
    return Promise.resolve({ status: 'aborted' });
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: Deadline<T>): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const onAbort = (): void => finish({ status: 'aborted' });
    const timer = setTimeout(() => finish({ status: 'timed_out' }), timeoutMs);

    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => finish({ status: 'ok', value }),
      () => finish({ status: 'failed' }),
    );
  });
}

async function extractPixels(
  file: File,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<Deadline<Uint8ClampedArray>> {
  const bitmapPromise = createImageBitmap(file, { imageOrientation: 'none' });

  // The bitmap is owned here and closed in `finally` even when the deadline
  // wins the race: a late decode must not leak browser memory.
  const extraction = (async (): Promise<Uint8ClampedArray> => {
    const bitmap = await bitmapPromise;

    try {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      return context.getImageData(0, 0, targetWidth, targetHeight).data;
    } finally {
      bitmap.close();
    }
  })();

  // A failure to decode is reported separately from a deadline overrun.
  return raceDeadline(extraction, signal, timeoutMs);
}

export async function measurePreviewPair(
  request: PreviewPairRequest,
  timeoutMs: number = LOCAL_STAGE_TIMEOUT_MS,
): Promise<PreviewPairResult> {
  if (request.signal.aborted) {
    return { status: 'cancelled' };
  }

  const plan = planPreview(
    {
      width: request.first.width,
      height: request.first.height,
      sha256: request.first.sha256,
      orientationStatus: request.firstOrientation,
    },
    {
      width: request.second.width,
      height: request.second.height,
      sha256: request.second.sha256,
      orientationStatus: request.secondOrientation,
    },
  );

  if (plan.status === 'skipped') {
    return plan;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (context === null) {
    return { status: 'skipped', reason: 'pixel_data_unavailable' };
  }

  try {
    const first = await extractPixels(
      request.firstFile,
      canvas,
      context,
      plan.targetWidth,
      plan.targetHeight,
      request.signal,
      timeoutMs,
    );

    if (first.status === 'aborted') {
      return request.signal.aborted
        ? { status: 'cancelled' }
        : { status: 'skipped', reason: 'decode_failed' };
    }

    if (first.status === 'failed') {
      return { status: 'skipped', reason: 'decode_failed' };
    }

    if (first.status === 'timed_out') {
      return { status: 'skipped', reason: 'decode_timed_out' };
    }

    const second = await extractPixels(
      request.secondFile,
      canvas,
      context,
      plan.targetWidth,
      plan.targetHeight,
      request.signal,
      timeoutMs,
    );

    if (second.status === 'aborted') {
      return request.signal.aborted
        ? { status: 'cancelled' }
        : { status: 'skipped', reason: 'decode_failed' };
    }

    if (second.status === 'failed') {
      return { status: 'skipped', reason: 'decode_failed' };
    }

    if (second.status === 'timed_out') {
      return { status: 'skipped', reason: 'decode_timed_out' };
    }

    const measured = measurePreview(first.value, second.value, plan.targetWidth, plan.targetHeight);

    if (measured.status === 'unavailable') {
      return { status: 'skipped', reason: measured.reason };
    }

    return {
      status: 'measured',
      targetWidth: plan.targetWidth,
      targetHeight: plan.targetHeight,
      metric: measured.metric,
    };
  } finally {
    // Release the backing store; the session owns no other canvas.
    canvas.width = 0;
    canvas.height = 0;
  }
}
