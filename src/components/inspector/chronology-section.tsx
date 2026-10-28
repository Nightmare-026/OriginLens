import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  evaluateChronology,
  type ChronologyEvaluation,
} from '@/lib/compare/chronology';
import {
  ClockIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@/components/ui/icons';

export type ChronologySectionProps = Readonly<{
  first: FileAnalysis;
  second: FileAnalysis;
  idPrefix?: string;
}>;

export function ChronologySection({ first, second, idPrefix = '' }: ChronologySectionProps) {
  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);
  const evaluation: ChronologyEvaluation = evaluateChronology(first, second);

  const determinationBadge = () => {
    switch (evaluation.determination) {
      case 'file_a_predates_file_b':
        return (
          <span
            className={evaluation.isCryptographicallyVerified ? 'badge badge-success' : 'badge badge-warning'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('chronology-badge-a-first')}
          >
            {evaluation.isCryptographicallyVerified ? <ShieldCheckIcon size={14} /> : <AlertTriangleIcon size={14} />}
            <span>File A Predates File B</span>
          </span>
        );
      case 'file_b_predates_file_a':
        return (
          <span
            className={evaluation.isCryptographicallyVerified ? 'badge badge-success' : 'badge badge-warning'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('chronology-badge-b-first')}
          >
            {evaluation.isCryptographicallyVerified ? <ShieldCheckIcon size={14} /> : <AlertTriangleIcon size={14} />}
            <span>File B Predates File A</span>
          </span>
        );
      case 'identical_timestamp':
        return (
          <span
            className="badge badge-neutral"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('chronology-badge-identical')}
          >
            <ClockIcon size={14} />
            <span>Identical Recorded Timestamps</span>
          </span>
        );
      case 'inconclusive':
      default:
        return (
          <span
            className="badge badge-neutral"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('chronology-badge-inconclusive')}
          >
            <InfoIcon size={14} />
            <span>Inconclusive — Timestamps Absent or Unverified</span>
          </span>
        );
    }
  };

  const isAFirst = evaluation.determination === 'file_a_predates_file_b';
  const isBFirst = evaluation.determination === 'file_b_predates_file_a';

  return (
    <section
      aria-labelledby={tid('chronology-heading')}
      className="panel chronology-panel"
      data-testid={tid('chronology-section')}
      style={{ borderLeft: '4px solid #14b8a6', marginBottom: '24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockIcon size={18} className="text-teal" />
          <h2 id={tid('chronology-heading')} style={{ margin: 0 }}>
            Provenance Chronology &amp; Temporal Ordering
          </h2>
        </div>
        {determinationBadge()}
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '14px' }}>
        Deterministic comparison of cryptographically attested C2PA signing timestamps (RFC 3161)
        and camera EXIF creation dates to evaluate chronological asset ancestry.
      </p>

      {/* Visual Timeline Axis */}
      {(isAFirst || isBFirst) && (
        <div
          style={{
            background: 'var(--surface-sunken, #f8fafc)',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--border, #e2e8f0)',
          }}
          data-testid={tid('chronology-timeline-visual')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {/* Horizontal timeline bar */}
            <div
              style={{
                position: 'absolute',
                left: '40px',
                right: '40px',
                top: '50%',
                height: '3px',
                background: '#cbd5e1',
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            {/* Earlier Node */}
            <div
              style={{
                zIndex: 1,
                background: '#ffffff',
                border: '2px solid #0284c7',
                borderRadius: '8px',
                padding: '6px 12px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1' }}>
                EARLIER ASSET
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                {isAFirst ? `File A (${first.file.displayName})` : `File B (${second.file.displayName})`}
              </div>
              <span className="note" style={{ fontSize: '0.75rem' }}>
                {isAFirst ? evaluation.timeA.isoUtc?.slice(0, 10) : evaluation.timeB.isoUtc?.slice(0, 10)}
              </span>
            </div>

            {/* Delta Tag in Middle */}
            {evaluation.formattedDelta && (
              <div
                style={{
                  zIndex: 2,
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>+{evaluation.formattedDelta}</span>
              </div>
            )}

            {/* Later Node */}
            <div
              style={{
                zIndex: 1,
                background: '#ffffff',
                border: '2px solid #10b981',
                borderRadius: '8px',
                padding: '6px 12px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>
                LATER ASSET
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                {isAFirst ? `File B (${second.file.displayName})` : `File A (${first.file.displayName})`}
              </div>
              <span className="note" style={{ fontSize: '0.75rem' }}>
                {isAFirst ? evaluation.timeB.isoUtc?.slice(0, 10) : evaluation.timeA.isoUtc?.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Explanation Box */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: evaluation.isCryptographicallyVerified ? '#ecfdf5' : '#f8fafc',
          border: '1px solid',
          borderColor: evaluation.isCryptographicallyVerified ? '#a7f3d0' : '#e2e8f0',
          fontSize: '0.875rem',
          marginBottom: '14px',
        }}
        data-testid={tid('chronology-explanation')}
      >
        <strong>Finding:</strong> {evaluation.explanation}
      </div>

      {/* Timestamp Comparison Table */}
      <table className="delta-table" style={{ width: '100%', marginBottom: '14px' }}>
        <caption>Attested timestamps and authority comparison</caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">File A ({first.file.displayName})</th>
            <th scope="col">File B ({second.file.displayName})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Attested Timestamp</th>
            <td>{evaluation.timeA.isoUtc ?? 'Absent / Unrecorded'}</td>
            <td>{evaluation.timeB.isoUtc ?? 'Absent / Unrecorded'}</td>
          </tr>
          <tr>
            <th scope="row">Authority Rating</th>
            <td>
              {evaluation.timeA.authority === 'cryptographically_signed_c2pa'
                ? 'Cryptographic Signature (RFC 3161)'
                : evaluation.timeA.authority === 'unverified_camera_exif'
                  ? 'Unverified Camera EXIF Clue'
                  : 'None'}
            </td>
            <td>
              {evaluation.timeB.authority === 'cryptographically_signed_c2pa'
                ? 'Cryptographic Signature (RFC 3161)'
                : evaluation.timeB.authority === 'unverified_camera_exif'
                  ? 'Unverified Camera EXIF Clue'
                  : 'None'}
            </td>
          </tr>
          <tr>
            <th scope="row">Source Evidence Reference</th>
            <td><code>{evaluation.timeA.sourceKey}</code></td>
            <td><code>{evaluation.timeB.sourceKey}</code></td>
          </tr>
        </tbody>
      </table>

      {/* Warnings & Disclosures */}
      {evaluation.warnings.length > 0 && (
        <ul className="warning-list" style={{ margin: 0 }}>
          {evaluation.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
