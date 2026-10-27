import { inflateSync } from 'node:zlib';

/**
 * Minimal PNG scanline reader used only by the fixture tests.
 *
 * Its job is to prove a fixture expectation independently of the app: that two
 * committed PNG encodings really do decode to the same pixels. It is not a
 * production decoder, it never runs in the browser, and it refuses anything
 * outside the narrow shape the project generates (8-bit truecolour, no
 * interlacing) instead of guessing.
 */

export type DecodedPng = Readonly<{
  width: number;
  height: number;
  /** Row-major RGB triples, one entry per byte. */
  pixels: readonly number[];
}>;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BYTES_PER_PIXEL = 3;

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000 +
      ((bytes[offset + 1] ?? 0) << 16) +
      ((bytes[offset + 2] ?? 0) << 8) +
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function unfilter(
  filterType: number,
  row: Uint8Array,
  previous: Uint8Array | null,
): Uint8Array {
  const output = new Uint8Array(row.length);

  for (let index = 0; index < row.length; index += 1) {
    const raw = row[index] ?? 0;
    const left = index >= BYTES_PER_PIXEL ? (output[index - BYTES_PER_PIXEL] ?? 0) : 0;
    const above = previous === null ? 0 : (previous[index] ?? 0);
    const upperLeft =
      previous === null || index < BYTES_PER_PIXEL
        ? 0
        : (previous[index - BYTES_PER_PIXEL] ?? 0);

    switch (filterType) {
      case 0:
        output[index] = raw;
        break;
      case 1:
        output[index] = (raw + left) & 0xff;
        break;
      case 2:
        output[index] = (raw + above) & 0xff;
        break;
      case 3:
        output[index] = (raw + Math.floor((left + above) / 2)) & 0xff;
        break;
      case 4: {
        const estimate = left + above - upperLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceAbove = Math.abs(estimate - above);
        const distanceUpperLeft = Math.abs(estimate - upperLeft);
        const predictor =
          distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft
            ? left
            : distanceAbove <= distanceUpperLeft
              ? above
              : upperLeft;

        output[index] = (raw + predictor) & 0xff;
        break;
      }
      default:
        throw new Error(`Unsupported PNG filter type ${filterType}.`);
    }
  }

  return output;
}

export function decodePngPixels(bytes: Uint8Array): DecodedPng {
  for (const [index, expected] of PNG_SIGNATURE.entries()) {
    if (bytes[index] !== expected) {
      throw new Error('Not a PNG file.');
    }
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  const dataChunks: Uint8Array[] = [];

  while (offset + 8 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    );
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = readUint32(data, 0);
      height = readUint32(data, 4);

      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) {
        throw new Error('Only 8-bit, non-interlaced truecolour PNG is supported here.');
      }
    } else if (type === 'IDAT') {
      dataChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  const concatenated = new Uint8Array(
    dataChunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let written = 0;

  for (const chunk of dataChunks) {
    concatenated.set(chunk, written);
    written += chunk.length;
  }

  const raw = new Uint8Array(inflateSync(concatenated));
  const stride = width * BYTES_PER_PIXEL;
  const pixels: number[] = [];
  let previous: Uint8Array | null = null;

  for (let row = 0; row < height; row += 1) {
    const start = row * (stride + 1);
    const filterType = raw[start] ?? 0;
    const rowBytes = raw.subarray(start + 1, start + 1 + stride);
    const decoded = unfilter(filterType, rowBytes, previous);

    pixels.push(...decoded);
    previous = decoded;
  }

  return { width, height, pixels };
}
