/**
 * Text coming out of a file — EXIF values, manifest strings, SDK explanations —
 * is hostile input. It is only ever rendered as text, but control and bidi
 * characters can still spoof or destroy a layout, so they are removed here
 * before a value reaches a domain model.
 */

const CONTROL_AND_BIDI_CHARACTERS =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Bounds and cleans an untrusted string for display. Returns `null` when
 * nothing printable remains, so callers can omit an empty field instead of
 * recording a meaningless value.
 */
export function sanitizeUntrustedText(raw: string, maxLength = 200): string | null {
  const cleaned = raw
    .replace(CONTROL_AND_BIDI_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}
