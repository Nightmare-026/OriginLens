import { describe, expect, it } from 'vitest';
import {
  evaluatePkiTrust,
  KNOWN_TRUST_ANCHORS,
  C2PA_PKI_POLICY_ID,
} from '@/lib/c2pa/pki';

describe('Signer Trust Anchors & PKI Evaluation (Feature 1)', () => {
  it('exposes known official production and test trust anchors', () => {
    expect(KNOWN_TRUST_ANCHORS.length).toBeGreaterThanOrEqual(5);

    const anchorIds = KNOWN_TRUST_ANCHORS.map((a) => a.id);
    expect(anchorIds).toContain('adobe');
    expect(anchorIds).toContain('truepic');
    expect(anchorIds).toContain('microsoft');
    expect(anchorIds).toContain('cai');
    expect(anchorIds).toContain('test');
  });

  it('evaluates Adobe production signing certificate as trusted when signature is valid', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Ps256',
        issuer: 'Adobe C2PA Root CA',
        commonName: 'Adobe Content Credentials Signer',
        serialNumber: '1234567890',
        time: '2024-05-10T12:00:00Z',
      },
      true,
    );

    expect(result.status).toBe('trusted');
    expect(result.matchedAnchor?.id).toBe('adobe');
    expect(result.policyId).toBe(C2PA_PKI_POLICY_ID);
    expect(result.warnings).toHaveLength(0);
  });

  it('evaluates Truepic production signing certificate as trusted', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Es256',
        issuer: 'Truepic C2PA Production CA',
        commonName: 'Truepic Hardware Signer',
        serialNumber: '987654321',
        time: '2024-06-01T08:30:00Z',
      },
      true,
    );

    expect(result.status).toBe('trusted');
    expect(result.matchedAnchor?.id).toBe('truepic');
  });

  it('evaluates Microsoft C2PA CA as trusted', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Ps256',
        issuer: 'Microsoft C2PA Root CA',
        commonName: 'Microsoft Azure Media Signer',
        serialNumber: '1122334455',
        time: '2024-07-15T15:00:00Z',
      },
      true,
    );

    expect(result.status).toBe('trusted');
    expect(result.matchedAnchor?.id).toBe('microsoft');
  });

  it('evaluates CAI / DigiCert trust store as trusted', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Es256',
        issuer: 'Content Authenticity Initiative',
        commonName: 'CAI Root Key',
        serialNumber: '55667788',
        time: '2024-08-01T10:00:00Z',
      },
      true,
    );

    expect(result.status).toBe('trusted');
    expect(result.matchedAnchor?.id).toBe('cai');
  });

  it('evaluates C2PA test certificates as not_trusted for production', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Ps256',
        issuer: 'C2PA Test Signing Cert',
        commonName: 'C2PA Signer',
        serialNumber: '720724073027128164015125666832722375746636448153',
        time: '2023-01-24T14:48:56Z',
      },
      true,
    );

    expect(result.status).toBe('not_trusted');
    expect(result.matchedAnchor?.id).toBe('test');
    expect(result.reason).toContain('test or development authority');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('evaluates valid CA with corrupted signature as not_trusted', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Ps256',
        issuer: 'Adobe Root CA',
        commonName: 'Adobe Signer',
        serialNumber: '123',
        time: '2024-01-01T00:00:00Z',
      },
      false, // invalid signature
    );

    expect(result.status).toBe('not_trusted');
    expect(result.reason).toContain('invalid or tampered');
  });

  it('evaluates unknown certificate authority as unknown', () => {
    const result = evaluatePkiTrust(
      {
        algorithm: 'Ps256',
        issuer: 'Unknown Custom Private CA',
        commonName: 'Untrusted Signer',
        serialNumber: '999',
        time: '2024-01-01T00:00:00Z',
      },
      true,
    );

    expect(result.status).toBe('unknown');
    expect(result.matchedAnchor).toBeNull();
    expect(result.reason).toContain('not in the recognized trust anchors');
  });

  it('evaluates missing or empty signature info as not_evaluated', () => {
    expect(evaluatePkiTrust(null).status).toBe('not_evaluated');
    expect(evaluatePkiTrust(undefined).status).toBe('not_evaluated');
    expect(evaluatePkiTrust({ algorithm: null, issuer: null, commonName: null, serialNumber: null, time: null }).status).toBe('not_evaluated');
  });
});
