/**
 * Generates the derived fixtures for acceptance testing:
 * 1. exif-orientation-6.jpg: A valid 1x1 JPEG with EXIF orientation 6 (rotated 90 CW),
 *    used for V20 (orientation preview normalization skip).
 * 2. adobe-20220124-C-tampered.jpg: Modified from adobe-20220124-C.jpg by flipping
 *    a single bit in the image scan data (offset 70,000, outside the C2PA JUMBF segment),
 *    triggering contentBindingValidation: "invalid" (assertion.dataHash.mismatch) for V04.
 *
 * Usage: node tests/fixtures/generate-derived-fixtures.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExifJpeg } from '../unit/helpers/exif-jpeg.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'c2pa');

// 1. exif-orientation-6.jpg
const exifBytes = buildExifJpeg({ orientation: 6, includeGps: true });
const exifPath = path.join(dir, 'exif-orientation-6.jpg');
writeFileSync(exifPath, exifBytes);
const exifSha256 = createHash('sha256').update(exifBytes).digest('hex');
console.log(`Wrote ${exifPath} (${exifBytes.length} bytes, sha256: ${exifSha256})`);

// 2. adobe-20220124-C-tampered.jpg
const originalPath = path.join(dir, 'adobe-20220124-C.jpg');
const original = readFileSync(originalPath);
const tampered = Buffer.from(original);
tampered[70000] ^= 0x01;
const tamperedPath = path.join(dir, 'adobe-20220124-C-tampered.jpg');
writeFileSync(tamperedPath, tampered);
const tamperedSha256 = createHash('sha256').update(tampered).digest('hex');
console.log(`Wrote ${tamperedPath} (${tampered.length} bytes, sha256: ${tamperedSha256})`);
