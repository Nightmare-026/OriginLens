/**
 * Synthetic EXIF/JPEG fixtures built byte-by-byte for tests. The JPEG body is
 * a 1x1 image; the APP1 segment is inserted after the SOI marker.
 *
 * These are test fixtures, not provenance evidence. They establish only that
 * the allowlist parser and sanitizer handle known field values.
 */

const TYPE_ASCII = 2;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

const JPEG_1X1_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

export const EXIF_MAKE = 'Canon';
export const EXIF_MODEL = 'EOS R5';
export const EXIF_SOFTWARE = 'OriginTest';
export const EXIF_DATETIME = '2026:10:27 12:00:00';

type Entry = {
  tag: number;
  type: number;
  count: number;
  data?: number[];
  value?: number;
};

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function asciiWithNul(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0)).concat([0]);
}

function entryBytes(entry: Entry, dataOffset: number): number[] {
  const header = [...u16(entry.tag), ...u16(entry.type), ...u32(entry.count)];

  if (entry.data !== undefined) {
    return [...header, ...u32(dataOffset)];
  }

  if (entry.type === TYPE_SHORT) {
    return [...header, ...u16(entry.value ?? 0), 0, 0];
  }

  return [...header, ...u32(entry.value ?? 0)];
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export type ExifJpegOptions = Readonly<{
  orientation?: number;
  includeGps?: boolean;
}>;

export function buildExifJpeg(options: ExifJpegOptions = {}): Uint8Array<ArrayBuffer> {
  const orientation = options.orientation ?? 6;
  const includeGps = options.includeGps ?? true;

  const make = asciiWithNul(EXIF_MAKE);
  const model = asciiWithNul(EXIF_MODEL);
  const software = asciiWithNul(EXIF_SOFTWARE);
  const dateTime = asciiWithNul(EXIF_DATETIME);

  const ifd0: Entry[] = [
    { tag: 0x010f, type: TYPE_ASCII, count: make.length, data: make },
    { tag: 0x0110, type: TYPE_ASCII, count: model.length, data: model },
    { tag: 0x0112, type: TYPE_SHORT, count: 1, value: orientation },
    { tag: 0x0131, type: TYPE_ASCII, count: software.length, data: software },
    { tag: 0x0132, type: TYPE_ASCII, count: dateTime.length, data: dateTime },
  ];

  const gpsPointer: Entry = { tag: 0x8825, type: TYPE_LONG, count: 1, value: 0 };

  if (includeGps) {
    ifd0.push(gpsPointer);
  }

  const ifd0Size = 2 + ifd0.length * 12 + 4;
  let cursor = 8 + ifd0Size;

  const dataEntries = ifd0.filter((entry) => entry.data !== undefined);
  const dataOffsets = new Map<Entry, number>();

  for (const entry of dataEntries) {
    dataOffsets.set(entry, cursor);
    cursor += entry.data?.length ?? 0;
  }

  const gpsOffset = cursor;
  const gpsEntries: Entry[] = includeGps
    ? [
        { tag: 0x0001, type: TYPE_ASCII, count: 2, data: asciiWithNul('N') },
        {
          tag: 0x0002,
          type: TYPE_RATIONAL,
          count: 3,
          data: [
            ...u32(37),
            ...u32(1),
            ...u32(46),
            ...u32(1),
            ...u32(30),
            ...u32(1),
          ],
        },
      ]
    : [];

  if (includeGps) {
    gpsPointer.value = gpsOffset;
  }

  const gpsIfdSize = includeGps ? 2 + gpsEntries.length * 12 + 4 : 0;
  let gpsCursor = gpsOffset + gpsIfdSize;

  const gpsDataOffsets = new Map<Entry, number>();

  for (const entry of gpsEntries) {
    if (entry.data !== undefined) {
      gpsDataOffsets.set(entry, gpsCursor);
      gpsCursor += entry.data.length;
    }
  }

  const tiff: number[] = [0x49, 0x49, 0x2a, 0x00, ...u32(8), ...u16(ifd0.length)];

  for (const entry of ifd0) {
    tiff.push(...entryBytes(entry, dataOffsets.get(entry) ?? 0));
  }

  tiff.push(...u32(0));

  for (const entry of dataEntries) {
    tiff.push(...(entry.data ?? []));
  }

  if (includeGps) {
    tiff.push(...u16(gpsEntries.length));

    for (const entry of gpsEntries) {
      tiff.push(...entryBytes(entry, gpsDataOffsets.get(entry) ?? 0));
    }

    tiff.push(...u32(0));

    for (const entry of gpsEntries) {
      tiff.push(...(entry.data ?? []));
    }
  }

  // "Exif\0\0" followed by the TIFF structure.
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const segmentLength = payload.length + 2;
  const base = decodeBase64(JPEG_1X1_BASE64);

  const jpeg = [
    0xff,
    0xd8,
    0xff,
    0xe1,
    (segmentLength >>> 8) & 0xff,
    segmentLength & 0xff,
    ...payload,
    ...base.subarray(2),
  ];

  return Uint8Array.from(jpeg);
}

/** Builds a valid 1x1 JPEG with no EXIF APP1 segment. */
export function buildPlainJpeg(): Uint8Array<ArrayBuffer> {
  return decodeBase64(JPEG_1X1_BASE64);
}

/** Copies a typed array into an exact ArrayBuffer for parser input. */
export function toArrayBuffer(bytes: Uint8Array<ArrayBuffer>): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
