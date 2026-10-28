'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CameraIcon,
  ArrowRightIcon,
  SlidersIcon,
  LockIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';

type DemoState = 'verified' | 'tampered' | 'unsigned';

export function LandingHero() {
  const [activeDemo, setActiveDemo] = useState<DemoState>('verified');

  return (
    <section aria-labelledby="hero-title" className="landing-hero-section">
      <div className="landing-hero-inner">

        {/* Main Headline */}
        <h1 id="hero-title" className="landing-hero-title">
          Truth Over Deception: <br className="hero-title-break" />
          <span className="brand-lens-gradient">Cryptographic Proof</span> for Modern Media
        </h1>

        {/* Subtitle */}
        <p className="landing-hero-subtitle">
          Move beyond fragile, statistical AI detectors that guess. Inspect cryptographic
          Content Credentials, verify original-byte integrity, and explore media truth with Meta AI.
        </p>

        {/* Primary Action Buttons */}
        <div className="landing-hero-ctas">
          <Link
            id="cta-hero-inspect"
            data-testid="cta-hero-inspect"
            href="/inspect"
            className="btn-primary landing-cta-primary"
          >
            <ShieldCheckIcon size={18} />
            <span>Inspect Single Image</span>
            <ArrowRightIcon size={16} />
          </Link>
          <Link
            id="cta-hero-compare"
            data-testid="cta-hero-compare"
            href="/compare"
            className="btn-secondary landing-cta-secondary"
          >
            <SlidersIcon size={18} />
            <span>Compare Provenance Delta</span>
          </Link>
        </div>

        {/* Trust Guarantees Row */}
        <div className="landing-trust-grid" role="list" aria-label="Core system guarantees">
          <div className="trust-item" role="listitem">
            <LockIcon size={16} className="trust-icon" />
            <span>100% Client-Side Privacy</span>
          </div>
          <div className="trust-item" role="listitem">
            <ShieldCheckIcon size={16} className="trust-icon" />
            <span>C2PA WebAssembly Standard</span>
          </div>
          <div className="trust-item" role="listitem">
            <SparklesIcon size={16} className="trust-icon" />
            <span>Meta Llama 3.2 Multimodal</span>
          </div>
          <div className="trust-item" role="listitem">
            <CheckCircleIcon size={16} className="trust-icon" />
            <span>Zero Image Uploads</span>
          </div>
        </div>

        {/* Interactive Live Mini-Demo Card */}
        <div className="landing-mini-demo-wrapper">
          <div className="mini-demo-header">
            <div className="mini-demo-controls">
              <span className="window-dot red" aria-hidden="true" />
              <span className="window-dot yellow" aria-hidden="true" />
              <span className="window-dot green" aria-hidden="true" />
              <span className="mini-demo-title">Live Cryptographic Evidence Engine</span>
            </div>
            <div className="mini-demo-toggles" role="tablist" aria-label="Demo asset scenario">
              <button
                type="button"
                role="tab"
                aria-selected={activeDemo === 'verified'}
                className={`demo-tab-btn ${activeDemo === 'verified' ? 'demo-tab-active' : ''}`}
                onClick={() => setActiveDemo('verified')}
              >
                <ShieldCheckIcon size={13} />
                <span>Verified C2PA</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDemo === 'tampered'}
                className={`demo-tab-btn ${activeDemo === 'tampered' ? 'demo-tab-active' : ''}`}
                onClick={() => setActiveDemo('tampered')}
              >
                <AlertTriangleIcon size={13} />
                <span>Binding Mismatch</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDemo === 'unsigned'}
                className={`demo-tab-btn ${activeDemo === 'unsigned' ? 'demo-tab-active' : ''}`}
                onClick={() => setActiveDemo('unsigned')}
              >
                <CameraIcon size={13} />
                <span>Unsigned Photo</span>
              </button>
            </div>
          </div>

          <div className="mini-demo-body" role="tabpanel">
            {activeDemo === 'verified' && (
              <div className="demo-result-content">
                <div className="demo-badge-row">
                  <span className="demo-status-pill success">
                    <ShieldCheckIcon size={14} />
                    <strong>C2PA Credential: Valid</strong>
                  </span>
                  <span className="demo-status-pill success">
                    <CheckCircleIcon size={14} />
                    <span>Asset Binding: Intact</span>
                  </span>
                  <span className="demo-status-pill neutral">
                    <span>Signer: Adobe Creative Cloud</span>
                  </span>
                </div>
                <div className="demo-code-block">
                  <div className="demo-code-row">
                    <span className="code-key">Original SHA-256:</span>
                    <span className="code-val mono">75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda...</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">C2PA Assertion:</span>
                    <span className="code-val">c2pa.actions.v2 (c2pa.created, c2pa.edited)</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">Verdict Semantics:</span>
                    <span className="code-val highlight">
                      Cryptographic match established. Media pixels match author signature.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeDemo === 'tampered' && (
              <div className="demo-result-content">
                <div className="demo-badge-row">
                  <span className="demo-status-pill warning">
                    <AlertTriangleIcon size={14} />
                    <strong>Binding Mismatch Detected</strong>
                  </span>
                  <span className="demo-status-pill neutral">
                    <span>Manifest Present</span>
                  </span>
                  <span className="demo-status-pill error">
                    <span>assertion.dataHash.mismatch</span>
                  </span>
                </div>
                <div className="demo-code-block">
                  <div className="demo-code-row">
                    <span className="code-key">Signed Byte Hash:</span>
                    <span className="code-val mono">9bf2810a4e76... (Recorded at signing)</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">Computed Byte Hash:</span>
                    <span className="code-val mono mismatch">e3b0c44298fc... (Mismatch: Pixels modified)</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">Verdict Semantics:</span>
                    <span className="code-val warning-text">
                      Pixels were modified after signature was created. Integrity binding invalid.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeDemo === 'unsigned' && (
              <div className="demo-result-content">
                <div className="demo-badge-row">
                  <span className="demo-status-pill neutral">
                    <CameraIcon size={14} />
                    <strong>No C2PA Manifest Embedded</strong>
                  </span>
                  <span className="demo-status-pill info">
                    <span>Real EXIF Camera Data Found</span>
                  </span>
                  <span className="demo-status-pill neutral">
                    <span>Honest Uncertainty</span>
                  </span>
                </div>
                <div className="demo-code-block">
                  <div className="demo-code-row">
                    <span className="code-key">Hardware Model:</span>
                    <span className="code-val">Sony Alpha 7R V (FE 24-70mm F2.8 GM II)</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">Exposure Details:</span>
                    <span className="code-val">1/250s · f/2.8 · ISO 100 · 35mm</span>
                  </div>
                  <div className="demo-code-row">
                    <span className="code-key">Verdict Semantics:</span>
                    <span className="code-val highlight">
                      Absence of C2PA manifest is NOT proof of AI or manipulation. Clues recorded neutrally.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
