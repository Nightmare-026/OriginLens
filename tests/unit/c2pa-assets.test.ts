import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  C2PA_SDK_VERSION,
  C2PA_TRUST_POLICY_ID,
  C2PA_WASM_PATH,
  C2PA_WASM_SHA256,
  C2PA_WASM_SRI,
} from '@/lib/c2pa/asset';

/**
 * Supply-chain guard for the pinned C2PA runtime. If a dependency bump, a
 * partial install, or a stale copied asset changes the bytes the browser will
 * execute, these tests fail before the app can claim anything about a manifest.
 */

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('@contentauth/c2pa-web/package.json');
const packageDirectory = path.dirname(packageJsonPath);
const installedPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  version: string;
};

const installedWasm = readFileSync(
  path.join(packageDirectory, 'dist', 'resources', 'c2pa_bg.wasm'),
);
const publicWasmPath = fileURLToPath(
  new URL(`../../public/c2pa/${C2PA_SDK_VERSION}/c2pa_bg.wasm`, import.meta.url),
);
const copiedWasm = readFileSync(publicWasmPath);

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('pinned C2PA runtime assets', () => {
  it('pins the exact installed SDK version', () => {
    expect(C2PA_SDK_VERSION).toBe('0.15.4');
    expect(installedPackage.version).toBe(C2PA_SDK_VERSION);
  });

  it('serves the WebAssembly binary from a versioned same-origin path', () => {
    expect(C2PA_WASM_PATH).toBe(`/c2pa/${C2PA_SDK_VERSION}/c2pa_bg.wasm`);
  });

  it('copies the exact SDK bytes into public/', () => {
    expect(sha256(copiedWasm)).toBe(C2PA_WASM_SHA256);
    expect(sha256(installedWasm)).toBe(C2PA_WASM_SHA256);
    expect(copiedWasm.equals(installedWasm)).toBe(true);
  });

  it('declares the SHA-512 integrity value the SDK itself verifies', () => {
    const computedSri = `sha512-${createHash('sha512').update(installedWasm).digest('base64')}`;

    expect(computedSri).toBe(C2PA_WASM_SRI);
  });

  it('finds the declared integrity value inside the installed SDK bundle', () => {
    const distDirectory = path.join(packageDirectory, 'dist');
    const bundles = readdirSync(distDirectory).filter((name) => name.endsWith('.js'));
    const matches = bundles.filter((name) =>
      readFileSync(path.join(distDirectory, name), 'utf8').includes(C2PA_WASM_SRI),
    );

    expect(matches.length).toBeGreaterThan(0);
  });

  it('keeps the WASM digest a well-formed SHA-256 hex string', () => {
    expect(C2PA_WASM_SHA256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('records the trust policy this build actually applies', () => {
    expect(C2PA_TRUST_POLICY_ID).toBe('originlens-embedded-only-no-trust-anchors-v1');
  });
});
