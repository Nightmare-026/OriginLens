import { errors, load, type Tags } from 'exifreader';

/**
 * A narrow allowlist of embedded metadata. Every value is an unverified clue:
 * metadata can be absent, copied, edited, or misleading, and is never proof of
 * origin, authorship, or authenticity.
 *
 * GPS coordinates are deliberately not extracted into the domain model. Only
 * their presence is reported, and exports never contain location coordinates.
 */

export const EXIFREADER_VERSION = '4.52.0';

export type MetadataFieldKey =
  | 'captureTime'
  | 'software'
  | 'orientation'
  | 'cameraMake'
  | 'cameraModel';

export type MetadataField = Readonly<{
  key: MetadataFieldKey;
  label: string;
  value: string | number;
  valueType: 'text' | 'number';
  authority: 'unverified_metadata';
}>;

export type GpsPresence = 'present' | 'not_present' | 'unknown';

export type MetadataInspection =
  | Readonly<{
      status: 'extracted';
      fields: readonly MetadataField[];
      gpsPresence: GpsPresence;
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
    }>
  | Readonly<{
      status: 'not_present';
      fields: readonly [];
      gpsPresence: 'not_present';
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
    }>
  | Readonly<{
      status: 'failed';
      fields: readonly [];
      gpsPresence: 'unknown';
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
      errorCode: 'METADATA_PARSE_FAILED';
    }>;

const PARSER = { name: 'exifreader', version: EXIFREADER_VERSION } as const;

const LIMITATIONS = [
  'Metadata is an unverified clue. It may be absent, copied, edited, or misleading.',
  'GPS coordinates are never extracted into results in this build; only their presence is reported.',
  'A capture-time string does not establish a trustworthy timestamp because its timezone is often unspecified.',
  'Embedded metadata is not cryptographic provenance and does not establish who created or depicted the image.',
] as const;

const TEXT_FIELDS = [
  {
    key: 'captureTime',
    label: 'Capture time (embedded text, timezone unspecified)',
    tags: ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'],
  },
  {
    key: 'software',
    label: 'Software',
    tags: ['Software'],
  },
  {
    key: 'cameraMake',
    label: 'Camera make',
    tags: ['Make'],
  },
  {
    key: 'cameraModel',
    label: 'Camera model',
    tags: ['Model'],
  },
] as const;

const GPS_PRESENCE_KEYS = [
  'GPSVersionID',
  'GPSLatitude',
  'GPSLongitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'GPSAltitude',
  'GPSTimeStamp',
  'GPSDateStamp',
  'GPS Info IFD Pointer',
] as const;

const CONTROL_AND_BIDI_CHARACTERS =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Bounds and cleans an untrusted metadata string for display. */
export function sanitizeMetadataText(raw: string, maxLength = 200): string | null {
  const cleaned = raw
    .replace(CONTROL_AND_BIDI_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function tagToText(tag: unknown): string | null {
  if (!isRecord(tag)) {
    return null;
  }

  const description = tag['description'];

  if (typeof description === 'string') {
    return sanitizeMetadataText(description);
  }

  if (Array.isArray(description)) {
    const parts = description
      .filter((part): part is string => typeof part === 'string')
      .map((part) => sanitizeMetadataText(part))
      .filter((part): part is string => part !== null);

    return parts.length > 0 ? sanitizeMetadataText(parts.join(', ')) : null;
  }

  const value = tag['value'];

  if (typeof value === 'string') {
    return sanitizeMetadataText(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter((part): part is string => typeof part === 'string')
      .map((part) => sanitizeMetadataText(part))
      .filter((part): part is string => part !== null);

    return parts.length > 0 ? sanitizeMetadataText(parts.join(', ')) : null;
  }

  return null;
}

function extractTextFields(tags: Record<string, unknown>): MetadataField[] {
  const fields: MetadataField[] = [];

  for (const definition of TEXT_FIELDS) {
    for (const tagName of definition.tags) {
      const text = tagToText(tags[tagName]);

      if (text !== null) {
        fields.push({
          key: definition.key,
          label: definition.label,
          value: text,
          valueType: 'text',
          authority: 'unverified_metadata',
        });
        break;
      }
    }
  }

  return fields;
}

function extractOrientation(tags: Record<string, unknown>): {
  field: MetadataField | null;
  warning: string | null;
} {
  const tag = tags['Orientation'];

  if (!isRecord(tag)) {
    return { field: null, warning: null };
  }

  const value = tag['value'];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 8) {
    return {
      field: null,
      warning:
        'An orientation value was present but outside the documented 1-8 range. It was not displayed.',
    };
  }

  return {
    field: {
      key: 'orientation',
      label: 'Orientation',
      value,
      valueType: 'number',
      authority: 'unverified_metadata',
    },
    warning: null,
  };
}

function detectGpsPresence(tags: Record<string, unknown>): GpsPresence {
  return GPS_PRESENCE_KEYS.some((key) => key in tags) ? 'present' : 'not_present';
}

/**
 * Parses embedded metadata with the pinned ExifReader version and returns only
 * allowlisted, bounded fields. Parser failures become a typed, non-critical
 * result and never destroy independent checks.
 */
export function inspectMetadata(bytes: ArrayBuffer): MetadataInspection {
  let rawTags: Tags;

  try {
    rawTags = load(bytes);
  } catch (error) {
    if (error instanceof errors.MetadataMissingError) {
      return {
        status: 'not_present',
        fields: [],
        gpsPresence: 'not_present',
        parser: PARSER,
        warnings: [
          'No embedded metadata was found. This does not mean the file has no provenance or was never edited.',
        ],
        limitations: [...LIMITATIONS],
      };
    }

    return {
      status: 'failed',
      fields: [],
      gpsPresence: 'unknown',
      parser: PARSER,
      warnings: ['Embedded metadata could not be parsed. Independent checks are unaffected.'],
      limitations: [...LIMITATIONS],
      errorCode: 'METADATA_PARSE_FAILED',
    };
  }

  // ExifReader returns a broad, runtime-shaped union. Treat it as untrusted
  // parser output and validate each allowlisted value before use.
  const tags = rawTags as unknown as Record<string, unknown>;
  const fields = extractTextFields(tags);
  const orientation = extractOrientation(tags);

  if (orientation.field !== null) {
    fields.push(orientation.field);
  }

  const warnings: string[] = [];

  if (orientation.warning !== null) {
    warnings.push(orientation.warning);
  }

  if (fields.length === 0) {
    warnings.push('No allowlisted metadata fields were found.');

    return {
      status: 'extracted',
      fields: [],
      gpsPresence: detectGpsPresence(tags),
      parser: PARSER,
      warnings,
      limitations: [...LIMITATIONS],
    };
  }

  return {
    status: 'extracted',
    fields,
    gpsPresence: detectGpsPresence(tags),
    parser: PARSER,
    warnings,
    limitations: [...LIMITATIONS],
  };
}
