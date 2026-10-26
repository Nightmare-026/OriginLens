/**
 * Product limits from OriginLens_PRD.md §4.2. These are product guardrails,
 * not universal standards. Change them only with measurements and tests.
 */

/** Maximum compressed file size per file (20 MiB). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Maximum decoded pixel budget per image (20 MP). */
export const MAX_IMAGE_PIXELS = 20_000_000;

/** Maximum files in one comparison session. */
export const MAX_FILES_PER_SESSION = 2;

/** Maximum pixel budget for a difference preview (1.2 MP). */
export const MAX_PREVIEW_PIXELS = 1_200_000;

/** Bounded header inspection for signature signals (bytes). */
export const HEADER_BYTES = 16;

/** Target timeout for one local pipeline stage. */
export const LOCAL_STAGE_TIMEOUT_MS = 15_000;

/** Maximum stored filename length before display. */
export const MAX_DISPLAY_NAME_LENGTH = 200;

/**
 * Application version recorded in exported reports. A unit test asserts that
 * this matches package.json so the report cannot silently drift.
 */
export const APP_VERSION = '0.1.0';
