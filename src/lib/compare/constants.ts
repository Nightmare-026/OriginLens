/**
 * Contract constants for the Provenance Delta preview measurement (PRD 5.5,
 * Stage 6). They live in their own module so the report schema can reference
 * the exact same identifiers the measurement writes, without importing the
 * measurement code.
 */

/** Identifies the two formulas and the normalization rules in one place. */
export const PREVIEW_METHOD_ID = 'originlens-preview-rgb-mae/1';

/** The exact decode path used for both files, recorded in results and reports. */
export const PREVIEW_DECODER_ID = 'browser-createimagebitmap-canvas-srgb/1';

/** A channel counts as different at 16 of 255, per PRD 5.5. */
export const PREVIEW_CHANNEL_THRESHOLD = 16;

/**
 * Maximum relative difference between the two aspect ratios. Above this, the
 * previews would have to be stretched or cropped differently, so the metric is
 * skipped instead of silently normalizing one image to the other.
 */
export const PREVIEW_ASPECT_TOLERANCE = 0.005;

/**
 * Every reason the preview measurement can decline to produce a number. A
 * skipped metric is never reported as a zero difference.
 */
export const PREVIEW_SKIP_REASONS = [
  'identical_fingerprint',
  'aspect_ratio_mismatch',
  'orientation_not_normalized',
  'pixel_budget_exceeded',
  'decode_failed',
  'decode_timed_out',
  'pixel_data_unavailable',
] as const;

export type PreviewSkipReason = (typeof PREVIEW_SKIP_REASONS)[number];
