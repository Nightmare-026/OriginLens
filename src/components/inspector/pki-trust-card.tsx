import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  evaluatePkiTrust,
  C2PA_PKI_POLICY_ID,
  KNOWN_TRUST_ANCHORS,
  type PkiEvaluationResult,
} from '@/lib/c2pa/pki';
import {
  BadgeCheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from '@/components/ui/icons';

export type PkiTrustCardProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix?: string;
}>;

export function PkiTrustCard({ analysis, idPrefix = '' }: PkiTrustCardProps) {
  const [showAnchorList, setShowAnchorList] = useState(false);
  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const finding = analysis.finding;
  const c2paCheck = analysis.checks.find((c) => c.kind === 'c2pa');

  if (!c2paCheck || c2paCheck.executionState !== 'completed' || !finding || finding.manifestPresence !== 'present') {
    return null;
  }

  // Extract signature info from evidence
  const issuerEv = c2paCheck.evidence.find(
    (ev) => ev.key === 'c2pa.signature.issuer' || ev.key.includes('issuer') || ev.key.includes('signer.issuer'),
  );
  const commonNameEv = c2paCheck.evidence.find(
    (ev) => ev.key === 'c2pa.signature.common_name' || ev.key.includes('common_name') || ev.key.includes('signer.common_name'),
  );
  const serialNumberEv = c2paCheck.evidence.find(
    (ev) => ev.key === 'c2pa.signature.cert_serial_number' || ev.key.includes('serial_number'),
  );
  const timeEv = c2paCheck.evidence.find(
    (ev) => ev.key === 'c2pa.signature.time' || ev.key.includes('time') || ev.key.includes('signing_time'),
  );
  const algoEv = c2paCheck.evidence.find(
    (ev) => ev.key === 'c2pa.signature.algorithm' || ev.key.includes('alg'),
  );

  const signatureInfo =
    typeof issuerEv?.value === 'string'
      ? {
          algorithm: typeof algoEv?.value === 'string' ? algoEv.value : null,
          issuer: issuerEv.value,
          commonName: typeof commonNameEv?.value === 'string' ? commonNameEv.value : null,
          serialNumber: typeof serialNumberEv?.value === 'string' ? serialNumberEv.value : null,
          time: typeof timeEv?.value === 'string' ? timeEv.value : null,
        }
      : null;

  const isSigValid = finding.signatureValidation === 'valid';
  const pkiResult: PkiEvaluationResult = evaluatePkiTrust(signatureInfo, isSigValid);

  const statusBadge = () => {
    switch (pkiResult.status) {
      case 'trusted':
        return (
          <span
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('pki-status-trusted')}
          >
            <BadgeCheckIcon size={14} />
            <span>Trusted Anchor (PKI Verified)</span>
          </span>
        );
      case 'not_trusted':
        return (
          <span
            className="badge badge-warning"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e' }}
            data-testid={tid('pki-status-not-trusted')}
          >
            <AlertTriangleIcon size={14} />
            <span>Not Trusted for Production</span>
          </span>
        );
      case 'unknown':
        return (
          <span
            className="badge badge-neutral"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('pki-status-unknown')}
          >
            <InfoIcon size={14} />
            <span>Unknown Certificate Authority</span>
          </span>
        );
      case 'not_evaluated':
      default:
        return (
          <span
            className="badge badge-neutral"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('pki-status-not-evaluated')}
          >
            <InfoIcon size={14} />
            <span>Not Evaluated</span>
          </span>
        );
    }
  };

  return (
    <section
      aria-labelledby={tid('pki-heading')}
      className="panel pki-trust-panel"
      data-testid={tid('pki-trust-section')}
      style={{ borderLeft: '4px solid #0284c7' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRoundIcon size={18} className="text-cyan" />
          <h2 id={tid('pki-heading')} style={{ margin: 0 }}>Signer Trust Anchors &amp; PKI Evaluation</h2>
        </div>
        {statusBadge()}
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '12px' }}>
        Evaluates cryptographic signing certificates against known root authorities (Adobe, Truepic, Microsoft, CAI)
        to distinguish production credentials from test, self-signed, or untrusted keys.
      </p>

      <dl className="kv" style={{ marginBottom: '12px' }}>
        <div>
          <dt>Certificate Authority (Issuer)</dt>
          <dd data-testid={tid('pki-issuer')}>
            <code>{pkiResult.issuer ?? 'Not recorded'}</code>
          </dd>
        </div>
        <div>
          <dt>Signer Identity (Common Name)</dt>
          <dd data-testid={tid('pki-common-name')}>
            <code>{pkiResult.commonName ?? 'Not recorded'}</code>
          </dd>
        </div>
        <div>
          <dt>Matched Trust Anchor</dt>
          <dd data-testid={tid('pki-matched-anchor')}>
            {pkiResult.matchedAnchor ? (
              <strong>{pkiResult.matchedAnchor.name} ({pkiResult.matchedAnchor.organization})</strong>
            ) : (
              <span className="note">None matched in trust store</span>
            )}
          </dd>
        </div>
        <div>
          <dt>PKI Trust Policy</dt>
          <dd>
            <code>{C2PA_PKI_POLICY_ID}</code>
          </dd>
        </div>
      </dl>

      <div
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'var(--surface-sunken, #f8fafc)',
          border: '1px solid var(--border, #e2e8f0)',
          fontSize: '0.875rem',
          marginBottom: '12px',
        }}
      >
        <strong>Evaluation Summary:</strong> {pkiResult.reason}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="button-ghost"
          style={{ fontSize: '0.8125rem', padding: '4px 8px' }}
          onClick={() => setShowAnchorList(!showAnchorList)}
          aria-expanded={showAnchorList}
        >
          <ShieldCheckIcon size={14} />
          <span>{showAnchorList ? 'Hide Configured Trust Anchors' : 'View Configured Trust Anchors (5)'}</span>
        </button>
      </div>

      {showAnchorList && (
        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface, #ffffff)', borderRadius: '8px', border: '1px solid var(--border, #cbd5e1)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600 }}>Configured Root Trust Anchors:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {KNOWN_TRUST_ANCHORS.map((anchor) => (
              <li key={anchor.id}>
                <strong>{anchor.name}</strong> ({anchor.organization}) —{' '}
                <span style={{ color: anchor.isProductionTrusted ? '#15803d' : '#b45309', fontWeight: 600 }}>
                  {anchor.isProductionTrusted ? 'Production Trusted' : 'Test / Non-Production'}
                </span>
                <p className="note" style={{ margin: '2px 0 0 0' }}>{anchor.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
