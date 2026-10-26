/**
 * Stable, user-safe error codes. Never surface parser exceptions, stack
 * traces, raw filenames, or SDK payloads to the user or an exported report.
 */

export const INTAKE_ERROR_CODES = [
  'EMPTY_FILE',
  'FILE_TOO_LARGE',
  'INVALID_FILE_SIZE',
  'UNSUPPORTED_FORMAT',
  'FORMAT_MISMATCH',
  'CORRUPT_IMAGE',
  'INVALID_DIMENSIONS',
  'PIXEL_LIMIT_EXCEEDED',
  'FILE_COUNT_EXCEEDED',
] as const;

export type IntakeErrorCode = (typeof INTAKE_ERROR_CODES)[number];

const MESSAGES: Readonly<Record<IntakeErrorCode, string>> = {
  EMPTY_FILE: 'The selected file is empty.',
  FILE_TOO_LARGE: 'The file is larger than the 20 MiB limit.',
  INVALID_FILE_SIZE: 'The file size could not be validated.',
  UNSUPPORTED_FORMAT: 'The file format is not supported. Use a JPEG or PNG image.',
  FORMAT_MISMATCH:
    'The filename, browser-reported type, and file content do not agree. The file was not processed.',
  CORRUPT_IMAGE: 'The file is truncated or does not contain a readable image header.',
  INVALID_DIMENSIONS: 'The image dimensions could not be validated.',
  PIXEL_LIMIT_EXCEEDED: 'The image is larger than the 20 megapixel limit.',
  FILE_COUNT_EXCEEDED: 'A session can hold at most two image files.',
};

export type SafeError = Readonly<{
  code: IntakeErrorCode;
  message: string;
  recoverable: true;
}>;

export function intakeError(code: IntakeErrorCode): SafeError {
  return Object.freeze({
    code,
    message: MESSAGES[code],
    recoverable: true as const,
  });
}

export function isIntakeErrorCode(value: string): value is IntakeErrorCode {
  return (INTAKE_ERROR_CODES as readonly string[]).includes(value);
}

/**
 * C2PA check failures. These describe only that the check could not run or
 * finish. They are never a finding about the image.
 */
export const C2PA_ERROR_CODES = [
  'C2PA_RUNTIME_UNAVAILABLE',
  'C2PA_READ_FAILED',
  'C2PA_STORE_READ_FAILED',
  'C2PA_TIMEOUT',
  'C2PA_INTERNAL_ERROR',
] as const;

export type C2paErrorCode = (typeof C2PA_ERROR_CODES)[number];

const C2PA_MESSAGES: Readonly<Record<C2paErrorCode, string>> = {
  C2PA_RUNTIME_UNAVAILABLE:
    'The C2PA checker could not start, so no credential evidence was checked. Other results are unaffected.',
  C2PA_READ_FAILED:
    'The C2PA checker could not read this file, so no credential evidence was checked. This is not a finding about the image.',
  C2PA_STORE_READ_FAILED:
    'The C2PA checker found a credential but could not read its details. No credential findings were recorded.',
  C2PA_TIMEOUT: 'The C2PA check exceeded its time limit and produced no credential findings.',
  C2PA_INTERNAL_ERROR:
    'The C2PA check stopped unexpectedly and produced no credential findings. Other results are unaffected.',
};

export type C2paSafeError = Readonly<{
  code: C2paErrorCode;
  message: string;
  recoverable: true;
}>;

export function c2paError(code: C2paErrorCode): C2paSafeError {
  return Object.freeze({
    code,
    message: C2PA_MESSAGES[code],
    recoverable: true as const,
  });
}

export function isC2paErrorCode(value: string): value is C2paErrorCode {
  return (C2PA_ERROR_CODES as readonly string[]).includes(value);
}
