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
  hasCoordinates: boolean;
  latitude?: number;
  longitude?: number;
  latitudeRef?: 'N' | 'S';
  longitudeRef?: 'E' | 'W';
  altitude?: number;
  dmsLatitude?: string;
  dmsLongitude?: string;
  coarseLocation?: string;
  gpsTimestamp?: string;
  note?: string;
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

function parseCoordinateNumber(tag: unknown): number | null {
  if (tag === null || tag === undefined) {
    return null;
  }
  if (typeof tag === 'number' && Number.isFinite(tag)) {
    return tag;
  }
  if (typeof tag === 'object') {
    if (isRecord(tag)) {
      if (tag['description'] !== undefined) {
        const descResult = parseCoordinateNumber(tag['description']);
        if (descResult !== null) return descResult;
      }
      if (tag['value'] !== undefined) {
        const valResult = parseCoordinateNumber(tag['value']);
        if (valResult !== null) return valResult;
      }
    }
    if (Array.isArray(tag)) {
      if (tag.length === 3 && Array.isArray(tag[0]) && Array.isArray(tag[1]) && Array.isArray(tag[2])) {
        const d = (Number(tag[0][0]) || 0) / (Number(tag[0][1]) || 1);
        const m = (Number(tag[1][0]) || 0) / (Number(tag[1][1]) || 1);
        const s = (Number(tag[2][0]) || 0) / (Number(tag[2][1]) || 1);
        const res = d + m / 60 + s / 3600;
        return Number.isFinite(res) ? res : null;
      }
      if (tag.length === 3 && typeof tag[0] === 'number') {
        const res = (tag[0] || 0) + (Number(tag[1]) || 0) / 60 + (Number(tag[2]) || 0) / 3600;
        return Number.isFinite(res) ? res : null;
      }
      if (tag.length === 6 && typeof tag[0] === 'number') {
        const d = (tag[0] || 0) / (tag[1] || 1);
        const m = (tag[2] || 0) / (tag[3] || 1);
        const s = (tag[4] || 0) / (tag[5] || 1);
        const res = d + m / 60 + s / 3600;
        return Number.isFinite(res) ? res : null;
      }
      if (tag.length === 1 && typeof tag[0] === 'number') {
        return Number.isFinite(tag[0]) ? tag[0] : null;
      }
    }
  }
  if (typeof tag === 'string') {
    const s = tag.trim();
    if (!s) return null;
    const dmsMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:°|deg|d)\s*(\d+(?:\.\d+)?)\s*(?:'|min|m)\s*(\d+(?:\.\d+)?)/i);
    if (dmsMatch && dmsMatch[1] && dmsMatch[2] && dmsMatch[3]) {
      const res = parseFloat(dmsMatch[1]) + parseFloat(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
      return Number.isFinite(res) ? res : null;
    }
    const xmpMatch = s.match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/);
    if (xmpMatch && xmpMatch[1] && xmpMatch[2]) {
      const res = parseFloat(xmpMatch[1]) + parseFloat(xmpMatch[2]) / 60;
      return Number.isFinite(res) ? res : null;
    }
    const parts = s.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 3 && parts.every((p) => !Number.isNaN(parseFloat(p)))) {
      const res = parseFloat(parts[0]!) + parseFloat(parts[1]!) / 60 + parseFloat(parts[2]!) / 3600;
      return Number.isFinite(res) ? res : null;
    }
    const num = parseFloat(s);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

function parseRef(refTag: unknown, coordTag: unknown, type: 'lat'): 'N' | 'S';
function parseRef(refTag: unknown, coordTag: unknown, type: 'lon'): 'E' | 'W';
function parseRef(
  refTag: unknown,
  coordTag: unknown,
  type: 'lat' | 'lon',
): 'N' | 'S' | 'E' | 'W' {
  const defaultRef = type === 'lat' ? 'N' : 'E';
  const oppositeRef = type === 'lat' ? 'S' : 'W';

  if (refTag !== undefined && refTag !== null) {
    let str = '';
    if (typeof refTag === 'string') {
      str = refTag;
    } else if (isRecord(refTag)) {
      str = String(refTag['value'] ?? refTag['description'] ?? '');
    } else if (Array.isArray(refTag)) {
      str = refTag.join('');
    }
    str = str.toUpperCase();
    if (str.includes(oppositeRef)) return oppositeRef;
    if (str.includes(defaultRef)) return defaultRef;
  }

  if (coordTag !== undefined && coordTag !== null) {
    let str = '';
    if (typeof coordTag === 'string') {
      str = coordTag;
    } else if (isRecord(coordTag)) {
      str = String(coordTag['description'] ?? coordTag['value'] ?? '');
    }
    str = str.toUpperCase();
    if (str.includes(oppositeRef)) return oppositeRef;
    if (str.includes(defaultRef)) return defaultRef;
  }

  return defaultRef;
}

/**
 * On-demand client-side extraction of GPS coordinates from volatile in-memory image bytes.
 * This runs ONLY when the user explicitly triggers an unmask action, preserving
 * the default privacy and anti-doxxing invariants of OriginLens.
 */
export function extractGpsDetails(bytes: ArrayBuffer): GpsCoordinates | null {
  let expandedTags: Record<string, unknown> | null = null;
  let rawTags: Tags | null = null;

  try {
    expandedTags = load(bytes, { expanded: true }) as unknown as Record<string, unknown>;
  } catch {
    // expanded mode may throw on partial data
  }

  try {
    rawTags = load(bytes);
  } catch {
    // standard mode may throw
  }

  if (!expandedTags && !rawTags) {
    return null;
  }

  const allTags: Record<string, unknown> = {
    ...(rawTags as unknown as Record<string, unknown> || {}),
  };

  if (expandedTags) {
    if (isRecord(expandedTags['exif'])) {
      Object.assign(allTags, expandedTags['exif']);
    }
    if (isRecord(expandedTags['xmp'])) {
      Object.assign(allTags, expandedTags['xmp']);
    }
    if (isRecord(expandedTags['gps'])) {
      Object.assign(allTags, expandedTags['gps']);
    }
  }

  // 1. Direct parsed values from ExifReader expanded.gps if available
  let directLat: number | null = null;
  let directLon: number | null = null;
  let directAlt: number | null = null;

  if (expandedTags && isRecord(expandedTags['gps'])) {
    const gpsObj = expandedTags['gps'];
    if (typeof gpsObj['Latitude'] === 'number' && Number.isFinite(gpsObj['Latitude'])) {
      directLat = gpsObj['Latitude'];
    }
    if (typeof gpsObj['Longitude'] === 'number' && Number.isFinite(gpsObj['Longitude'])) {
      directLon = gpsObj['Longitude'];
    }
    if (typeof gpsObj['Altitude'] === 'number' && Number.isFinite(gpsObj['Altitude'])) {
      directAlt = gpsObj['Altitude'];
    }
  }

  // 2. Tag lookup fallbacks across EXIF and XMP naming variants
  const latTag = allTags['GPSLatitude'] ?? allTags['exif:GPSLatitude'] ?? allTags['xmp:GPSLatitude'] ?? allTags['GPS Latitude'] ?? allTags['Latitude'];
  const lonTag = allTags['GPSLongitude'] ?? allTags['exif:GPSLongitude'] ?? allTags['xmp:GPSLongitude'] ?? allTags['GPS Longitude'] ?? allTags['Longitude'];
  const latRefTag = allTags['GPSLatitudeRef'] ?? allTags['exif:GPSLatitudeRef'] ?? allTags['xmp:GPSLatitudeRef'];
  const lonRefTag = allTags['GPSLongitudeRef'] ?? allTags['exif:GPSLongitudeRef'] ?? allTags['xmp:GPSLongitudeRef'];
  const altTag = allTags['GPSAltitude'] ?? allTags['exif:GPSAltitude'] ?? allTags['Altitude'];
  const altRefTag = allTags['GPSAltitudeRef'] ?? allTags['exif:GPSAltitudeRef'];
  const dateTag = allTags['GPSDateStamp'] ?? allTags['exif:GPSDateStamp'];
  const timeTag = allTags['GPSTimeStamp'] ?? allTags['exif:GPSTimeStamp'];

  let lat = directLat ?? parseCoordinateNumber(latTag);
  let lon = directLon ?? parseCoordinateNumber(lonTag);

  let latRef = parseRef(latRefTag, latTag, 'lat');
  let lonRef = parseRef(lonRefTag, lonTag, 'lon');

  if (lat !== null) {
    if (lat < 0) {
      latRef = 'S';
    } else if (latRef === 'S') {
      lat = -Math.abs(lat);
    } else {
      lat = Math.abs(lat);
    }
  }

  if (lon !== null) {
    if (lon < 0) {
      lonRef = 'W';
    } else if (lonRef === 'W') {
      lon = -Math.abs(lon);
    } else {
      lon = Math.abs(lon);
    }
  }

  // Parse altitude
  let altitude: number | undefined = directAlt ?? undefined;
  if (altitude === undefined && altTag !== undefined && altTag !== null) {
    const parsedAlt = parseCoordinateNumber(altTag);
    if (parsedAlt !== null && Number.isFinite(parsedAlt) && parsedAlt >= -500 && parsedAlt <= 50000) {
      let altRef = 0;
      if (isRecord(altRefTag)) {
        altRef = Number(altRefTag['value'] ?? altRefTag['description'] ?? 0);
      } else if (typeof altRefTag === 'number') {
        altRef = altRefTag;
      }
      altitude = altRef === 1 ? -Math.abs(parsedAlt) : Math.abs(parsedAlt);
    }
  }

  // Parse GPS Timestamp
  let gpsTimestamp: string | undefined;
  if (dateTag !== undefined || timeTag !== undefined) {
    const d = tagToText(dateTag) || (typeof dateTag === 'string' ? dateTag : '');
    const t = tagToText(timeTag) || (typeof timeTag === 'string' ? timeTag : '');
    if (d && t) {
      gpsTimestamp = `${d} ${t} UTC`;
    } else if (d || t) {
      gpsTimestamp = `${d || t} UTC`;
    }
  }

  const hasCoordinates = lat !== null || lon !== null;

  if (hasCoordinates) {
    const safeLat = lat ?? 0;
    const safeLon = lon ?? 0;

    if (safeLat >= -90 && safeLat <= 90 && safeLon >= -180 && safeLon <= 180) {
      const dmsLatitude = toDms(safeLat, 'lat');
      const dmsLongitude = toDms(safeLon, 'lon');
      const coarseLat = `${Math.abs(Math.round(safeLat * 10) / 10).toFixed(1)}° ${safeLat >= 0 ? 'N' : 'S'}`;
      const coarseLon = `${Math.abs(Math.round(safeLon * 10) / 10).toFixed(1)}° ${safeLon >= 0 ? 'E' : 'W'}`;
      const coarseLocation = `~${coarseLat}, ~${coarseLon} (approx. ±10 km region)`;

      return {
        hasCoordinates: true,
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
  }

  // Check if any GPS tags exist in the file at all
  const hasGpsTags =
    GPS_PRESENCE_KEYS.some((key) => key in allTags) ||
    'exif:GPSLatitude' in allTags ||
    'exif:GPSLongitude' in allTags ||
    'xmp:GPSLatitude' in allTags ||
    'xmp:GPSLongitude' in allTags ||
    (expandedTags && isRecord(expandedTags['gps']) && Object.keys(expandedTags['gps']).length > 0);

  if (hasGpsTags) {
    return {
      hasCoordinates: false,
      altitude: altitude !== undefined ? Math.round(altitude * 10) / 10 : undefined,
      gpsTimestamp,
      note: gpsTimestamp
        ? `GPS satellite timestamp (${gpsTimestamp}) was detected, but physical latitude/longitude coordinates were not recorded by the camera.`
        : 'GPS metadata directory was detected in the file header, but physical latitude/longitude coordinates were not recorded or were stripped.',
    };
  }

  return null;
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
