'use client';

import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import type { ExplainRequest, ExplainResponse } from '@/lib/model-explainer/schema';

export type ModelExplanationProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix: string;
}>;

type AudienceMode = 'general' | 'newsroom' | 'forensic';
type ExplainerStatus = 'idle' | 'loading' | 'success' | 'error';

const CURATED_QUESTIONS = [
  'Why is signer trust unanchored in this report?',
  'Could social media re-compression cause this SHA-256 delta?',
  'Explain the c2pa.drawing action in plain English.',
];

export function ModelExplanationCard({ analysis, idPrefix }: ModelExplanationProps) {
  const [showConsent, setShowConsent] = useState(false);
  const [status, setStatus] = useState<ExplainerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [audience, setAudience] = useState<AudienceMode>('general');
  const [userQuery, setUserQuery] = useState('');

  const loading = status === 'loading';
  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const handleRequestExplanation = async (customQuery?: string) => {
    setStatus('loading');
    setError(null);

    const queryToSend = customQuery ?? userQuery;

    try {
      const allowedSummaryCodes = analysis.summaryCodes.slice(0, 8);
      const payload: ExplainRequest = {
        schemaVersion: '2.0',
        consent: true,
        model: 'meta/llama-3.2-11b-vision-instruct',
        audience,
        userQuery: queryToSend.trim() ? queryToSend.trim() : undefined,
        report: {
          reportId: `rpt_${analysis.file.fileId}`,
          summaryCodes: allowedSummaryCodes as ExplainRequest['report']['summaryCodes'],
          trustPolicyId: 'c2pa_default_v1',
          files: [
            {
              fileId: analysis.file.fileId,
              detectedMimeType: analysis.file.detectedMimeType,
              byteSize: analysis.file.byteSize,
              width: analysis.file.width,
              height: analysis.file.height,
              sha256: analysis.file.sha256,
            },
          ],
          checks: analysis.checks.map((c) => ({
            checkId: c.checkId,
            kind: c.kind,
            executionState: c.executionState,
            outcome: c.outcome,
            warnings: c.warnings.slice(0, 5),
            limitations: c.limitations.slice(0, 5),
            errorCode: c.errorCode,
          })),
          evidence: analysis.evidence.map((ev) => ({
            evidenceId: ev.evidenceId,
            sourceCheckId: ev.sourceCheckId,
            key: ev.key,
            valueType: ev.valueType,
            value: ev.value,
            authority: ev.authority,
          })),
          disclaimers: [
            'Absence of an embedded credential is not evidence that an image is unedited or human-made.',
            'AI-generated explanation is non-authoritative and does not alter check outcomes.',
          ],
        },
      };

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const data: ExplainResponse = await res.json();
      setExplanation(data);
      setStatus('success');
      setShowConsent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request explanation';
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <div className="model-explanation-container" data-testid={tid('model-explainer')}>
      {status === 'loading' ? (
        <div
          className="explainer-skeleton-card"
          data-testid={tid('explainer-loading')}
          role="status"
          aria-live="polite"
        >
          <div className="explainer-skeleton-header">
            <span className="badge badge-meta badge-pulse">
              <span className="pulse-dot" aria-hidden="true" />
              Synthesizing cryptographic evidence with Meta Llama 3.2...
            </span>
          </div>
          <div className="skeleton-shimmer-box" aria-hidden="true">
            <div className="skeleton-line skeleton-line-1" />
            <div className="skeleton-line skeleton-line-2" />
            <div className="skeleton-line skeleton-line-3" />
          </div>
        </div>
      ) : explanation === null ? (
        <div className="model-explainer-prompt">
          {!showConsent ? (
            <div className="explainer-trigger-row">
              <div>
                <p className="note" style={{ margin: 0 }}>
                  Optional plain-language synthesis powered by <strong>Meta Llama 3.2 Vision Co-Pilot</strong>.
                </p>
                <p className="note" style={{ margin: '4px 0 0 0', fontSize: '0.8125rem' }}>
                  Choose your audience persona (General, Newsroom, Forensic) and interrogate specific evidence points.
                </p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowConsent(true)}
                data-testid={tid('btn-open-explainer')}
              >
                Explain with Meta Llama AI
              </button>
            </div>
          ) : (
            <div className="consent-card" data-testid={tid('consent-dialog')}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--foreground)' }}>
                Evidence Interrogation with Meta Llama 3.2
              </h3>
              <p className="note" style={{ margin: '0 0 12px 0' }}>
                This request sends <strong>only</strong> the structured check summary and evidence IDs. It does <strong>not</strong> send your image bytes, pixel previews, GPS location, or raw metadata.
              </p>

              {/* Audience Mode Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Audience Mode
                </label>
                <div className="audience-tabs" role="tablist" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={audience === 'general'}
                    className={`button-small ${audience === 'general' ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setAudience('general')}
                    data-testid={tid('audience-general')}
                  >
                    General Public (ELI5)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={audience === 'newsroom'}
                    className={`button-small ${audience === 'newsroom' ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setAudience('newsroom')}
                    data-testid={tid('audience-newsroom')}
                  >
                    Newsroom Editorial
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={audience === 'forensic'}
                    className={`button-small ${audience === 'forensic' ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setAudience('forensic')}
                    data-testid={tid('audience-forensic')}
                  >
                    Forensic Technical
                  </button>
                </div>
              </div>

              {/* Curated High-Impact Question Pills */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Curated Inquiry Pills (Click to ask)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {CURATED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="button-ghost button-small"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        border: userQuery === q ? '1px solid var(--primary, #10b981)' : undefined,
                        background: userQuery === q ? 'rgba(16, 185, 129, 0.12)' : undefined,
                      }}
                      onClick={() => setUserQuery(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Custom Inquiry Input */}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="custom-inquiry" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Custom Evidence Question (Optional)
                </label>
                <input
                  id="custom-inquiry"
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="e.g. What does signer unanchored mean for this image?"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                    background: 'var(--surface, #ffffff)',
                    fontSize: '0.875rem',
                  }}
                  data-testid={tid('custom-inquiry-input')}
                />
              </div>

              <div className="consent-meta-box">
                <span className="badge badge-meta">Meta Llama 3.2 11B Vision</span>
                <span className="badge badge-privacy">Privacy Preserved: No Image Upload</span>
              </div>

              <div className="actions" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => handleRequestExplanation()}
                  disabled={loading}
                  data-testid={tid('btn-confirm-explain')}
                >
                  {loading ? 'Interrogating evidence...' : 'Confirm & Explain'}
                </button>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => setShowConsent(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="panel-error-inline" role="alert" style={{ marginTop: '8px' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="explanation-result-card" data-testid={tid('explanation-card')}>
          <div className="explanation-header">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                className={`badge ${
                  explanation.mode === 'ai_generated' ? 'badge-ai' : 'badge-fallback'
                }`}
                data-testid={tid('explanation-mode-badge')}
              >
                {explanation.mode === 'ai_generated'
                  ? 'Meta Llama 3.2 Co-Pilot'
                  : 'Deterministic Fallback'}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                Mode: {audience}
              </span>
            </div>
            <span className="note" style={{ fontSize: '0.75rem' }}>
              {explanation.evidenceAttribution}
            </span>
          </div>

          {userQuery ? (
            <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--secondary-subtle, #ecfdf5)', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.8125rem', color: '#065f46' }}>
              <strong>Inquiry:</strong> &ldquo;{userQuery}&rdquo;
            </div>
          ) : null}

          <p className="explanation-summary" data-testid={tid('ai-summary')}>
            {explanation.plainLanguageSummary}
          </p>

          {explanation.whatThisSupports.length > 0 && (
            <div className="explanation-section">
              <h3 className="explanation-subhead">What this evidence supports:</h3>
              <ul className="explanation-list">
                {explanation.whatThisSupports.map((item, idx) => (
                  <li key={idx} className="explanation-item">
                    <span>{item.text}</span>
                    <div className="evidence-chips">
                      {item.evidenceIds.map((id) => (
                        <code key={id} className="evidence-chip">
                          {id}
                        </code>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.whatRemainsUnknown.length > 0 && (
            <div className="explanation-section">
              <h3 className="explanation-subhead">What remains unknown:</h3>
              <ul className="explanation-list">
                {explanation.whatRemainsUnknown.map((item, idx) => (
                  <li key={idx} className="explanation-item note">
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.nextChecks.length > 0 && (
            <div className="explanation-section">
              <h3 className="explanation-subhead">Recommended next checks:</h3>
              <ul className="explanation-list">
                {explanation.nextChecks.map((item, idx) => (
                  <li key={idx} className="explanation-item">
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="explanation-footer">
            <button
              type="button"
              className="button-ghost button-small"
              onClick={() => {
                setExplanation(null);
                setStatus('idle');
                setShowConsent(true);
              }}
            >
              Ask another question
            </button>
            <span className="note" style={{ fontSize: '0.75rem' }}>
              Generated at {new Date(explanation.generatedAtUtc).toLocaleTimeString()} · Model: {explanation.modelUsed}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
