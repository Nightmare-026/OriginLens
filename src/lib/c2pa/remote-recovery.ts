import { isSha256Hex } from '@/lib/fingerprint/sha256';

/**
 * Remote / Durable C2PA Credential Recovery (Feature 2).
 *
 * Provides on-demand discovery of durable cloud-stored C2PA manifests for
 * images whose embedded metadata has been stripped during upload or compression.
 *
 * Privacy Invariants:
 * - 100% zero-knowledge: ONLY the 64-character SHA-256 hash is transmitted.
 * - Dispatched ONLY upon explicit, deliberate user consent.
 * - Never transmits image bytes, EXIF data, or original filenames.
 */

export const DEFAULT_CAI_CLOUD_REGISTRY = 'https://manifests.contentauthenticity.org/api/v1/manifest';

export type RecoveredManifestSummary = Readonly<{
  manifestId: string;
  claimGenerator: string;
  title: string | null;
  format: string;
  signingTime: string | null;
  issuer: string | null;
  registryUrl: string;
  actionsCount: number;
  ingredientsCount: number;
}>;

export type RemoteRecoveryResult = Readonly<{
  status: 'recovered' | 'not_found' | 'error';
  sha256: string;
  registry: string;
  searchedAtUtc: string;
  recoveredManifest: RecoveredManifestSummary | null;
  message: string;
}>;

export async function queryRemoteManifestRegistry(
  sha256: string,
  registryUrl = DEFAULT_CAI_CLOUD_REGISTRY,
): Promise<RemoteRecoveryResult> {
  const searchedAtUtc = new Date().toISOString();

  if (!isSha256Hex(sha256)) {
    return {
      status: 'error',
      sha256,
      registry: registryUrl,
      searchedAtUtc,
      recoveredManifest: null,
      message: 'Invalid SHA-256 format for remote manifest lookup.',
    };
  }

  try {
    const response = await fetch('/api/c2pa/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256, registryUrl }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const errorMsg = errorJson?.error ?? `Registry query failed with HTTP ${response.status}`;
      return {
        status: 'error',
        sha256,
        registry: registryUrl,
        searchedAtUtc,
        recoveredManifest: null,
        message: errorMsg,
      };
    }

    const data = await response.json();

    if (data.status === 'recovered' && data.recoveredManifest) {
      return {
        status: 'recovered',
        sha256,
        registry: registryUrl,
        searchedAtUtc,
        recoveredManifest: data.recoveredManifest,
        message: 'Durable C2PA manifest successfully recovered from cloud registry.',
      };
    }

    return {
      status: 'not_found',
      sha256,
      registry: registryUrl,
      searchedAtUtc,
      recoveredManifest: null,
      message: 'No registered C2PA manifest was found for this image SHA-256 fingerprint in the public registry.',
    };
  } catch (err) {
    return {
      status: 'error',
      sha256,
      registry: registryUrl,
      searchedAtUtc,
      recoveredManifest: null,
      message: err instanceof Error ? err.message : 'Network error during cloud manifest query.',
    };
  }
}
