/**
 * Stable, user-safe errors raised by the local analysis pipeline. These
 * describe only why a check could not run. They are never findings about the
 * image and never carry parser output, filenames, or stack traces.
 */

export const PIPELINE_ERROR_CODES = [
  'PIPELINE_DECODE_FAILED',
  'PIPELINE_DECODE_TIMEOUT',
  'PIPELINE_BYTES_UNAVAILABLE',
  'PIPELINE_HASH_FAILED',
  'PIPELINE_CONTRACT_VIOLATION',
] as const;

export type PipelineErrorCode = (typeof PIPELINE_ERROR_CODES)[number];

const MESSAGES: Readonly<Record<PipelineErrorCode, string>> = {
  PIPELINE_DECODE_FAILED:
    'The image could not be decoded, so no checks were run. The file may be truncated or malformed.',
  PIPELINE_DECODE_TIMEOUT:
    'The image could not be decoded within the time limit, so no checks were run.',
  PIPELINE_BYTES_UNAVAILABLE:
    'The selected file could not be read in this browser, so no checks were run.',
  PIPELINE_HASH_FAILED:
    'The file fingerprint could not be computed in this browser, so no checks were run.',
  PIPELINE_CONTRACT_VIOLATION:
    'An internal result failed its contract check and was discarded instead of being displayed or exported.',
};

export type PipelineError = Readonly<{
  code: PipelineErrorCode;
  message: string;
  recoverable: true;
}>;

export function pipelineError(code: PipelineErrorCode): PipelineError {
  return Object.freeze({
    code,
    message: MESSAGES[code],
    recoverable: true as const,
  });
}

export function isPipelineErrorCode(value: string): value is PipelineErrorCode {
  return (PIPELINE_ERROR_CODES as readonly string[]).includes(value);
}
