import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapManifestStore } from '@/lib/c2pa/map';

/**
 * The recorded fixture is the actual output of the pinned SDK (`c2pa-web`
 * 0.15.4) in Chromium for `adobe-20220124-C.jpg`. Expectations below come from
 * that recording, not from the file's name or documentation.
 */
const recordedStorePath = fileURLToPath(
  new URL('../fixtures/c2pa/adobe-20220124-C.sdk-0.15.4-manifest-store.json', import.meta.url),
);
const recordedStore: unknown = JSON.parse(readFileSync(recordedStorePath, 'utf8'));

function buildStore(overrides: Record<string, unknown> = {}): unknown {
  return {
    active_manifest: 'urn:test:active',
    manifests: {
      'urn:test:active': {
        title: 'test.jpg',
        format: 'image/jpeg',
        claim_generator: 'fixture/1.0',
        assertions: [],
        ingredients: [],
      },
    },
    validation_results: {
      activeManifest: { success: [], informational: [], failure: [] },
      specVersion: '2.4.0',
    },
    validation_state: 'Valid',
    ...overrides,
  };
}

describe('C2PA manifest store mapping', () => {
  it('maps the recorded SDK output without inventing entries', () => {
    const store = mapManifestStore(recordedStore);

    expect(store).not.toBeNull();
    expect(store?.validationState).toBe('Valid');
    expect(store?.claimGenerator).toBe('make_test_images/0.16.1 c2pa-rs/0.16.1');
    expect(store?.title).toBe('C.jpg');
    expect(store?.format).toBe('image/jpeg');
    expect(store?.activeManifestLabel).toBe(
      'contentauth:urn:uuid:4d971750-1db4-4492-a87c-5c3e7ed33efc',
    );
    expect(store?.omittedEntryCount).toBe(0);
  });

  it('deduplicates repeated status codes and keeps SDK order', () => {
    const store = mapManifestStore(recordedStore);

    expect(store?.statusEntries.map((entry) => entry.code)).toEqual([
      'timeStamp.validated',
      'timeStamp.trusted',
      'claimSignature.insideValidity',
      'claimSignature.validated',
      'assertion.hashedURI.match',
      'assertion.dataHash.match',
      'signingCredential.ocsp.skipped',
      'signingCredential.untrusted',
    ]);
  });

  it('groups statuses exactly as the SDK reported them', () => {
    const store = mapManifestStore(recordedStore);
    const groups = new Map(store?.statusEntries.map((entry) => [entry.code, entry.group]));

    expect(groups.get('claimSignature.validated')).toBe('success');
    expect(groups.get('signingCredential.ocsp.skipped')).toBe('informational');
    expect(groups.get('signingCredential.untrusted')).toBe('failure');
  });

  it('keeps recorded actions in order and preserves no ingredients', () => {
    const store = mapManifestStore(recordedStore);

    expect(store?.actions).toEqual([
      { actionCode: 'c2pa.created' },
      { actionCode: 'c2pa.drawing' },
    ]);
    expect(store?.ingredients).toEqual([]);
  });

  it('ignores assertions that are not action assertions', () => {
    const store = mapManifestStore(
      buildStore({
        manifests: {
          'urn:test:active': {
            assertions: [
              { label: 'stds.schema-org.CreativeWork', data: { actions: [{ action: 'x' }] } },
              { label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.edited' }] } },
              { label: 'c2pa.actions.v2', data: { actions: [{ action: 'c2pa.placed' }] } },
            ],
          },
        },
      }),
    );

    expect(store?.actions).toEqual([
      { actionCode: 'c2pa.edited' },
      { actionCode: 'c2pa.placed' },
    ]);
  });

  it('accepts a single store-level status object', () => {
    const store = mapManifestStore(
      buildStore({
        validation_status: {
          code: 'signingCredential.untrusted',
          explanation: 'signing certificate untrusted',
        },
      }),
    );

    expect(store?.statusEntries).toEqual([
      {
        code: 'signingCredential.untrusted',
        group: 'informational',
        explanation: 'signing certificate untrusted',
        url: null,
      },
    ]);
  });

  it('marks store-level statuses success or failure only on an explicit flag', () => {
    const store = mapManifestStore(
      buildStore({
        validation_status: [
          { code: 'a.success', success: true },
          { code: 'b.failure', success: false },
          { code: 'c.unknown' },
        ],
      }),
    );

    expect(store?.statusEntries.map((entry) => [entry.code, entry.group])).toEqual([
      ['a.success', 'success'],
      ['b.failure', 'failure'],
      ['c.unknown', 'informational'],
    ]);
  });

  it('sanitizes hostile manifest strings instead of passing them through', () => {
    const hostile = `  evil\u0000\u202E title  ${'x'.repeat(400)}`;
    const store = mapManifestStore(
      buildStore({
        manifests: {
          'urn:test:active': {
            title: hostile,
            claim_generator: `gen\u0007erator`,
            assertions: [{ label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created' }] } }],
          },
        },
      }),
    );

    expect(store?.title?.startsWith('evil title x')).toBe(true);
    expect(store?.title).toHaveLength(200);
    expect(store?.title).not.toMatch(/[\u0000\u202E]/);
    expect(store?.claimGenerator).toBe('gen erator');
  });

  it('drops malformed status codes rather than reporting them', () => {
    const store = mapManifestStore(
      buildStore({
        validation_results: {
          activeManifest: {
            success: [
              { code: 42 },
              { code: '<script>alert(1)</script>' },
              { code: 'valid.code' },
            ],
            informational: 'not-an-array',
            failure: [{ code: '' }],
          },
        },
      }),
    );

    expect(store?.statusEntries.map((entry) => entry.code)).toEqual(['valid.code']);
  });

  it('omits non-string manifest text instead of stringifying it', () => {
    const store = mapManifestStore(
      buildStore({
        manifests: {
          'urn:test:active': {
            title: { nested: 'object' },
            claim_generator: 1234,
            format: ['image/jpeg'],
          },
        },
      }),
    );

    expect(store?.title).toBeNull();
    expect(store?.claimGenerator).toBeNull();
    expect(store?.format).toBeNull();
  });

  it('bounds the status entry list and reports what was omitted', () => {
    const codes = Array.from({ length: 60 }, (_, index) => ({ code: `synthetic.code.${index}` }));
    const store = mapManifestStore(
      buildStore({
        validation_results: {
          activeManifest: { success: codes, informational: [], failure: [] },
        },
      }),
    );

    expect(store?.statusEntries).toHaveLength(50);
    expect(store?.omittedEntryCount).toBe(10);
  });

  it('bounds recorded actions and reports what was omitted', () => {
    const actions = Array.from({ length: 60 }, (_, index) => ({ action: `c2pa.synthetic.${index}` }));
    const store = mapManifestStore(
      buildStore({
        manifests: {
          'urn:test:active': { assertions: [{ label: 'c2pa.actions', data: { actions } }] },
        },
      }),
    );

    expect(store?.actions).toHaveLength(50);
    expect(store?.omittedEntryCount).toBe(10);
  });

  it('falls back to the only manifest when the active label cannot be resolved', () => {
    const store = mapManifestStore(
      buildStore({
        active_manifest: 'urn:missing',
        manifests: {
          'urn:only': { title: 'only.jpg', ingredients: [{ relationship: 'parentOf', title: 'a.jpg' }] },
        },
      }),
    );

    expect(store?.activeManifestLabel).toBe('urn:only');
    expect(store?.title).toBe('only.jpg');
    expect(store?.ingredients).toEqual([{ relationship: 'parentOf', title: 'a.jpg' }]);
  });

  it('keeps the active manifest unresolved when several candidates exist', () => {
    const store = mapManifestStore(
      buildStore({
        active_manifest: 'urn:missing',
        manifests: { 'urn:a': { title: 'a' }, 'urn:b': { title: 'b' } },
      }),
    );

    expect(store?.activeManifestLabel).toBeNull();
    expect(store?.title).toBeNull();
  });

  it('returns null when the SDK output is not an object', () => {
    expect(mapManifestStore(null)).toBeNull();
    expect(mapManifestStore('{}')).toBeNull();
    expect(mapManifestStore([{ validation_state: 'Valid' }])).toBeNull();
  });

  it('tolerates a store with no manifests at all', () => {
    const store = mapManifestStore({ validation_state: 'Invalid' });

    expect(store).not.toBeNull();
    expect(store?.validationState).toBe('Invalid');
    expect(store?.activeManifestLabel).toBeNull();
    expect(store?.statusEntries).toEqual([]);
    expect(store?.actions).toEqual([]);
  });
});
