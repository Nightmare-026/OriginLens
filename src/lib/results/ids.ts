/**
 * Session-only identifiers. They carry no user identity and are never derived
 * from filenames, hashes, or content.
 */

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export type IdPrefix = 'file' | 'chk' | 'ev' | 'rpt';

export const ID_PATTERNS = {
  file: /^file_[A-Za-z0-9_-]{6,40}$/,
  chk: /^chk_[A-Za-z0-9_-]{6,40}$/,
  ev: /^ev_[A-Za-z0-9_-]{6,40}$/,
  rpt: /^rpt_[A-Za-z0-9_-]{6,40}$/,
} as const;

/**
 * Creates a random identifier with 16 characters of suffix entropy. 256 is an
 * exact multiple of the 64-character alphabet, so modulo selection is uniform.
 */
export function createId(prefix: IdPrefix): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let suffix = '';

  for (const byte of bytes) {
    suffix += ID_ALPHABET.charAt(byte % ID_ALPHABET.length);
  }

  return `${prefix}_${suffix}`;
}

export function isValidId(prefix: IdPrefix, value: string): boolean {
  return ID_PATTERNS[prefix].test(value);
}
