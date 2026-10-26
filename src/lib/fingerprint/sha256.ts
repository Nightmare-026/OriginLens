/**
 * SHA-256 over the exact uploaded byte version. The caller is responsible for
 * passing the original file bytes, never a preview, re-encoded image, or
 * orientation-normalized canvas.
 */

const SHA256_HEX = /^[a-f0-9]{64}$/;

function toHex(bytes: Uint8Array): string {
  let hex = '';

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

/**
 * Computes a lowercase hexadecimal SHA-256 digest using Web Crypto. Available
 * in browsers (secure context) and Node 20+.
 */
export async function sha256Hex(input: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', input);

  return toHex(new Uint8Array(digest));
}

export function isSha256Hex(value: string): boolean {
  return SHA256_HEX.test(value);
}
