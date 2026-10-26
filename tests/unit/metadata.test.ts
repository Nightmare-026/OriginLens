import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  EXIFREADER_VERSION,
  inspectMetadata,
  sanitizeMetadataText,
} from '@/lib/metadata/inspect';
import {
  buildExifJpeg,
  buildPlainJpeg,
  EXIF_DATETIME,
  EXIF_MAKE,
  EXIF_MODEL,
  EXIF_SOFTWARE,
  toArrayBuffer,
} from './helpers/exif-jpeg';

const require = createRequire(import.meta.url);

function extractedFields(result: ReturnType<typeof inspectMetadata>) {
  if (result.status !== 'extracted') {
    throw new Error(`Expected extracted metadata, got ${result.status}.`);
  }

  return result.fields;
}

describe('metadata allowlist', () => {
  it('extracts only the allowlisted fields from a real EXIF segment', () => {
    const result = inspectMetadata(toArrayBuffer(buildExifJpeg()));
    const fields = new Map(extractedFields(result).map((field) => [field.key, field]));

    expect(fields.get('cameraMake')?.value).toBe(EXIF_MAKE);
    expect(fields.get('cameraModel')?.value).toBe(EXIF_MODEL);
    expect(fields.get('software')?.value).toBe(EXIF_SOFTWARE);
    expect(fields.get('captureTime')?.value).toBe(EXIF_DATETIME);
    expect(fields.get('orientation')?.value).toBe(6);
    expect(result.gpsPresence).toBe('present');
    expect(result.parser).toEqual({ name: 'exifreader', version: EXIFREADER_VERSION });
  });

  it('labels every value as unverified metadata', () => {
    const result = inspectMetadata(toArrayBuffer(buildExifJpeg()));
    const fields = extractedFields(result);

    expect(fields.length).toBeGreaterThan(0);

    for (const field of fields) {
      expect(field.authority).toBe('unverified_metadata');
      expect(['text', 'number']).toContain(field.valueType);
    }
  });

  it('reports GPS presence without extracting coordinates', () => {
    const result = inspectMetadata(toArrayBuffer(buildExifJpeg()));
    const serialized = JSON.stringify(result);

    expect(result.gpsPresence).toBe('present');
    expect(extractedFields(result).every((field) => !/gps/i.test(field.key))).toBe(true);
    expect(serialized).not.toMatch(/GPSLatitude|GPSLongitude/);
    expect(serialized).not.toContain('37.775');
    expect(serialized).not.toContain('37/1');
  });

  it('reports GPS absence when no GPS tags exist', () => {
    const result = inspectMetadata(toArrayBuffer(buildExifJpeg({ includeGps: false })));

    expect(result.gpsPresence).toBe('not_present');
  });

  it('drops out-of-range orientation and explains why', () => {
    const result = inspectMetadata(toArrayBuffer(buildExifJpeg({ orientation: 99 })));
    const fields = extractedFields(result);

    expect(fields.some((field) => field.key === 'orientation')).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/outside the documented 1-8 range/);
  });

  it('returns a parsed result with no allowlisted fields for a plain JPEG', () => {
    const result = inspectMetadata(toArrayBuffer(buildPlainJpeg()));

    expect(result.status).toBe('extracted');
    expect(result.fields).toHaveLength(0);
    expect(result.gpsPresence).toBe('not_present');
    expect(result.warnings.join(' ')).toMatch(/No allowlisted metadata fields/);
  });

  it('turns an unreadable input into a typed, non-critical failure', () => {
    const result = inspectMetadata(
      toArrayBuffer(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])),
    );

    if (result.status !== 'failed') {
      throw new Error(`Expected a failed metadata inspection, got ${result.status}.`);
    }

    expect(result.errorCode).toBe('METADATA_PARSE_FAILED');
    expect(result.gpsPresence).toBe('unknown');
    expect(result.fields).toHaveLength(0);

    // The parser's raw exception message must not reach the result.
    expect(result.warnings.join(' ')).not.toMatch(/Invalid image format/i);
  });

  it('keeps the declared parser version in sync with the installed package', () => {
    const installed = require('exifreader/package.json') as { version: string };

    expect(EXIFREADER_VERSION).toBe(installed.version);
  });
});

describe('metadata text sanitization', () => {
  it('strips control and bidi characters and collapses whitespace', () => {
    expect(sanitizeMetadataText('  Canon\u0000\u202E  EOS\nR5  ')).toBe('Canon EOS R5');
  });

  it('bounds long values', () => {
    expect(sanitizeMetadataText('x'.repeat(300))).toHaveLength(200);
  });

  it('rejects empty or control-only values', () => {
    expect(sanitizeMetadataText('   ')).toBeNull();
    expect(sanitizeMetadataText('\u0000\u0001\u202E')).toBeNull();
  });

  it('preserves ordinary text and punctuation', () => {
    expect(sanitizeMetadataText("Adobe Photoshop 26.0 (Windows) — © 2026")).toBe(
      'Adobe Photoshop 26.0 (Windows) — © 2026',
    );
  });
});
