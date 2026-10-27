import type { OrientationStatus } from '@/lib/metadata/inspect';
import { MAX_PREVIEW_PIXELS } from '@/lib/security/limits';
import {
  PREVIEW_ASPECT_TOLERANCE,
  PREVIEW_CHANNEL_THRESHOLD,
  type PreviewSkipReason,
} from './constants';

/**
 * Planning and measurement for the bounded difference preview (PRD 5.5,
 * Stage 6). Everything here is pure: no canvas, no DOM, no decoder. The browser
 * adapter draws both files into the planned target size and hands back the two
 * pixel buffers; this module turns them into two documented numbers.
 *
 * The numbers describe the displayed normalized preview only. They are not a
 * forensic measurement of the original pixels, and a non-zero result is not a
 * finding about intent, tampering, or authenticity.
 */

export type PreviewSource = Readonly<{
  width: number;
  height: number;
  sha256: string;
  orientationStatus: OrientationStatus;
}>;

export type PreviewPlan =
  | Readonly<{ status: 'planned'; targetWidth: number; targetHeight: number }>
  | Readonly<{ status: 'skipped'; reason: PreviewSkipReason }>;

export type PreviewMeasurement = Readonly<{
  pixelCount: number;
  meanAbsoluteChannelError: number;
  changedPixelCount: number;
  changedPixelShare: number;
}>;

export type MeasureResult =
  | Readonly<{ status: 'measured'; metric: PreviewMeasurement }>
  | Readonly<{ status: 'unavailable'; reason: Extract<PreviewSkipReason, 'pixel_data_unavailable'> }>;

function aspectRatio(width: number, height: number): number {
  return width / height;
}

function relativeDifference(left: number, right: number): number {
  return Math.abs(left - right) / Math.max(left, right);
}

/**
 * The target is derived from the smaller source by pixel count, scaled down to
 * the 1.2 MP budget. Both files are resampled into exactly this size, so the
 * two metric inputs always share dimensions and a metric can never compare a
 * rescaled image against an unscaled one.
 */
function planTarget(
  width: number,
  height: number,
  maxPixels: number,
): Readonly<{ targetWidth: number; targetHeight: number }> | null {
  const pixels = width * height;
  const scale = pixels > maxPixels ? Math.sqrt(maxPixels / pixels) : 1;

  let targetWidth = Math.max(1, Math.floor(width * scale));
  let targetHeight = Math.max(1, Math.floor(height * scale));

  while (targetWidth * targetHeight > maxPixels) {
    if (targetWidth >= targetHeight && targetWidth > 1) {
      targetWidth -= 1;
    } else if (targetHeight > 1) {
      targetHeight -= 1;
    } else {
      return null;
    }
  }

  return { targetWidth, targetHeight };
}

function hasNormalizableOrientation(status: OrientationStatus): boolean {
  return status === 'absent' || status === 'upright';
}

/**
 * Decides whether the preview can be measured at all, before any pixel work.
 * Every skipped reason is a stable code so the UI and the report cannot invent
 * a numeric difference for a measurement that never ran.
 */
export function planPreview(
  first: PreviewSource,
  second: PreviewSource,
  maxPixels: number = MAX_PREVIEW_PIXELS,
): PreviewPlan {
  if (first.sha256 === second.sha256) {
    return { status: 'skipped', reason: 'identical_fingerprint' };
  }

  if (
    !hasNormalizableOrientation(first.orientationStatus) ||
    !hasNormalizableOrientation(second.orientationStatus)
  ) {
    return { status: 'skipped', reason: 'orientation_not_normalized' };
  }

  const firstAspect = aspectRatio(first.width, first.height);
  const secondAspect = aspectRatio(second.width, second.height);

  if (relativeDifference(firstAspect, secondAspect) > PREVIEW_ASPECT_TOLERANCE) {
    return { status: 'skipped', reason: 'aspect_ratio_mismatch' };
  }

  const firstPixels = first.width * first.height;
  const secondPixels = second.width * second.height;
  const source = firstPixels <= secondPixels ? first : second;
  const target = planTarget(source.width, source.height, maxPixels);

  if (target === null || target.targetWidth * target.targetHeight > maxPixels) {
    return { status: 'skipped', reason: 'pixel_budget_exceeded' };
  }

  return { status: 'planned', ...target };
}

/**
 * Compares two RGBA buffers of identical dimensions.
 *
 * - A pixel is "changed" when any of its red, green, or blue channel deltas is
 *   at least the documented threshold (16 of 255).
 * - The error figure is the mean absolute channel difference over all three
 *   colour channels of every pixel, in the same 0-255 scale.
 *
 * Alpha is deliberately not compared: the browser adapter composites both
 * previews onto the same opaque background first, so a transparency difference
 * shows up as a colour difference instead of an invisible alpha delta.
 */
export function measurePreview(
  first: Uint8ClampedArray,
  second: Uint8ClampedArray,
  width: number,
  height: number,
  channelThreshold: number = PREVIEW_CHANNEL_THRESHOLD,
): MeasureResult {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > MAX_PREVIEW_PIXELS
  ) {
    return { status: 'unavailable', reason: 'pixel_data_unavailable' };
  }

  const expectedLength = width * height * 4;

  if (first.length !== expectedLength || second.length !== expectedLength) {
    return { status: 'unavailable', reason: 'pixel_data_unavailable' };
  }

  const pixelCount = width * height;
  let absoluteChannelTotal = 0;
  let changedPixelCount = 0;

  for (let offset = 0; offset < expectedLength; offset += 4) {
    const redDelta = Math.abs(first[offset]! - second[offset]!);
    const greenDelta = Math.abs(first[offset + 1]! - second[offset + 1]!);
    const blueDelta = Math.abs(first[offset + 2]! - second[offset + 2]!);

    absoluteChannelTotal += redDelta + greenDelta + blueDelta;

    if (Math.max(redDelta, greenDelta, blueDelta) >= channelThreshold) {
      changedPixelCount += 1;
    }
  }

  return {
    status: 'measured',
    metric: {
      pixelCount,
      meanAbsoluteChannelError: roundToSixDecimals(
        absoluteChannelTotal / (pixelCount * 3),
      ),
      changedPixelCount,
      changedPixelShare: changedPixelCount / pixelCount,
    },
  };
}

function roundToSixDecimals(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** The normalization the two numbers describe, quoted by the UI and report. */
export const PREVIEW_NORMALIZATION_NOTE =
  'Both previews were resampled to the same target size, derived from the smaller image and capped at 1.2 megapixels, and composited onto an opaque white canvas. The metric describes this displayed preview, not every original pixel.';
