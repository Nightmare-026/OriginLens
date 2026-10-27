'use client';

import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import type { ExplainRequest, ExplainResponse } from '@/lib/model-explainer/schema';

export type ModelExplanationProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix: string;
}>;

export function ModelExplanationCard({ analysis, idPrefix }: ModelExplanationProps) {
  const [showConsent, setShowConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);

  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const handleRequestExplanation = async () => {
    setLoading(true);
    setError(null);

    try {
      const allowedSummaryCodes = analysis.summaryCodes.slice(0, 8);
      const payload: ExplainRequest = {
        schemaVersion: '2.0',
        consent: true,
        model: 'meta/llama-3.2-11b-vision-instruct',
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
      setShowConsent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request explanation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="model-explanation-container" data-testid={tid('model-explainer')}>
      {explanation === null ? (
        <div className="model-explainer-prompt">
          {!showConsent ? (
            <div className="explainer-trigger-row">
              <div>
                <p className="note" style={{ margin: 0 }}>
                  Optional plain-language synthesis powered by <strong>Meta Llama 3.2</strong>.
                </p>
                <p className="note" style={{ margin: '4px 0 0 0', fontSize: '0.8125rem' }}>
                  Analyzes structured findings and maps claims directly to Evidence IDs.
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
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--foreground)' }}>
                Explain Report with Meta Llama 3.2
              </h3>
              <p className="note" style={{ margin: '0 0 12px 0' }}>
                This request sends <strong>only</strong> the structured check summary and evidence IDs. It does <strong>not</strong> send your image bytes, pixel previews, GPS location, or raw metadata.
              </p>
              <div className="consent-meta-box">
                <span className="badge badge-meta">Meta Llama 3.2 11B</span>
                <span className="badge badge-privacy">Privacy Preserved: No Image Upload</span>
              </div>
              <div className="actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleRequestExplanation}
                  disabled={loading}
                  data-testid={tid('btn-confirm-explain')}
                >
                  {loading ? 'Analyzing evidence...' : 'Confirm & Explain'}
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
            <span
              className={`badge ${
                explanation.mode === 'ai_generated' ? 'badge-ai' : 'badge-fallback'
              }`}
              data-testid={tid('explanation-mode-badge')}
            >
              {explanation.mode === 'ai_generated'
                ? 'Meta Llama 3.2 Explanation'
                : 'Deterministic Fallback'}
            </span>
            <span className="note" style={{ fontSize: '0.75rem' }}>
              {explanation.evidenceAttribution}
            </span>
          </div>

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
                setShowConsent(false);
              }}
            >
              Re-analyze
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
