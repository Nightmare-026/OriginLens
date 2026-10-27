import { describe, expect, it } from 'vitest';
import {
  PREVIEW_ASPECT_TOLERANCE,
  PREVIEW_CHANNEL_THRESHOLD,
} from '@/lib/compare/constants';
import { measurePreview, planPreview, type PreviewSource } from '@/lib/compare/preview';
import { MAX_PREVIEW_PIXELS } from '@/lib/security/limits';

/**
 * The preview planner and metric (PRD 5.5, Stage 6).
 *
 * These tests pin the documented normalization: when a measurement may run at
 * all, which size both files are resampled to, and exactly how the two numbers
 * are computed. A skipped measurement has a stable reason code; it is never
 * reported as a difference of zero.
 */

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function source(overrides: Partial<PreviewSource> = {}): PreviewSource {
  return {
    width: 100,
    height: 50,
    sha256: SHA_A,
    orientationStatus: 'absent',
    ...overrides,
  };
}

describe('preview planning', () => {
  it('skips an identical fingerprint instead of reporting zero change', () => {
    const plan = planPreview(source(), source({ width: 640, height: 480 }));

    expect(plan).toEqual({ status: 'skipped', reason: 'identical_fingerprint' });
  });

  it('skips when either orientation cannot be normalized', () => {
    expect(planPreview(source({ orientationStatus: 'not_upright' }), source({ sha256: SHA_B }))).toEqual(
      { status: 'skipped', reason: 'orientation_not_normalized' },
    );
    expect(planPreview(source(), source({ sha256: SHA_B, orientationStatus: 'unknown' }))).toEqual({
      status: 'skipped',
      reason: 'orientation_not_normalized',
    });
    expect(planPreview(source({ orientationStatus: 'invalid' }), source({ sha256: SHA_B }))).toEqual({
      status: 'skipped',
      reason: 'orientation_not_normalized',
    });
  });

  it('accepts an upright orientation as normalizable', () => {
    const plan = planPreview(source({ orientationStatus: 'upright' }), source({ sha256: SHA_B }));

    expect(plan.status).toBe('planned');
  });

  it('skips an aspect ratio difference beyond the documented tolerance', () => {
    const plan = planPreview(source({ width: 100, height: 100 }), source({ sha256: SHA_B, width: 200, height: 50 }));

    expect(plan).toEqual({ status: 'skipped', reason: 'aspect_ratio_mismatch' });
  });

  it('accepts an aspect ratio difference inside the tolerance', () => {
    // 2048/1365 and 3/2 differ by about 0.024 percent, which is below the
    // documented 0.5 percent tolerance.
    const plan = planPreview(
      source({ width: 2048, height: 1365 }),
      source({ sha256: SHA_B, width: 3, height: 2 }),
    );

    expect(plan.status).toBe('planned');
    expect(PREVIEW_ASPECT_TOLERANCE).toBe(0.005);
  });

  it('derives the target size from the smaller source', () => {
    const plan = planPreview(source({ width: 100, height: 50 }), source({ sha256: SHA_B, width: 400, height: 200 }));

    expect(plan).toEqual({ status: 'planned', targetWidth: 100, targetHeight: 50 });
  });

  it('caps the target size at the preview pixel budget', () => {
    const plan = planPreview(source({ width: 4000, height: 3000 }), source({ sha256: SHA_B, width: 4000, height: 3000 }));

    expect(plan.status).toBe('planned');

    if (plan.status !== 'planned') {
      throw new Error('expected a planned preview');
    }

    expect(plan.targetWidth * plan.targetHeight).toBeLessThanOrEqual(MAX_PREVIEW_PIXELS);
    expect(plan.targetWidth * plan.targetHeight).toBeGreaterThan(MAX_PREVIEW_PIXELS / 2);
  });

  it('respects a caller-supplied pixel budget', () => {
    const plan = planPreview(source({ width: 3, height: 2 }), source({ sha256: SHA_B, width: 3, height: 2 }), 1);

    expect(plan).toEqual({ status: 'planned', targetWidth: 1, targetHeight: 1 });
  });
});

describe('preview metric', () => {
  function buffer(width: number, height: number): Uint8ClampedArray {
    return new Uint8ClampedArray(width * height * 4);
  }

  it('reports zero error for identical buffers', () => {
    const first = buffer(2, 2);
    const second = buffer(2, 2);

    first.fill(120);
    second.fill(120);

    const result = measurePreview(first, second, 2, 2);

    expect(result).toEqual({
      status: 'measured',
      metric: {
        pixelCount: 4,
        meanAbsoluteChannelError: 0,
        changedPixelCount: 0,
        changedPixelShare: 0,
      },
    });
  });

  it('counts a channel delta exactly at the threshold as a changed pixel', () => {
    const first = buffer(2, 2);
    const second = buffer(2, 2);

    second[0] = PREVIEW_CHANNEL_THRESHOLD;

    const result = measurePreview(first, second, 2, 2);

    if (result.status !== 'measured') {
      throw new Error('expected a measurement');
    }

    expect(result.metric.changedPixelCount).toBe(1);
    expect(result.metric.changedPixelShare).toBe(0.25);
    expect(result.metric.meanAbsoluteChannelError).toBeCloseTo(
      PREVIEW_CHANNEL_THRESHOLD / (4 * 3),
      6,
    );
  });

  it('does not count a delta below the threshold as a changed pixel', () => {
    const first = buffer(2, 2);
    const second = buffer(2, 2);

    second[0] = PREVIEW_CHANNEL_THRESHOLD - 1;

    const result = measurePreview(first, second, 2, 2);

    if (result.status !== 'measured') {
      throw new Error('expected a measurement');
    }

    expect(result.metric.changedPixelCount).toBe(0);
    expect(result.metric.meanAbsoluteChannelError).toBeGreaterThan(0);
  });

  it('ignores the alpha channel because both previews are composited first', () => {
    const first = buffer(1, 1);
    const second = buffer(1, 1);

    first[3] = 0;
    second[3] = 255;

    const result = measurePreview(first, second, 1, 1);

    if (result.status !== 'measured') {
      throw new Error('expected a measurement');
    }

    expect(result.metric.meanAbsoluteChannelError).toBe(0);
    expect(result.metric.changedPixelCount).toBe(0);
  });

  it('lands on the documented rounding for a repeating decimal', () => {
    const first = buffer(1, 1);
    const second = buffer(1, 1);

    second[0] = 1;

    const result = measurePreview(first, second, 1, 1);

    if (result.status !== 'measured') {
      throw new Error('expected a measurement');
    }

    expect(result.metric.meanAbsoluteChannelError).toBe(0.333333);
  });

  it('refuses buffers whose length does not match the declared size', () => {
    expect(measurePreview(buffer(2, 2), buffer(2, 2), 3, 2)).toEqual({
      status: 'unavailable',
      reason: 'pixel_data_unavailable',
    });
    expect(measurePreview(buffer(2, 2), buffer(1, 1), 2, 2)).toEqual({
      status: 'unavailable',
      reason: 'pixel_data_unavailable',
    });
  });

  it('refuses a declared size outside the preview budget', () => {
    const oversized = Math.ceil(Math.sqrt(MAX_PREVIEW_PIXELS)) + 2;

    expect(measurePreview(buffer(1, 1), buffer(1, 1), oversized, oversized)).toEqual({
      status: 'unavailable',
      reason: 'pixel_data_unavailable',
    });
  });

  it('refuses a non-integer or empty size', () => {
    expect(measurePreview(buffer(1, 1), buffer(1, 1), 1.5, 1)).toEqual({
      status: 'unavailable',
      reason: 'pixel_data_unavailable',
    });
    expect(measurePreview(buffer(1, 1), buffer(1, 1), 0, 1)).toEqual({
      status: 'unavailable',
      reason: 'pixel_data_unavailable',
    });
  });
});
