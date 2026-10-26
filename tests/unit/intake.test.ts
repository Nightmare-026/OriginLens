import { describe, expect, it } from 'vitest';
import {
  detectFormatFromHeader,
  detectUnsupportedFormat,
  normalizeExtension,
} from '@/lib/intake/format';
import {
  checkFileCount,
  preflightFile,
  sanitizeDisplayName,
  validateDeclaredFile,
  validateDimensions,
  validateHeader,
  type FileDescriptor,
  type ValidationResult,
} from '@/lib/intake/preflight';
import type { SafeError } from '@/lib/security/errors';
import { MAX_FILE_BYTES } from '@/lib/security/limits';

const JPEG_HEADER = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const PNG_HEADER = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const GIF_HEADER = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
]);

function expectFailure<T>(result: ValidationResult<T>): SafeError {
  if (result.ok) {
    throw new Error('Expected validation to fail.');
  }

  return result.error;
}

function expectSuccess<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected validation to pass, got ${result.error.code}.`);
  }

  return result.value;
}

function descriptor(overrides: Partial<FileDescriptor> = {}): FileDescriptor {
  return {
    name: 'photo.jpg',
    declaredMimeType: 'image/jpeg',
    byteSize: 1024,
    ...overrides,
  };
}

describe('format signals', () => {
  it('detects JPEG and PNG signatures', () => {
    expect(detectFormatFromHeader(JPEG_HEADER)).toBe('jpeg');
    expect(detectFormatFromHeader(PNG_HEADER)).toBe('png');
  });

  it('does not claim a format from insufficient or foreign bytes', () => {
    expect(detectFormatFromHeader(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(detectFormatFromHeader(Uint8Array.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it('recognizes common unsupported formats from a bounded header', () => {
    const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x2a, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const heic = Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    const avif = Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
    const tiff = Uint8Array.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0, 0, 0]);
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');

    expect(detectUnsupportedFormat(GIF_HEADER)).toBe('GIF');
    expect(detectUnsupportedFormat(webp)).toBe('WebP');
    expect(detectUnsupportedFormat(heic)).toBe('HEIC/HEIF');
    expect(detectUnsupportedFormat(avif)).toBe('AVIF');
    expect(detectUnsupportedFormat(tiff)).toBe('TIFF');
    expect(detectUnsupportedFormat(pdf)).toBe('PDF');
    expect(detectUnsupportedFormat(svg)).toBe('SVG/XML');
    expect(detectUnsupportedFormat(JPEG_HEADER)).toBeNull();
  });

  it('normalizes only bounded, alphanumeric extensions', () => {
    expect(normalizeExtension('photo.JPG')).toBe('jpg');
    expect(normalizeExtension('photo.jpeg')).toBe('jpeg');
    expect(normalizeExtension('dir/photo.png')).toBe('png');
    expect(normalizeExtension('photo')).toBeNull();
    expect(normalizeExtension('.hidden')).toBeNull();
    expect(normalizeExtension('photo.')).toBeNull();
    expect(normalizeExtension('photo.jp g')).toBeNull();
    expect(normalizeExtension('photo.verylongextension')).toBeNull();
  });
});

describe('display names', () => {
  it('strips path components and keeps only the base name', () => {
    expect(sanitizeDisplayName('C:\\Users\\evil\\photo.jpg')).toBe('photo.jpg');
    expect(sanitizeDisplayName('/tmp/photo.jpg')).toBe('photo.jpg');
    expect(sanitizeDisplayName('dir\\')).toBe('image');
  });

  it('removes control and bidi characters and bounds length', () => {
    expect(sanitizeDisplayName('bad\u0000name\u202Egnp.jpg')).toBe('badnamegnp.jpg');
    expect(sanitizeDisplayName('a'.repeat(300))).toHaveLength(200);
    expect(sanitizeDisplayName('   ')).toBe('image');
  });
});

describe('declared file validation', () => {
  it('rejects empty, unsafe, and oversized files before reading bytes', () => {
    expect(expectFailure(validateDeclaredFile(descriptor({ byteSize: 0 }))).code).toBe('EMPTY_FILE');
    expect(expectFailure(validateDeclaredFile(descriptor({ byteSize: -1 }))).code).toBe(
      'INVALID_FILE_SIZE',
    );
    expect(expectFailure(validateDeclaredFile(descriptor({ byteSize: Number.NaN }))).code).toBe(
      'INVALID_FILE_SIZE',
    );
    expect(expectFailure(validateDeclaredFile(descriptor({ byteSize: 1.5 }))).code).toBe(
      'INVALID_FILE_SIZE',
    );
    expect(
      expectFailure(validateDeclaredFile(descriptor({ byteSize: MAX_FILE_BYTES + 1 }))).code,
    ).toBe('FILE_TOO_LARGE');
  });

  it('accepts the exact byte limit', () => {
    expect(validateDeclaredFile(descriptor({ byteSize: MAX_FILE_BYTES })).ok).toBe(true);
  });

  it('rejects unsupported extensions with a clear code', () => {
    for (const name of ['photo.webp', 'photo.svg', 'photo.heic', 'photo', 'photo.jpg.exe']) {
      expect(expectFailure(validateDeclaredFile(descriptor({ name }))).code).toBe(
        'UNSUPPORTED_FORMAT',
      );
    }
  });

  it('rejects extension and browser MIME conflicts', () => {
    expect(
      expectFailure(validateDeclaredFile(descriptor({ declaredMimeType: 'image/png' }))).code,
    ).toBe('FORMAT_MISMATCH');
    expect(
      expectFailure(validateDeclaredFile(descriptor({ declaredMimeType: 'image/webp' }))).code,
    ).toBe('FORMAT_MISMATCH');
    expect(
      expectFailure(validateDeclaredFile(descriptor({ declaredMimeType: 'text/plain' }))).code,
    ).toBe('FORMAT_MISMATCH');
  });

  it('treats an absent browser MIME as unknown rather than valid', () => {
    const result = expectSuccess(validateDeclaredFile(descriptor({ declaredMimeType: '' })));

    expect(result.declaredMimeType).toBeNull();
    expect(result.warnings).toHaveLength(1);
  });

  it('accepts application/octet-stream only as unknown, with a warning', () => {
    const result = expectSuccess(
      validateDeclaredFile(descriptor({ declaredMimeType: 'application/octet-stream' })),
    );

    expect(result.declaredMimeType).toBeNull();
    expect(result.warnings).toHaveLength(1);
  });

  it('normalizes the non-standard image/jpg alias with a warning', () => {
    const result = expectSuccess(
      validateDeclaredFile(descriptor({ declaredMimeType: 'image/jpg' })),
    );

    expect(result.declaredMimeType).toBe('image/jpeg');
    expect(result.warnings.join(' ')).toMatch(/image\/jpg/);
  });

  it('ignores MIME parameters and case', () => {
    const result = expectSuccess(
      validateDeclaredFile(descriptor({ declaredMimeType: ' IMAGE/JPEG; charset=binary' })),
    );

    expect(result.declaredMimeType).toBe('image/jpeg');
    expect(result.warnings).toHaveLength(0);
  });
});

describe('header validation', () => {
  it('rejects a header too short to identify an image', () => {
    const declared = expectSuccess(validateDeclaredFile(descriptor()));

    expect(expectFailure(validateHeader(declared, Uint8Array.from([0xff, 0xd8]))).code).toBe(
      'CORRUPT_IMAGE',
    );
  });

  it('rejects content whose signature disagrees with the extension', () => {
    const declared = expectSuccess(validateDeclaredFile(descriptor()));

    expect(expectFailure(validateHeader(declared, PNG_HEADER)).code).toBe('FORMAT_MISMATCH');
  });

  it('reports known unsupported content separately from a mismatch', () => {
    const declared = expectSuccess(validateDeclaredFile(descriptor()));

    expect(expectFailure(validateHeader(declared, GIF_HEADER)).code).toBe('UNSUPPORTED_FORMAT');
  });

  it('accepts a matching signature', () => {
    const declared = expectSuccess(validateDeclaredFile(descriptor()));

    expect(expectSuccess(validateHeader(declared, JPEG_HEADER))).toBe('jpeg');
  });

  it('accepts PNG content declared as PNG', () => {
    const declared = expectSuccess(
      validateDeclaredFile(descriptor({ name: 'photo.png', declaredMimeType: 'image/png' })),
    );

    expect(expectSuccess(validateHeader(declared, PNG_HEADER))).toBe('png');
  });
});

describe('dimension limits', () => {
  it('rejects invalid dimensions before allocation', () => {
    for (const dimensions of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: -1, height: 100 },
      { width: 100.5, height: 100 },
      { width: Number.POSITIVE_INFINITY, height: 100 },
      { width: Number.NaN, height: 100 },
    ]) {
      expect(expectFailure(validateDimensions(dimensions)).code).toBe('INVALID_DIMENSIONS');
    }
  });

  it('accepts exactly 20 megapixels', () => {
    expect(expectSuccess(validateDimensions({ width: 5000, height: 4000 }))).toEqual({
      width: 5000,
      height: 4000,
    });
  });

  it('rejects one pixel over the budget and oversized sides', () => {
    expect(expectFailure(validateDimensions({ width: 5000, height: 4001 })).code).toBe(
      'PIXEL_LIMIT_EXCEEDED',
    );
    expect(expectFailure(validateDimensions({ width: 20_000_001, height: 1 })).code).toBe(
      'PIXEL_LIMIT_EXCEEDED',
    );

    // A narrow strip below the total pixel budget is valid; only the product
    // and the safe-integer math are constrained, not the aspect ratio.
    expect(expectSuccess(validateDimensions({ width: 100_000, height: 1 }))).toEqual({
      width: 100_000,
      height: 1,
    });
  });
});

describe('session file count', () => {
  it('allows at most two files', () => {
    expect(checkFileCount(0)).toBeNull();
    expect(checkFileCount(1)).toBeNull();
    expect(checkFileCount(2)?.code).toBe('FILE_COUNT_EXCEEDED');
    expect(checkFileCount(-1)?.code).toBe('FILE_COUNT_EXCEEDED');
    expect(checkFileCount(1.5)?.code).toBe('FILE_COUNT_EXCEEDED');
  });
});

describe('preflight orchestration', () => {
  it('returns a validated file for matching signals and dimensions', () => {
    const result = expectSuccess(
      preflightFile({
        descriptor: descriptor(),
        header: JPEG_HEADER,
        dimensions: { width: 4000, height: 3000 },
      }),
    );

    expect(result.detectedFormat).toBe('jpeg');
    expect(result.detectedMimeType).toBe('image/jpeg');
    expect(result.displayName).toBe('photo.jpg');
    expect(result.width * result.height).toBe(12_000_000);
  });

  it('checks size before header or decoder work', () => {
    const error = expectFailure(
      preflightFile({
        descriptor: descriptor({ byteSize: MAX_FILE_BYTES + 1 }),
        header: Uint8Array.from([0x00]),
        dimensions: { width: 0, height: 0 },
      }),
    );

    expect(error.code).toBe('FILE_TOO_LARGE');
  });

  it('checks signatures before dimensions', () => {
    const error = expectFailure(
      preflightFile({
        descriptor: descriptor(),
        header: PNG_HEADER,
        dimensions: { width: 0, height: 0 },
      }),
    );

    expect(error.code).toBe('FORMAT_MISMATCH');
  });
});
