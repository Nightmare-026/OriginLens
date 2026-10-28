import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  queryWebProvenance,
  generateWebSearchLinks,
  type WebProvenanceResult,
} from '@/lib/web-provenance/lookup';
import {
  GlobeSearchIcon,
  ShieldCheckIcon,
  InfoIcon,
  CheckCircleIcon,
  SearchIcon,
} from '@/components/ui/icons';

export type WebProvenanceCardProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix?: string;
}>;

export function WebProvenanceCard({ analysis, idPrefix = '' }: WebProvenanceCardProps) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [result, setResult] = useState<WebProvenanceResult | null>(null);
  const [userConsented, setUserConsented] = useState(false);

  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);
  const searchLinks = generateWebSearchLinks(analysis.file.sha256);

  const handleSearch = async () => {
    if (!userConsented) return;
    setStatus('searching');
    try {
      const res = await queryWebProvenance(analysis.file.sha256);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setStatus('done');
    }
  };

  return (
    <section
      aria-labelledby={tid('web-provenance-heading')}
      className="panel web-provenance-panel"
      data-testid={tid('web-provenance-section')}
      style={{ borderLeft: '4px solid #8b5cf6' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GlobeSearchIcon size={18} className="text-purple" />
          <h2 id={tid('web-provenance-heading')} style={{ margin: 0 }}>
            Web Provenance &amp; Reverse Lookup
          </h2>
        </div>
        <span className="badge badge-privacy" style={{ fontSize: '0.75rem' }}>
          Strict Privacy Disclosure
        </span>
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '12px' }}>
        Discover known public web occurrences, published sources, or archive index dates across the public internet.
      </p>

      {/* Privacy Disclosure Consent Banner */}
      <div
        style={{
          padding: '12px',
          background: '#faf5ff',
          borderRadius: '8px',
          border: '1px solid #e9d5ff',
          marginBottom: '14px',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b21a8', fontWeight: 600, marginBottom: '4px' }}>
          <ShieldCheckIcon size={14} />
          <span>Explicit Privacy Consent Required</span>
        </div>
        <p style={{ margin: '0 0 8px 0', color: '#581c87' }}>
          External searches require sending queries to third-party web repositories.
          Hash lookups transmit only the 64-character SHA-256 fingerprint.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, color: '#3b0764' }}>
          <input
            type="checkbox"
            checked={userConsented}
            onChange={(e) => setUserConsented(e.target.checked)}
            data-testid={tid('web-provenance-consent-checkbox')}
          />
          <span>I consent to querying public web provenance indexes using this image&apos;s SHA-256 fingerprint.</span>
        </label>
      </div>

      {/* One-Click Public Archive Query */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '0.875rem', fontWeight: 600 }}>Indexed Public Archives Lookup</h3>
        {status === 'idle' && (
          <button
            type="button"
            className="button-primary"
            disabled={!userConsented}
            onClick={() => void handleSearch()}
            data-testid={tid('query-web-provenance-button')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <SearchIcon size={14} />
            <span>Search Wayback &amp; Public Provenance Indexes</span>
          </button>
        )}

        {status === 'searching' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
            <div className="spinner" aria-hidden="true" style={{ width: '14px', height: '14px', border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8125rem', color: '#6b21a8' }}>
              Querying public archives and web indexes...
            </span>
          </div>
        )}

        {status === 'done' && result && (
          <div style={{ marginTop: '8px' }} data-testid={tid('web-provenance-results')}>
            {result.occurrences.length > 0 ? (
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 600, marginBottom: '8px' }}>
                  <CheckCircleIcon size={16} />
                  <span>{result.occurrences.length} Public Occurrence(s) Found!</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.occurrences.map((occ, idx) => (
                    <li key={idx}>
                      <strong>{occ.sourceName}</strong> ({occ.similarity})
                      {occ.earliestSeenUtc && (
                        <div>Earliest seen: <code>{occ.earliestSeenUtc}</code></div>
                      )}
                      {occ.notes && <div className="note">{occ.notes}</div>}
                      <a
                        href={occ.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', textDecoration: 'underline', fontSize: '0.75rem' }}
                      >
                        Visit Source ({occ.sourceUrl.slice(0, 50)}...)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                  <InfoIcon size={16} />
                  <span>No Public Web Occurrences Indexed</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#334155' }}>
                  This exact file hash has not been cataloged in public web crawl archives.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* External Reverse Image Search Engine Links */}
      <div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '0.875rem', fontWeight: 600 }}>External Reverse-Image Search Engines</h3>
        <p className="note" style={{ margin: '0 0 10px 0', fontSize: '0.75rem' }}>
          Open query links directly in third-party visual search engines:
        </p>
        {!userConsented ? (
          <p className="note" style={{ color: '#6b21a8' }} data-testid={tid('web-provenance-consent-reminder')}>
            Please check the privacy consent checkbox above to activate external query links.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} data-testid={tid('web-search-links')}>
            <a
              href={searchLinks.googleLens}
              target="_blank"
              rel="noopener noreferrer"
              className="preset-chip"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Google Lens</span>
            </a>
            <a
              href={searchLinks.tineye}
              target="_blank"
              rel="noopener noreferrer"
              className="preset-chip"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>TinEye Reverse Search</span>
            </a>
            <a
              href={searchLinks.bingVisual}
              target="_blank"
              rel="noopener noreferrer"
              className="preset-chip"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Bing Visual Search</span>
            </a>
            <a
              href={searchLinks.waybackMachine}
              target="_blank"
              rel="noopener noreferrer"
              className="preset-chip"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Wayback Machine Archive</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
