import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  queryRemoteManifestRegistry,
  DEFAULT_CAI_CLOUD_REGISTRY,
  type RemoteRecoveryResult,
} from '@/lib/c2pa/remote-recovery';
import {
  CloudDownloadIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';

export type RemoteRecoveryCardProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix?: string;
}>;

export function RemoteRecoveryCard({ analysis, idPrefix = '' }: RemoteRecoveryCardProps) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [result, setResult] = useState<RemoteRecoveryResult | null>(null);
  const [registryUrl] = useState(DEFAULT_CAI_CLOUD_REGISTRY);

  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const handleSearch = async () => {
    setStatus('searching');
    try {
      const res = await queryRemoteManifestRegistry(analysis.file.sha256, registryUrl);
      setResult(res);
    } catch (err) {
      setResult({
        status: 'error',
        sha256: analysis.file.sha256,
        registry: registryUrl,
        searchedAtUtc: new Date().toISOString(),
        recoveredManifest: null,
        message: err instanceof Error ? err.message : 'Lookup failed',
      });
    } finally {
      setStatus('done');
    }
  };

  return (
    <section
      aria-labelledby={tid('remote-recovery-heading')}
      className="panel remote-recovery-panel"
      data-testid={tid('remote-recovery-section')}
      style={{ borderLeft: '4px solid #38bdf8' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CloudDownloadIcon size={18} className="text-cyan" />
          <h2 id={tid('remote-recovery-heading')} style={{ margin: 0 }}>
            Remote / Durable C2PA Manifest Recovery
          </h2>
        </div>
        <span className="badge badge-privacy" style={{ fontSize: '0.75rem' }}>
          Zero-Knowledge Privacy Guaranteed
        </span>
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '12px' }}>
        If social media or compression stripped embedded C2PA credentials from this file, you can query
        durable C2PA Cloud Manifest Stores (such as Content Authenticity Initiative registries) by image SHA-256.
      </p>

      {/* Privacy Consent Box */}
      <div
        style={{
          padding: '10px 14px',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd',
          marginBottom: '14px',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 600, marginBottom: '2px' }}>
          <ShieldCheckIcon size={14} />
          <span>Zero-Knowledge Privacy Disclosure</span>
        </div>
        <p style={{ margin: 0, color: '#0c4a6e' }}>
          OriginLens will dispatch ONLY the 64-character SHA-256 fingerprint (<code>{analysis.file.sha256.slice(0, 16)}...</code>).
          Zero image bytes, filenames, GPS, or EXIF metadata will ever leave your browser.
        </p>
      </div>

      {status === 'idle' && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button-primary"
            onClick={() => void handleSearch()}
            data-testid={tid('search-cloud-manifest-button')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CloudDownloadIcon size={16} />
            <span>Search Cloud Manifest Store</span>
          </button>
          <span className="note" style={{ fontSize: '0.75rem' }}>
            Target: <code>{registryUrl}</code>
          </span>
        </div>
      )}

      {status === 'searching' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <div className="spinner" aria-hidden="true" style={{ width: '16px', height: '16px', border: '2px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.875rem', color: '#0369a1' }}>
            Querying C2PA Cloud Manifest Registry by SHA-256 digest...
          </span>
        </div>
      )}

      {status === 'done' && result && (
        <div style={{ marginTop: '8px' }} data-testid={tid('remote-recovery-results')}>
          {result.status === 'recovered' && result.recoveredManifest ? (
            <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 600, marginBottom: '8px' }}>
                <CheckCircleIcon size={16} />
                <span>Durable Manifest Found in Cloud Registry!</span>
              </div>
              <dl className="kv" style={{ margin: 0 }}>
                <div>
                  <dt>Manifest Identifier</dt>
                  <dd><code>{result.recoveredManifest.manifestId}</code></dd>
                </div>
                <div>
                  <dt>Claim Generator</dt>
                  <dd>{result.recoveredManifest.claimGenerator}</dd>
                </div>
                <div>
                  <dt>Signer / Authority</dt>
                  <dd>{result.recoveredManifest.issuer ?? 'Recorded Signer'}</dd>
                </div>
                {result.recoveredManifest.signingTime && (
                  <div>
                    <dt>Signing Time</dt>
                    <dd>{result.recoveredManifest.signingTime}</dd>
                  </div>
                )}
                <div>
                  <dt>Recorded Actions / Ingredients</dt>
                  <dd>{result.recoveredManifest.actionsCount} actions · {result.recoveredManifest.ingredientsCount} ingredients</dd>
                </div>
              </dl>
            </div>
          ) : result.status === 'not_found' ? (
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                <InfoIcon size={16} />
                <span>No Registered Manifest Found</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#334155' }}>
                No durable C2PA credentials were registered in the public cloud store for this exact SHA-256 hash.
                Note that cloud registration is completely voluntary, and lack of cloud registration does not imply alteration.
              </p>
            </div>
          ) : (
            <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 600, marginBottom: '4px' }}>
                <AlertTriangleIcon size={16} />
                <span>Registry Query Notice</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#92400e' }}>
                {result.message}
              </p>
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              className="button-ghost"
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              onClick={() => setStatus('idle')}
            >
              Search Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
