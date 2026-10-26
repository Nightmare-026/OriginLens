import {
  detectFormatFromHeader,
  detectUnsupportedFormat,
  formatFromExtension,
  formatFromMime,
  FORMAT_TO_MIME,
  normalizeExtension,
  normalizeMimeType,
  type SupportedFormat,
  type SupportedMimeType,
} from '@/lib/intake/format';
import { intakeError, type IntakeErrorCode, type SafeError } from '@/lib/security/errors';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILES_PER_SESSION,
  MAX_IMAGE_PIXELS,
} from '@/lib/security/limits';

export type FileDescriptor = Readonly<{
  name: string;
  declaredMimeType: string;
  byteSize: number;
}>;

export type ImageDimensions = Readonly<{
  width: number;
  height: number;
}>;

export type DeclaredFile = Readonly<{
  displayName: string;
  extension: string;
  formatFromExtension: SupportedFormat;
  declaredMimeType: SupportedMimeType | null;
  byteSize: number;
  warnings: readonly string[];
}>;

export type PreflightedFile = Readonly<{
  displayName: string;
  extension: string;
  detectedFormat: SupportedFormat;
  detectedMimeType: SupportedMimeType;
  declaredMimeType: SupportedMimeType | null;
  byteSize: number;
  width: number;
  height: number;
  warnings: readonly string[];
}>;

export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: SafeError }>;

function fail(code: IntakeErrorCode): ValidationResult<never> {
  return { ok: false, error: intakeError(code) };
}

/**
 * Removes path components, control characters, and bidi overrides from a
 * filename, then bounds its length. The result is display text only; it is
 * never used as a path or trusted as evidence.
 */
export function sanitizeDisplayName(rawName: string): string {
  const baseName = rawName.split(/[\\/]/).pop() ?? '';
  const cleaned = baseName
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const bounded = cleaned.slice(0, MAX_DISPLAY_NAME_LENGTH);

  return bounded.length > 0 ? bounded : 'image';
}

/**
 * Validates signals available without reading the file body: size, extension,
 * and the browser-reported MIME type. Reading the full file before this check
 * is forbidden by the PRD's resource-safety rules.
 */
export function validateDeclaredFile(descriptor: FileDescriptor): ValidationResult<DeclaredFile> {
  if (!Number.isSafeInteger(descriptor.byteSize) || descriptor.byteSize < 0) {
    return fail('INVALID_FILE_SIZE');
  }

  if (descriptor.byteSize === 0) {
    return fail('EMPTY_FILE');
  }

  if (descriptor.byteSize > MAX_FILE_BYTES) {
    return fail('FILE_TOO_LARGE');
  }

  const extension = normalizeExtension(descriptor.name);
  const extensionFormat = extension === null ? null : formatFromExtension(extension);

  if (extension === null || extensionFormat === null) {
    return fail('UNSUPPORTED_FORMAT');
  }

  const normalizedMime = normalizeMimeType(descriptor.declaredMimeType);
  const mimeFormat = formatFromMime(normalizedMime);
  const warnings: string[] = [];
  let declaredMimeType: SupportedMimeType | null = null;

  if (normalizedMime.length === 0 || normalizedMime === 'application/octet-stream') {
    warnings.push(
      'The browser did not report a specific image type. The file signature and decoder must decide.',
    );
  } else if (mimeFormat === null) {
    // The extension is JPEG/PNG but the browser claims another type. Never
    // reinterpret the file based on one signal.
    return fail('FORMAT_MISMATCH');
  } else {
    if (mimeFormat !== extensionFormat) {
      return fail('FORMAT_MISMATCH');
    }

    declaredMimeType = FORMAT_TO_MIME[mimeFormat];

    if (normalizedMime === 'image/jpg') {
      warnings.push('The browser used the non-standard type image/jpg; it was read as image/jpeg.');
    }
  }

  return {
    ok: true,
    value: {
      displayName: sanitizeDisplayName(descriptor.name),
      extension,
      formatFromExtension: extensionFormat,
      declaredMimeType,
      byteSize: descriptor.byteSize,
      warnings,
    },
  };
}

/**
 * Validates a bounded header against the extension and MIME claims. A
 * supported signature is necessary but never sufficient: decoding must still
 * succeed and dimensions must still be checked.
 */
export function validateHeader(
  declared: DeclaredFile,
  header: Uint8Array,
): ValidationResult<SupportedFormat> {
  if (header.length < 8) {
    return fail('CORRUPT_IMAGE');
  }

  const detectedFormat = detectFormatFromHeader(header);

  if (detectedFormat === null) {
    return fail(detectUnsupportedFormat(header) === null ? 'FORMAT_MISMATCH' : 'UNSUPPORTED_FORMAT');
  }

  if (detectedFormat !== declared.formatFromExtension) {
    return fail('FORMAT_MISMATCH');
  }

  if (
    declared.declaredMimeType !== null &&
    declared.declaredMimeType !== FORMAT_TO_MIME[detectedFormat]
  ) {
    return fail('FORMAT_MISMATCH');
  }

  return { ok: true, value: detectedFormat };
}

/** Validates decoded dimensions and the 20 MP budget with checked math. */
export function validateDimensions(dimensions: ImageDimensions): ValidationResult<ImageDimensions> {
  const { width, height } = dimensions;

  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return fail('INVALID_DIMENSIONS');
  }

  // Check each side before multiplying so the product cannot overflow.
  if (width > MAX_IMAGE_PIXELS || height > MAX_IMAGE_PIXELS) {
    return fail('PIXEL_LIMIT_EXCEEDED');
  }

  if (width * height > MAX_IMAGE_PIXELS) {
    return fail('PIXEL_LIMIT_EXCEEDED');
  }

  return { ok: true, value: { width, height } };
}

/** Enforces the two-file session limit; returns a safe error or null. */
export function checkFileCount(currentCount: number): SafeError | null {
  if (
    !Number.isSafeInteger(currentCount) ||
    currentCount < 0 ||
    currentCount >= MAX_FILES_PER_SESSION
  ) {
    return intakeError('FILE_COUNT_EXCEEDED');
  }

  return null;
}

/**
 * Runs the full preflight in order. Callers pass only the bounded header and
 * decoded dimensions; no full-resolution buffer is allocated here.
 */
export function preflightFile(input: {
  descriptor: FileDescriptor;
  header: Uint8Array;
  dimensions: ImageDimensions;
}): ValidationResult<PreflightedFile> {
  const declared = validateDeclaredFile(input.descriptor);

  if (!declared.ok) {
    return declared;
  }

  const header = validateHeader(declared.value, input.header);

  if (!header.ok) {
    return header;
  }

  const dimensions = validateDimensions(input.dimensions);

  if (!dimensions.ok) {
    return dimensions;
  }

  return {
    ok: true,
    value: {
      displayName: declared.value.displayName,
      extension: declared.value.extension,
      detectedFormat: header.value,
      detectedMimeType: FORMAT_TO_MIME[header.value],
      declaredMimeType: declared.value.declaredMimeType,
      byteSize: declared.value.byteSize,
      width: dimensions.value.width,
      height: dimensions.value.height,
      warnings: declared.value.warnings,
    },
  };
}
