import { useMemo, useState, useEffect } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  analyzeLuminanceSpectrum,
  type WatermarkInspection,
} from '@/lib/watermark/spectral';
import {
  WaveformIcon,
  CpuIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@/components/ui/icons';

export type SpectralCardProps = Readonly<{
  analysis: FileAnalysis;
  previewUrl?: string | null;
  idPrefix?: string;
}>;

export function SpectralCard({ analysis, previewUrl, idPrefix = '' }: SpectralCardProps) {
  const [loadedPreview, setLoadedPreview] = useState<{ url: string; grid: Float64Array } | null>(null);
  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const luminanceGrid =
    loadedPreview !== null && loadedPreview.url === previewUrl ? loadedPreview.grid : null;

  // Extract real luminance pixels from the preview image when available in browser
  useEffect(() => {
    if (!previewUrl || typeof window === 'undefined') {
      return;
    }

    let active = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        const grid = new Float64Array(256);

        for (let i = 0; i < 256; i++) {
          const r = data[i * 4] ?? 0;
          const g = data[i * 4 + 1] ?? 0;
          const b = data[i * 4 + 2] ?? 0;
          // Standard Rec. 601 luminance
          grid[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        }

        setLoadedPreview({ url: previewUrl, grid });
      } catch {
        // Tainted canvas fallback
      }
    };

    img.src = previewUrl;

    return () => {
      active = false;
    };
  }, [previewUrl]);

  // Compute spectral analysis on real pixels and metadata
  const inspection: WatermarkInspection = useMemo(() => {
    // Pass all metadata string content to inspect watermark markers
    const metaText = analysis.metadata?.fields.map((f) => `${f.key} ${f.value}`).join(' ') ?? '';
    return analyzeLuminanceSpectrum(luminanceGrid ?? new Float64Array(0), 16, metaText);
  }, [analysis, luminanceGrid]);

  const verdictBadge = () => {
    switch (inspection.spectralVerdict) {
      case 'periodic_grid_detected':
        return (
          <span
            className="badge badge-warning"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e' }}
            data-testid={tid('spectral-verdict-grid')}
          >
            <AlertTriangleIcon size={13} />
            <span>Periodic Grid Anomaly</span>
          </span>
        );
      case 'elevated_high_frequency':
        return (
          <span
            className="badge badge-warning"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('spectral-verdict-high-freq')}
          >
            <AlertTriangleIcon size={13} />
            <span>Elevated High-Frequency Energy</span>
          </span>
        );
      case 'natural_falloff':
        return (
          <span
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            data-testid={tid('spectral-verdict-natural')}
          >
            <WaveformIcon size={13} />
            <span>Natural Spectral Falloff (1/f²)</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral" data-testid={tid('spectral-verdict-inconclusive')}>
            Inconclusive
          </span>
        );
    }
  };

  return (
    <section
      aria-labelledby={tid('spectral-heading')}
      className="panel spectral-analysis-panel"
      data-testid={tid('spectral-section')}
      style={{ borderLeft: '4px solid #6366f1' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WaveformIcon size={18} className="text-cyan" />
          <h2 id={tid('spectral-heading')} style={{ margin: 0 }}>
            Watermark &amp; Frequency Domain Spectral Analysis
          </h2>
        </div>
        {verdictBadge()}
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '14px' }}>
        Analyzes 2D Discrete Cosine Transform (DCT) spatial frequency distributions to detect high-frequency
        upsampling anomalies characteristic of generative AI decoders, along with provider invisible watermark markers.
      </p>

      {/* Watermark Markers Status */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '0.875rem', fontWeight: 600 }}>Invisible Watermark Marker Scan</h3>
        {inspection.watermarkMarkers.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {inspection.watermarkMarkers.map((marker) => (
              <span
                key={marker}
                className="badge badge-warning"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <CpuIcon size={12} />
                <span>{marker}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="note" style={{ margin: 0 }}>
            No known Google SynthID, Adobe Watermark, or Truepic watermark headers were detected in headers.
          </p>
        )}
      </div>

      {/* Energy Distribution Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
          <span>Spectral Energy Bands</span>
          <span className="note">Low / Mid / High Frequency Ratio</span>
        </div>
        <div
          style={{
            display: 'flex',
            height: '12px',
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#e2e8f0',
          }}
          role="progressbar"
          aria-label="Spectral Energy Distribution"
        >
          <div
            style={{
              width: `${inspection.energyDistribution.lowFreqShare * 100}%`,
              background: '#0ea5e9',
            }}
            title={`Low Frequency: ${Math.round(inspection.energyDistribution.lowFreqShare * 100)}%`}
          />
          <div
            style={{
              width: `${inspection.energyDistribution.midFreqShare * 100}%`,
              background: '#6366f1',
            }}
            title={`Mid Frequency: ${Math.round(inspection.energyDistribution.midFreqShare * 100)}%`}
          />
          <div
            style={{
              width: `${inspection.energyDistribution.highFreqShare * 100}%`,
              background: '#f59e0b',
            }}
            title={`High Frequency: ${Math.round(inspection.energyDistribution.highFreqShare * 100)}%`}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px', color: '#1e293b', fontWeight: 600 }}>
          <span>Low ({Math.round(inspection.energyDistribution.lowFreqShare * 100)}%)</span>
          <span>Mid ({Math.round(inspection.energyDistribution.midFreqShare * 100)}%)</span>
          <span>High ({Math.round(inspection.energyDistribution.highFreqShare * 100)}%)</span>
        </div>
      </div>

      <dl className="kv" style={{ marginBottom: '14px' }}>
        <div>
          <dt>High-Frequency Ratio</dt>
          <dd data-testid={tid('spectral-high-freq-ratio')}>
            <code>{inspection.highFrequencyRatio}</code>
          </dd>
        </div>
        <div>
          <dt>Periodic Grid Anomaly Score</dt>
          <dd data-testid={tid('spectral-grid-anomaly')}>
            <code>{inspection.periodicGridAnomaly}</code>
          </dd>
        </div>
        <div>
          <dt>Signal Verdict</dt>
          <dd data-testid={tid('spectral-verdict-label')}>
            <strong>{inspection.verdictLabel}</strong>
          </dd>
        </div>
      </dl>

      {/* Disclosures Banner */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid var(--border, #e2e8f0)',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#334155', fontWeight: 600 }}>
          <InfoIcon size={14} />
          <span>Honest Uncertainty &amp; Forensic Limitations</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155' }}>
          {inspection.disclosures.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
