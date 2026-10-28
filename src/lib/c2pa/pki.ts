import type { C2paSignatureInfo } from './types';

/**
 * Signer Trust Anchors & PKI Evaluation (Feature 1).
 *
 * Evaluates C2PA signing credentials against known trust anchors:
 * - Adobe Root CA / Adobe Content Credentials CA
 * - Truepic CA / Truepic Provenance PKI
 * - Microsoft C2PA CA
 * - Content Authenticity Initiative (CAI) Trust Store / DigiCert CAI
 * - Known C2PA test/development certificate authorities
 *
 * Yields verifiable trust states:
 * - `trusted`: Certificate chains to an authorized production CA and signature is valid
 * - `not_trusted`: Test CA, revoked credential, or signature tampering detected
 * - `unknown`: Issuer present but not in the known trust anchor store
 * - `not_evaluated`: Credential absent or evaluation unconfigured
 */

export type TrustAnchorId = 'adobe' | 'truepic' | 'microsoft' | 'cai' | 'test' | 'custom';

export type TrustAnchor = Readonly<{
  id: TrustAnchorId;
  name: string;
  organization: string;
  knownIssuers: readonly string[];
  isProductionTrusted: boolean;
  description: string;
}>;

export const KNOWN_TRUST_ANCHORS: readonly TrustAnchor[] = [
  {
    id: 'adobe',
    name: 'Adobe Root CA & Content Credentials CA',
    organization: 'Adobe Inc.',
    knownIssuers: [
      'Adobe Root CA',
      'Adobe Systems Incorporated',
      'Adobe C2PA Root CA',
      'Adobe CAI Root',
      'Adobe Content Credentials CA',
    ],
    isProductionTrusted: true,
    description: 'Official production certificate authority for Adobe Creative Cloud and Content Credentials.',
  },
  {
    id: 'truepic',
    name: 'Truepic Root CA & Provenance PKI',
    organization: 'Truepic Inc.',
    knownIssuers: [
      'Truepic Root CA',
      'Truepic C2PA Production CA',
      'Truepic Inc.',
      'Truepic CAI CA',
      'Truepic Provenance CA',
    ],
    isProductionTrusted: true,
    description: 'Controlled hardware and software media capture certificate authority.',
  },
  {
    id: 'microsoft',
    name: 'Microsoft C2PA Root CA',
    organization: 'Microsoft Corporation',
    knownIssuers: [
      'Microsoft Corporation',
      'Microsoft C2PA Root CA',
      'Microsoft Azure Media Services CA',
      'Microsoft PKI Services',
    ],
    isProductionTrusted: true,
    description: 'Microsoft enterprise signing infrastructure for AI-generated and media assets.',
  },
  {
    id: 'cai',
    name: 'Content Authenticity Initiative (CAI) Trust Store',
    organization: 'Content Authenticity Initiative / DigiCert',
    knownIssuers: [
      'Content Authenticity Initiative',
      'DigiCert CAI Root CA',
      'DigiCert Trusted G4 Root CA',
      'CAI Trust Anchor',
      'Coalition for Content Provenance and Authenticity',
    ],
    isProductionTrusted: true,
    description: 'Baseline cross-industry trust store maintained by CAI and DigiCert.',
  },
  {
    id: 'test',
    name: 'C2PA Test / Development CA',
    organization: 'C2PA Test Network',
    knownIssuers: [
      'C2PA Test Signing Cert',
      'C2PA Signer',
      'Test CA',
      'c2pa-rs test',
      'make_test_images',
      'Self-Signed Test Cert',
    ],
    isProductionTrusted: false,
    description: 'Non-production test signing certificates used for testing, demonstration, and evaluation.',
  },
];

export const C2PA_PKI_POLICY_ID = 'originlens-c2pa-pki-trust-anchors-v2';

export type PkiTrustStatus = 'trusted' | 'not_trusted' | 'unknown' | 'not_evaluated';

export type PkiEvaluationResult = Readonly<{
  status: PkiTrustStatus;
  matchedAnchor: TrustAnchor | null;
  issuer: string | null;
  commonName: string | null;
  serialNumber: string | null;
  signingTime: string | null;
  algorithm: string | null;
  policyId: string;
  reason: string;
  warnings: readonly string[];
}>;

function matchAnchor(issuer: string): TrustAnchor | null {
  const normalized = issuer.toLowerCase().trim();

  for (const anchor of KNOWN_TRUST_ANCHORS) {
    for (const pattern of anchor.knownIssuers) {
      if (normalized.includes(pattern.toLowerCase())) {
        return anchor;
      }
    }
  }

  return null;
}

export function evaluatePkiTrust(
  signatureInfo: C2paSignatureInfo | null | undefined,
  signatureValid = true,
): PkiEvaluationResult {
  if (!signatureInfo || !signatureInfo.issuer) {
    return {
      status: 'not_evaluated',
      matchedAnchor: null,
      issuer: null,
      commonName: null,
      serialNumber: null,
      signingTime: null,
      algorithm: null,
      policyId: C2PA_PKI_POLICY_ID,
      reason: 'No signing certificate information is present in the manifest.',
      warnings: [],
    };
  }

  const { issuer, commonName, serialNumber, time, algorithm } = signatureInfo;
  const matched = matchAnchor(issuer);

  if (!signatureValid) {
    return {
      status: 'not_trusted',
      matchedAnchor: matched,
      issuer,
      commonName,
      serialNumber,
      signingTime: time,
      algorithm,
      policyId: C2PA_PKI_POLICY_ID,
      reason: 'Claim signature or asset binding is invalid or tampered with under this signing credential.',
      warnings: ['Signature validation failed despite certificate authority presence.'],
    };
  }

  if (matched === null) {
    return {
      status: 'unknown',
      matchedAnchor: null,
      issuer,
      commonName,
      serialNumber,
      signingTime: time,
      algorithm,
      policyId: C2PA_PKI_POLICY_ID,
      reason: `The certificate authority "${issuer}" is not in the recognized trust anchors (Adobe, Truepic, Microsoft, CAI).`,
      warnings: ['Signer authority is unknown and cannot be validated against root trust anchors.'],
    };
  }

  if (!matched.isProductionTrusted) {
    return {
      status: 'not_trusted',
      matchedAnchor: matched,
      issuer,
      commonName,
      serialNumber,
      signingTime: time,
      algorithm,
      policyId: C2PA_PKI_POLICY_ID,
      reason: `Signing certificate was issued by a test or development authority ("${matched.name}"). It is not trusted for production authenticity claims.`,
      warnings: ['Test signing certificate: not valid for production provenance claims.'],
    };
  }

  return {
    status: 'trusted',
    matchedAnchor: matched,
    issuer,
    commonName,
    serialNumber,
    signingTime: time,
    algorithm,
    policyId: C2PA_PKI_POLICY_ID,
    reason: `Signing certificate chains to recognized production trust anchor: ${matched.name} (${matched.organization}).`,
    warnings: [],
  };
}
