import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@/lib/fingerprint/sha256';
import { buildExifJpeg, buildPlainJpeg } from './helpers/exif-jpeg';

/**
 * The manifest is repository-owned data, not hostile input. The cast is kept
 * local to this test; production code validates every external value.
 */
type FixtureRecord = Readonly<{
  id: string;
  generation: string;
  source: string;
  license: string;
  byteLength: number;
  sha256: string;
  expected: Readonly<Record<string, unknown>>;
  expectationEstablishedBy: string;
}>;

type FixtureManifest = Readonly<{
  schemaVersion: string;
  updatedAtUtc: string;
  verificationEnvironment: string;
  notes: readonly string[];
  fixtures: readonly FixtureRecord[];
  pendingCategories: readonly string[];
}>;

const manifestPath = fileURLToPath(new URL('../fixtures/manifest.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as FixtureManifest;

function fixture(id: string): FixtureRecord {
  const found = manifest.fixtures.find((entry) => entry.id === id);

  if (found === undefined) {
    throw new Error(`Fixture manifest is missing ${id}.`);
  }

  return found;
}

describe('fixture provenance manifest', () => {
  it('records each fixture once with a valid hash and byte length', () => {
    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.fixtures.length).toBeGreaterThan(0);
    expect(new Set(manifest.fixtures.map((entry) => entry.id)).size).toBe(manifest.fixtures.length);

    for (const entry of manifest.fixtures) {
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(Number.isSafeInteger(entry.byteLength)).toBe(true);
      expect(entry.byteLength).toBeGreaterThan(0);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(entry.license.length).toBeGreaterThan(0);
      expect(entry.expectationEstablishedBy.length).toBeGreaterThan(0);
      expect(Object.keys(entry.expected).length).toBeGreaterThan(0);
    }
  });

  it('keeps the synthetic EXIF fixture bytes identical to the recorded hash', async () => {
    const bytes = buildExifJpeg();
    const entry = fixture('synthetic-exif-jpeg');

    expect(bytes.byteLength).toBe(entry.byteLength);
    await expect(sha256Hex(bytes)).resolves.toBe(entry.sha256);
  });

  it('keeps the synthetic plain JPEG bytes identical to the recorded hash', async () => {
    const bytes = buildPlainJpeg();
    const entry = fixture('synthetic-plain-jpeg');

    expect(bytes.byteLength).toBe(entry.byteLength);
    await expect(sha256Hex(bytes)).resolves.toBe(entry.sha256);
  });

  it('states which required fixture categories remain unverified', () => {
    expect(manifest.pendingCategories.length).toBeGreaterThan(0);
    expect(manifest.pendingCategories.join(' ')).toMatch(/C2PA/);
    expect(manifest.notes.join(' ')).toMatch(/No binary C2PA fixture/);
  });
});
