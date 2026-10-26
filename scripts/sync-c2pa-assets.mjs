/**
 * Copies the pinned c2pa-web WebAssembly binary into public/ so the browser
 * fetches it same-origin. The script refuses to copy bytes that do not match
 * the exact package version, SHA-256 digest, and SHA-512 SRI the SDK itself
 * verifies at runtime.
 *
 * Run automatically by predev, prebuild, and pretest.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const EXPECTED_PACKAGE = '@contentauth/c2pa-web';
const EXPECTED_VERSION = '0.15.4';
const EXPECTED_SHA256 = '01b8e25f637aaa3fe197bc5646ce114810db4789db19af7e1f6bfebe9e9858df';
const EXPECTED_SRI =
  'sha512-kE5aMTH5JnHL2DqAcxv9AbgXLkecSavJNXEnrsaLGz1lN8nSFbbEze/jqSJqRKpa1Q5f6U3Vk9jXcVfmfvxjkw==';

function fail(message) {
  console.error(`[c2pa-assets] ${message}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve(`${EXPECTED_PACKAGE}/package.json`);
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

if (packageJson.version !== EXPECTED_VERSION) {
  fail(
    `Installed ${EXPECTED_PACKAGE} is ${packageJson.version}, but this app pins ${EXPECTED_VERSION}. Update the pin, asset hashes, and adapter together.`,
  );
}

const sourcePath = path.join(
  path.dirname(packageJsonPath),
  'dist',
  'resources',
  'c2pa_bg.wasm',
);
const bytes = await readFile(sourcePath);

const sha256 = createHash('sha256').update(bytes).digest('hex');
const sha512Base64 = createHash('sha512').update(bytes).digest('base64');
const sri = `sha512-${sha512Base64}`;

if (sha256 !== EXPECTED_SHA256) {
  fail(`WASM SHA-256 mismatch. Expected ${EXPECTED_SHA256}, received ${sha256}.`);
}

if (sri !== EXPECTED_SRI) {
  fail('WASM SHA-512 SRI mismatch. The SDK integrity check would reject these bytes.');
}

const targetDirectory = path.join(process.cwd(), 'public', 'c2pa', EXPECTED_VERSION);
const targetPath = path.join(targetDirectory, 'c2pa_bg.wasm');

await mkdir(targetDirectory, { recursive: true });

try {
  const existing = await readFile(targetPath);

  if (existing.equals(bytes)) {
    console.log(`[c2pa-assets] public/c2pa/${EXPECTED_VERSION}/c2pa_bg.wasm is current.`);
    process.exit(0);
  }
} catch {
  // Missing or unreadable target: write a fresh copy below.
}

await writeFile(targetPath, bytes);
console.log(
  `[c2pa-assets] Copied ${EXPECTED_PACKAGE}@${EXPECTED_VERSION} WASM to public/c2pa/${EXPECTED_VERSION}/c2pa_bg.wasm (${bytes.byteLength} bytes, sha256 ${sha256}).`,
);
