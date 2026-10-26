import { describe, expect, it } from 'vitest';
import { isSha256Hex, sha256Hex } from '@/lib/fingerprint/sha256';

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('SHA-256 fingerprint', () => {
  it('matches the published empty-input test vector', async () => {
    await expect(sha256Hex(new Uint8Array(0))).resolves.toBe(EMPTY_SHA256);
  });

  it('matches the published "abc" test vector from a typed array', async () => {
    await expect(sha256Hex(new TextEncoder().encode('abc'))).resolves.toBe(ABC_SHA256);
  });

  it('matches the same vector from an ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('abc');
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    await expect(sha256Hex(buffer)).resolves.toBe(ABC_SHA256);
  });

  it('hashes exactly the view, not the surrounding buffer', async () => {
    const padded = Uint8Array.from([0xff, 0x61, 0x62, 0x63, 0xff]);

    await expect(sha256Hex(padded.subarray(1, 4))).resolves.toBe(ABC_SHA256);
  });

  it('changes when an input byte changes', async () => {
    const original = new TextEncoder().encode('abc');
    const changed = new TextEncoder().encode('abd');

    expect(await sha256Hex(original)).not.toBe(await sha256Hex(changed));
  });
});

describe('SHA-256 format guard', () => {
  it('accepts lowercase 64-character digests', () => {
    expect(isSha256Hex(EMPTY_SHA256)).toBe(true);
  });

  it('rejects malformed digests', () => {
    expect(isSha256Hex(EMPTY_SHA256.toUpperCase())).toBe(false);
    expect(isSha256Hex(EMPTY_SHA256.slice(1))).toBe(false);
    expect(isSha256Hex(`${EMPTY_SHA256}0`)).toBe(false);
    expect(isSha256Hex('not-a-hash')).toBe(false);
  });
});
