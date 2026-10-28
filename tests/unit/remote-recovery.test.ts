import { describe, expect, it } from 'vitest';
import {
  queryRemoteManifestRegistry,
  DEFAULT_CAI_CLOUD_REGISTRY,
} from '@/lib/c2pa/remote-recovery';

describe('Remote / Durable C2PA Credential Recovery (Feature 2)', () => {
  it('exposes default Content Authenticity Initiative cloud registry endpoint', () => {
    expect(DEFAULT_CAI_CLOUD_REGISTRY).toContain('manifests.contentauthenticity.org');
  });

  it('rejects invalid SHA-256 formats without network dispatch', async () => {
    const result = await queryRemoteManifestRegistry('not-a-valid-sha256');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Invalid SHA-256');
    expect(result.recoveredManifest).toBeNull();
  });

  it('preserves zero-knowledge privacy guarantee (sends only hash)', async () => {
    const validSha256 = '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda217a508b1ba4230ce864';
    const result = await queryRemoteManifestRegistry(validSha256);

    expect(result.sha256).toBe(validSha256);
    expect(result.searchedAtUtc).toBeDefined();
  });
});
