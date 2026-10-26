/**
 * Format signals for the JPEG/PNG allowlist. Signatures are one signal only:
 * a signature does not prove that a file is well formed or that its contents
 * are safe to decode.
 */

export type SupportedFormat = 'jpeg' | 'png';
export type SupportedMimeType = 'image/jpeg' | 'image/png';

export const FORMAT_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
} as const satisfies Record<SupportedFormat, SupportedMimeType>;

const MIME_TO_FORMAT: Readonly<Record<string, SupportedFormat>> = {
  'image/jpeg': 'jpeg',
  // Some clients still emit the non-standard alias.
  'image/jpg': 'jpeg',
  'image/png': 'png',
};

const EXTENSION_TO_FORMAT: Readonly<Record<string, SupportedFormat>> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }

  return prefix.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let result = '';

  for (let index = start; index < start + length && index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === undefined) {
      break;
    }
    result += String.fromCharCode(byte);
  }

  return result;
}

/** Returns the format proven by the leading signature bytes, if any. */
export function detectFormatFromHeader(header: Uint8Array): SupportedFormat | null {
  if (startsWith(header, PNG_SIGNATURE)) {
    return 'png';
  }

  if (startsWith(header, JPEG_SIGNATURE)) {
    return 'jpeg';
  }

  return null;
}

/**
 * Recognizes common unsupported containers so the UI can explain that the
 * format is unsupported instead of reporting a corrupt JPEG/PNG. The returned
 * label comes from a controlled vocabulary, never from the input itself.
 */
export function detectUnsupportedFormat(header: Uint8Array): string | null {
  if (startsWith(header, [0x47, 0x49, 0x46, 0x38])) {
    return 'GIF';
  }

  if (ascii(header, 0, 4) === 'RIFF' && ascii(header, 8, 4) === 'WEBP') {
    return 'WebP';
  }

  if (startsWith(header, [0x42, 0x4d])) {
    return 'BMP';
  }

  if (startsWith(header, [0x49, 0x49, 0x2a, 0x00]) || startsWith(header, [0x4d, 0x4d, 0x00, 0x2a])) {
    return 'TIFF';
  }

  if (ascii(header, 4, 4) === 'ftyp') {
    const brand = ascii(header, 8, 4);

    if (brand === 'avif' || brand === 'avis') {
      return 'AVIF';
    }

    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand)) {
      return 'HEIC/HEIF';
    }
  }

  if (ascii(header, 0, 4) === '%PDF') {
    return 'PDF';
  }

  if (startsWith(header, [0x50, 0x4b, 0x03, 0x04]) || startsWith(header, [0x52, 0x61, 0x72, 0x21])) {
    return 'archive';
  }

  const leadingText = ascii(header, 0, header.length).trimStart().toLowerCase();
  if (leadingText.startsWith('<svg') || leadingText.startsWith('<?xml')) {
    return 'SVG/XML';
  }

  return null;
}

/** Normalizes a display filename to a bounded lowercase extension. */
export function normalizeExtension(fileName: string): string | null {
  const baseName = fileName.split(/[\\/]/).pop() ?? '';
  const dotIndex = baseName.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === baseName.length - 1) {
    return null;
  }

  const extension = baseName.slice(dotIndex + 1).toLowerCase();

  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : null;
}

/** Maps a JPEG/PNG extension to its format; unsupported extensions return null. */
export function formatFromExtension(extension: string): SupportedFormat | null {
  return EXTENSION_TO_FORMAT[extension] ?? null;
}

/** Maps a supported MIME value (including image/jpg) to its format. */
export function formatFromMime(mimeType: string): SupportedFormat | null {
  return MIME_TO_FORMAT[mimeType] ?? null;
}

/** Normalizes a browser MIME value; parameters and case are discarded. */
export function normalizeMimeType(mimeType: string): string {
  const [value = ''] = mimeType.split(';');
  return value.trim().toLowerCase();
}
