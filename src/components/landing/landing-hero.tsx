'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  ArrowRightIcon,
  SlidersIcon,
  LockIcon,
  SparklesIcon,
  CheckCircleIcon,
  UploadCloudIcon,
  FingerprintIcon,
} from '@/components/ui/icons';

const PIPELINE_STAGES = [
  {
    id: 'stage-1',
    step: '01',
    label: 'Preflight Intake',
    shortTitle: 'Intake & Bounds',
    title: 'Stage 01: Preflight Intake & Security Bounds',
    tag: 'Client Sandbox',
    icon: UploadCloudIcon,
    summary: 'Strict magic-byte validation, format allowlisting, and decompression memory caps.',
    invariants: [
      '100% in-browser processing: zero network image uploads or server relays',
      'Format allowlist: strict JPEG (.jpg, .jpeg) and PNG (.png) magic-byte inspection',
      'Resource bounds: <= 20 MiB compressed file size, <= 20 MP decoded dimensions',
    ],
    codeEntries: [
      { key: 'intake.format.valid', val: 'image/jpeg (verified SOI marker 0xFFD8)', highlight: true },
      { key: 'intake.byte_size', val: '1,048,576 bytes (well within 20 MiB safety budget)' },
      { key: 'intake.dimensions', val: '1920 x 1080 (2.07 MP <= 20 MP ceiling)' },
      { key: 'intake.sandbox', val: 'volatile RAM buffer, zero disk persistence' },
    ],
    badge: '100% Client-Side',
  },
  {
    id: 'stage-2',
    step: '02',
    label: 'SHA-256 Digest',
    shortTitle: 'Byte Fingerprint',
    title: 'Stage 02: Original-Byte Cryptographic Hash',
    tag: 'FIPS 180-4 Standard',
    icon: FingerprintIcon,
    summary: 'Direct SHA-256 digest calculated over the exact original uploaded file bytes.',
    invariants: [
      'Computed directly over the exact original uploaded file bytes',
      'Calculated prior to browser canvas decoding, avoiding pixel mutations',
      'Tamper-evident cryptographic baseline for Provenance Delta comparison',
    ],
    codeEntries: [
      { key: 'sha256.digest', val: '75a8da33f6eaf1e16bf3b42cd78913b22b2e6a671fda805d76182c16263... (256-bit)', highlight: true },
      { key: 'sha256.engine', val: 'Web Crypto API (crypto.subtle.digest)' },
      { key: 'sha256.scope', val: 'exact original file byte stream (not canvas buffer)' },
      { key: 'sha256.binding', val: 'immutable cryptographic reference' },
    ],
    badge: 'Sub-Millisecond',
  },
  {
    id: 'stage-3',
    step: '03',
    label: 'WASM C2PA Engine',
    shortTitle: 'C2PA Manifest',
    title: 'Stage 03: WebAssembly C2PA Verification Engine',
    tag: 'C2PA Standard v0.15.4',
    icon: ShieldCheckIcon,
    summary: 'Client-side JUMBF box extraction, signature validity, and content binding.',
    invariants: [
      'Extracts JUMBF manifest boxes locally using pinned @contentauth/c2pa-web',
      'Validates X.509 digital signature certificates and signing timestamp assertions',
      'Checks content binding hash to mathematically detect pixel alteration after signing',
    ],
    codeEntries: [
      { key: 'c2pa.manifest', val: 'present (JUMBF container extracted)', highlight: true },
      { key: 'c2pa.signature', val: 'valid (Adobe Creative Cloud certificate)' },
      { key: 'c2pa.binding', val: 'valid (pixel data matches signed hash)' },
      { key: 'c2pa.signer_trust', val: 'not_evaluated (honest policy boundary)' },
    ],
    badge: 'WASM In-Browser',
  },
  {
    id: 'stage-4',
    step: '04',
    label: 'Meta Llama Co-Pilot',
    shortTitle: 'Multimodal AI',
    title: 'Stage 04: Meta Llama Multimodal Interrogation',
    tag: 'Optional Co-Pilot',
    icon: SparklesIcon,
    summary: 'Objective structured plain-language synthesis without hallucinated certainty.',
    invariants: [
      'Explicit opt-in required: never transmits data without affirmative user consent',
      'Transmits only bounded evidence codes, warnings, and SHA-256 (never image bytes or GPS)',
      'Multi-audience synthesis: tailored for General, Newsroom, or Forensic readers',
      'Strictly sandboxed: model cannot alter cryptographic verification outcomes',
    ],
    codeEntries: [
      { key: 'llama.payload', val: '{"sha256": "...", "codes": ["c2pa.valid"], "audience": "newsroom"}' },
      { key: 'llama.synthesis', val: '"Verified Adobe CC credential. Pixels unaltered since signing. Signer trust unevaluated."', highlight: true },
      { key: 'llama.sandbox', val: 'strictly non-authoritative: cannot modify cryptographic ledger' },
      { key: 'llama.privacy', val: 'zero image bytes transmitted, ephemeral stateless retention' },
    ],
    badge: 'Meta Llama 3.2 Vision',
  },
];

const DEFAULT_STAGE = PIPELINE_STAGES[0] as (typeof PIPELINE_STAGES)[number];

export function LandingHero() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const activeStage = PIPELINE_STAGES[activeStageIndex] ?? DEFAULT_STAGE;

  return (
    <section aria-labelledby="hero-title" className="landing-hero-section">
      <div className="landing-hero-inner">

        {/* Main Headline */}
        <h1 id="hero-title" className="landing-hero-title">
          Truth Through Verification: <br className="hero-title-break" />
          <span className="brand-lens-gradient">Cryptographic Evidence</span> for Modern Media
        </h1>

        {/* Subtitle */}
        <p className="landing-hero-subtitle">
          Move beyond fragile, statistical AI detectors that guess. Inspect cryptographic
          Content Credentials, verify original-byte integrity, and explore media provenance with Meta AI.
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
            <span>100% Client-Side Inspection by Default</span>
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

        {/* Interactive Cryptographic Verification Pipeline Diagram */}
        <div className="landing-mini-demo-wrapper" aria-label="Interactive cryptographic verification pipeline diagram">
          <div className="mini-demo-header">
            <div className="mini-demo-controls">
              <span className="window-dot red" aria-hidden="true" />
              <span className="window-dot yellow" aria-hidden="true" />
              <span className="window-dot green" aria-hidden="true" />
              <span className="mini-demo-title">Interactive Cryptographic Verification Pipeline</span>
            </div>
            <span className="stage-indicator-pill">
              Stage {activeStage.step} of 04
            </span>
          </div>

          {/* 4 Interactive Stages Tablist */}
          <div
            className="pipeline-diagram-stepper"
            role="tablist"
            aria-label="Verification pipeline stages"
          >
            {PIPELINE_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const isSelected = idx === activeStageIndex;
              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  id={`tab-${stage.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${stage.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  className={`pipeline-stage-tab ${isSelected ? 'stage-tab-active' : ''}`}
                  onClick={() => setActiveStageIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      const next = (idx + 1) % PIPELINE_STAGES.length;
                      setActiveStageIndex(next);
                      document.getElementById(`tab-${PIPELINE_STAGES[next]?.id}`)?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const prev = (idx - 1 + PIPELINE_STAGES.length) % PIPELINE_STAGES.length;
                      setActiveStageIndex(prev);
                      document.getElementById(`tab-${PIPELINE_STAGES[prev]?.id}`)?.focus();
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      setActiveStageIndex(0);
                      document.getElementById(`tab-${PIPELINE_STAGES[0]?.id}`)?.focus();
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      const last = PIPELINE_STAGES.length - 1;
                      setActiveStageIndex(last);
                      document.getElementById(`tab-${PIPELINE_STAGES[last]?.id}`)?.focus();
                    }
                  }}
                >
                  <span className="stage-tab-num" aria-hidden="true">
                    {stage.step}
                  </span>
                  <div className="stage-tab-meta">
                    <span className="stage-tab-title">{stage.label}</span>
                    <span className="stage-tab-sub">{stage.shortTitle}</span>
                  </div>
                  <StageIcon size={15} style={{ marginLeft: 'auto', opacity: isSelected ? 1 : 0.6 }} />
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Panel */}
          <div
            id={`panel-${activeStage.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeStage.id}`}
            className="mini-demo-body"
          >
            <div className="demo-badge-row">
              <span className="demo-status-pill success">
                <CheckCircleIcon size={14} />
                <strong>{activeStage.title}</strong>
              </span>
              <span className="demo-status-pill neutral">
                <span>{activeStage.tag}</span>
              </span>
              <span className="demo-status-pill info">
                <span>{activeStage.badge}</span>
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 1rem 0' }}>
              {activeStage.summary}
            </p>

            <div className="pipeline-stage-detail-grid">
              {/* Left Column: Invariants */}
              <div className="stage-invariants-box">
                <p className="stage-invariants-title">Core Invariants &amp; Guarantees</p>
                <ul className="stage-invariants-list" role="list">
                  {activeStage.invariants.map((inv) => (
                    <li key={inv} className="stage-invariant-item">
                      <CheckCircleIcon size={15} className="stage-invariant-icon" />
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Code Ledger Output */}
              <div className="demo-code-block" aria-label="Structured ledger evidence items">
                {activeStage.codeEntries.map((entry) => (
                  <div key={entry.key} className="demo-code-row">
                    <span className="code-key mono">{entry.key}:</span>
                    <span className={`code-val ${entry.highlight ? 'highlight' : ''} mono`}>
                      {entry.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
