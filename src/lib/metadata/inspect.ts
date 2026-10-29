import { errors, load, type Tags } from 'exifreader';
import { sanitizeUntrustedText } from '@/lib/security/text';

/**
 * A narrow allowlist of embedded metadata. Every value is an unverified clue:
 * metadata can be absent, copied, edited, or misleading, and is never proof of
 * origin, authorship, or authenticity.
 *
 * GPS coordinates are deliberately not extracted into the domain model. Only
 * their presence is reported, and exports never contain location coordinates.
 */

export const EXIFREADER_VERSION = '4.52.0';

export const METADATA_FIELD_KEYS = [
  'captureTime',
  'software',
  'orientation',
  'cameraMake',
  'cameraModel',
] as const;

export type MetadataFieldKey = (typeof METADATA_FIELD_KEYS)[number];

/**
 * A typed orientation summary for the comparison path. `not_upright` means a
 * rotation/flip tag outside the identity value was recorded; `invalid` means a
 * tag existed but could not be interpreted; `unknown` means the parser failed.
 * The preview metric refuses to run unless both files are `absent` or
 * `upright`, because this build never applies an orientation transform itself.
 */
export type OrientationStatus = 'absent' | 'upright' | 'not_upright' | 'invalid' | 'unknown';

export type MetadataField = Readonly<{
  key: MetadataFieldKey;
  label: string;
  value: string | number;
  valueType: 'text' | 'number';
  authority: 'unverified_metadata';
}>;

export type GpsPresence = 'present' | 'not_present' | 'unknown';

export type AiGeneratorClue = Readonly<{
  generator: string;
  tagSource: string;
  matchedText: string;
}>;

export type MetadataInspection =
  | Readonly<{
      status: 'extracted';
      fields: readonly MetadataField[];
      gpsPresence: GpsPresence;
      orientationStatus: Exclude<OrientationStatus, 'unknown'>;
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
      aiGeneratorClues?: readonly AiGeneratorClue[];
    }>
  | Readonly<{
      status: 'not_present';
      fields: readonly [];
      gpsPresence: 'not_present';
      orientationStatus: 'absent';
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
      aiGeneratorClues?: readonly [];
    }>
  | Readonly<{
      status: 'failed';
      fields: readonly [];
      gpsPresence: 'unknown';
      orientationStatus: 'unknown';
      parser: Readonly<{ name: 'exifreader'; version: string }>;
      warnings: readonly string[];
      limitations: readonly string[];
      errorCode: 'METADATA_PARSE_FAILED';
      aiGeneratorClues?: readonly [];
    }>;

export const METADATA_PARSER = { name: 'exifreader', version: EXIFREADER_VERSION } as const;

export const METADATA_LIMITATIONS = [
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Bounds and cleans an untrusted metadata string for display. The shared
 * implementation lives in `security/text`; this alias keeps the metadata
 * vocabulary local to this module.
 */
export const sanitizeMetadataText = sanitizeUntrustedText;

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
  status: Exclude<OrientationStatus, 'unknown'>;
} {
  const tag = tags['Orientation'];

  if (!isRecord(tag)) {
    return { field: null, warning: null, status: 'absent' };
  }

  const value = tag['value'];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 8) {
    return {
      field: null,
      warning:
        'An orientation value was present but outside the documented 1-8 range. It was not displayed.',
      status: 'invalid',
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
    status: value === 1 ? 'upright' : 'not_upright',
  };
}

function detectGpsPresence(tags: Record<string, unknown>): GpsPresence {
  return GPS_PRESENCE_KEYS.some((key) => key in tags) ? 'present' : 'not_present';
}

export type GpsCoordinates = Readonly<{
  latitude: number;
  longitude: number;
  latitudeRef: 'N' | 'S';
  longitudeRef: 'E' | 'W';
  altitude?: number;
  dmsLatitude: string;
  dmsLongitude: string;
  coarseLocation: string;
  gpsTimestamp?: string;
}>;

function toDms(coordinate: number, type: 'lat' | 'lon'): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 10) / 10;
  const direction = type === 'lat' ? (coordinate >= 0 ? 'N' : 'S') : (coordinate >= 0 ? 'E' : 'W');
  return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
}

/**
 * On-demand client-side extraction of GPS coordinates from volatile in-memory image bytes.
 * This runs ONLY when the user explicitly triggers an unmask action, preserving
 * the default privacy and anti-doxxing invariants of OriginLens.
 */
export function extractGpsDetails(bytes: ArrayBuffer): GpsCoordinates | null {
  let rawTags: Tags;
  try {
    rawTags = load(bytes);
  } catch {
    return null;
  }

  const tags = rawTags as unknown as Record<string, unknown>;
  const latTag = tags['GPSLatitude'];
  const lonTag = tags['GPSLongitude'];

  if (!isRecord(latTag) && !isRecord(lonTag)) {
    return null;
  }

  let lat = Number.NaN;
  if (isRecord(latTag)) {
    const desc = latTag['description'];
    lat = typeof desc === 'number' ? desc : parseFloat(String(desc));
  }

  let lon = Number.NaN;
  if (isRecord(lonTag)) {
    const desc = lonTag['description'];
    lon = typeof desc === 'number' ? desc : parseFloat(String(desc));
  }

  if (Number.isNaN(lat) && Number.isNaN(lon)) {
    return null;
  }

  let latRef: 'N' | 'S' = 'N';
  const latRefTag = tags['GPSLatitudeRef'];
  if (isRecord(latRefTag)) {
    const refStr = String(latRefTag['value'] ?? latRefTag['description'] ?? '').toUpperCase();
    if (refStr.includes('S')) {
      latRef = 'S';
      if (!Number.isNaN(lat)) lat = -Math.abs(lat);
    } else {
      latRef = 'N';
      if (!Number.isNaN(lat)) lat = Math.abs(lat);
    }
  }

  let lonRef: 'E' | 'W' = 'E';
  const lonRefTag = tags['GPSLongitudeRef'];
  if (isRecord(lonRefTag)) {
    const refStr = String(lonRefTag['value'] ?? lonRefTag['description'] ?? '').toUpperCase();
    if (refStr.includes('W')) {
      lonRef = 'W';
      if (!Number.isNaN(lon)) lon = -Math.abs(lon);
    } else {
      lonRef = 'E';
      if (!Number.isNaN(lon)) lon = Math.abs(lon);
    }
  }

  const safeLat = Number.isNaN(lat) ? 0 : lat;
  const safeLon = Number.isNaN(lon) ? 0 : lon;

  if (safeLat < -90 || safeLat > 90 || safeLon < -180 || safeLon > 180) {
    return null;
  }

  let altitude: number | undefined;
  const altTag = tags['GPSAltitude'];
  if (isRecord(altTag)) {
    const desc = altTag['description'];
    const parsedAlt = typeof desc === 'number' ? desc : parseFloat(String(desc));
    if (!Number.isNaN(parsedAlt) && Number.isFinite(parsedAlt) && parsedAlt >= -500 && parsedAlt <= 50000) {
      const altRefTag = tags['GPSAltitudeRef'];
      const altRef = isRecord(altRefTag) ? Number(altRefTag['value']) : 0;
      altitude = altRef === 1 ? -Math.abs(parsedAlt) : Math.abs(parsedAlt);
    }
  }

  let gpsTimestamp: string | undefined;
  const dateTag = tags['GPSDateStamp'];
  const timeTag = tags['GPSTimeStamp'];
  if (isRecord(dateTag) && isRecord(timeTag)) {
    const d = String(dateTag['description'] ?? dateTag['value'] ?? '');
    const t = String(timeTag['description'] ?? timeTag['value'] ?? '');
    if (d && t) {
      gpsTimestamp = `${d} ${t} UTC`;
    }
  }

  const dmsLatitude = toDms(safeLat, 'lat');
  const dmsLongitude = toDms(safeLon, 'lon');
  const coarseLat = `${Math.abs(Math.round(safeLat * 10) / 10).toFixed(1)}° ${safeLat >= 0 ? 'N' : 'S'}`;
  const coarseLon = `${Math.abs(Math.round(safeLon * 10) / 10).toFixed(1)}° ${safeLon >= 0 ? 'E' : 'W'}`;
  const coarseLocation = `~${coarseLat}, ~${coarseLon} (approx. ±10 km region)`;

  return {
    latitude: Math.round(safeLat * 1000000) / 1000000,
    longitude: Math.round(safeLon * 1000000) / 1000000,
    latitudeRef: latRef,
    longitudeRef: lonRef,
    altitude: altitude !== undefined ? Math.round(altitude * 10) / 10 : undefined,
    dmsLatitude,
    dmsLongitude,
    coarseLocation,
    gpsTimestamp,
  };
}

const AI_GENERATOR_PATTERNS = [
  {
    generator: 'Midjourney',
    regex: /(?:midjourney|job\s*id|--v\s+[4-7]|--ar\s+\d+:\d+|--stylize)/i,
  },
  {
    generator: 'Stable Diffusion',
    regex: /(?:stable\s*diffusion|automatic1111|comfyui|sdxl|flux(?:\.1)?|fooocus|negative\s*prompt:|sampler:\s*[\w+]|cfg\s*scale:|steps:\s*\d+)/i,
  },
  {
    generator: 'DALL-E',
    regex: /(?:dall[·\-e]\s*e|openai\s*dall)/i,
  },
  {
    generator: 'Adobe Firefly',
    regex: /(?:adobe\s*firefly|firefly\s*generative)/i,
  },
] as const;

function scanAiGeneratorClues(tags: Record<string, unknown>): AiGeneratorClue[] {
  const clues: AiGeneratorClue[] = [];
  const scannedKeys = [
    'Software',
    'parameters',
    'prompt',
    'workflow',
    'UserComment',
    'ImageDescription',
    'Comment',
    'Description',
    'Source',
    'Artist',
    'Title',
  ];

  for (const key of scannedKeys) {
    const rawTag = tags[key];
    const text = tagToText(rawTag);
    if (!text) continue;

    for (const pattern of AI_GENERATOR_PATTERNS) {
      if (pattern.regex.test(text)) {
        if (!clues.some((c) => c.generator === pattern.generator)) {
          clues.push({
            generator: pattern.generator,
            tagSource: key,
            matchedText: text.length > 120 ? `${text.slice(0, 117)}...` : text,
          });
        }
      }
    }
  }

  return clues;
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
        orientationStatus: 'absent',
        parser: METADATA_PARSER,
        warnings: [
          'No embedded metadata was found. This does not mean the file has no provenance or was never edited.',
        ],
        limitations: [...METADATA_LIMITATIONS],
        aiGeneratorClues: [],
      };
    }

    return {
      status: 'failed',
      fields: [],
      gpsPresence: 'unknown',
      orientationStatus: 'unknown',
      parser: METADATA_PARSER,
      warnings: ['Embedded metadata could not be parsed. Independent checks are unaffected.'],
      limitations: [...METADATA_LIMITATIONS],
      errorCode: 'METADATA_PARSE_FAILED',
      aiGeneratorClues: [],
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

  const aiGeneratorClues = scanAiGeneratorClues(tags);
  if (aiGeneratorClues.length > 0) {
    const names = aiGeneratorClues.map((c) => c.generator).join(', ');
    warnings.push(
      `Detected textual tags referencing AI software (${names}). Metadata is easily forged or stripped; this is an unverified textual clue, not cryptographic proof.`,
    );
  }

  if (fields.length === 0) {
    warnings.push('No allowlisted metadata fields were found.');

    return {
      status: 'extracted',
      fields: [],
      gpsPresence: detectGpsPresence(tags),
      orientationStatus: orientation.status,
      parser: METADATA_PARSER,
      warnings,
      limitations: [...METADATA_LIMITATIONS],
      aiGeneratorClues,
    };
  }

  return {
    status: 'extracted',
    fields,
    gpsPresence: detectGpsPresence(tags),
    orientationStatus: orientation.status,
    parser: METADATA_PARSER,
    warnings,
    limitations: [...METADATA_LIMITATIONS],
    aiGeneratorClues,
  };
}
