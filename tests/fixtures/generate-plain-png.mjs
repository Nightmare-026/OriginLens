/**
 * Generates the deterministic PNG fixture used by the Phase 5 product flow and
 * by the V02 acceptance case ("valid image, no embedded credential").
 *
 * Determinism matters: the committed bytes are pinned by byte length and
 * SHA-256 in tests/fixtures/manifest.json, and the fixtures unit test fails if
 * either drifts. This encoder therefore writes an uncompressed ("stored")
 * deflate stream instead of calling zlib, so the output does not depend on the
 * local zlib build. No ancillary chunks are emitted, so the image carries no
 * metadata and no C2PA manifest.
 *
 * Usage: node tests/fixtures/generate-plain-png.mjs
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 3;
const HEIGHT = 2;

/** A fixed 3x2 RGB pattern. The colours are arbitrary and carry no meaning. */
const ROWS = [
  [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ],
  [
    [255, 255, 0],
    [0, 255, 255],
    [255, 0, 255],
  ],
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;

  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

function u32(value) {
  const buffer = Buffer.alloc(4);

  buffer.writeUInt32BE(value >>> 0, 0);

  return buffer;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, data]);

  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}

/** zlib stream with stored deflate blocks, so the bytes never depend on zlib. */
function storedZlib(raw) {
  const blocks = [];
  const header = Buffer.from([0x78, 0x01]);

  blocks.push(header);

  for (let offset = 0; offset < raw.length || offset === 0; offset += 0xffff) {
    const slice = raw.subarray(offset, Math.min(offset + 0xffff, raw.length));
    const final = offset + slice.length >= raw.length ? 1 : 0;
    const length = slice.length;
    const blockHeader = Buffer.alloc(5);

    blockHeader.writeUInt8(final, 0);
    blockHeader.writeUInt16LE(length, 1);
    blockHeader.writeUInt16LE(~length & 0xffff, 3);
    blocks.push(blockHeader, slice);

    if (length === 0) {
      break;
    }
  }

  blocks.push(u32(adler32(raw)));

  return Buffer.concat(blocks);
}

function buildPng() {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // colour type: truecolour RGB
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const raw = [];

  for (const row of ROWS) {
    raw.push(0); // filter type: none

    for (const [red, green, blue] of row) {
      raw.push(red, green, blue);
    }
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', storedZlib(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png = buildPng();
const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'c2pa',
  'plain-3x2.png',
);

writeFileSync(target, png);

process.stdout.write(
  `${target}\nbyteLength: ${png.length}\nsha256: ${createHash('sha256').update(png).digest('hex')}\n`,
);
