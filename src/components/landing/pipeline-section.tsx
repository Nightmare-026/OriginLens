'use client';

import {
  UploadCloudIcon,
  FingerprintIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@/components/ui/icons';
import { ScrollReveal } from './scroll-reveal';

const PIPELINE_STEPS = [
  {
    step: '01',
    name: 'Safe Client Intake & Preflight',
    icon: UploadCloudIcon,
    tag: 'Stage 1 & 2',
    delayClass: 'reveal-delay-1' as const,
    desc: 'Validates magic bytes, strict MIME types (JPEG & PNG only), enforces 20 MiB memory bounds, and verifies that the file stays 100% inside your browser.',
    metric: 'Zero bytes uploaded',
  },
  {
    step: '02',
    name: 'Original-Byte SHA-256 Fingerprint',
    icon: FingerprintIcon,
    tag: 'Stage 3',
    delayClass: 'reveal-delay-2' as const,
    desc: 'Computes a cryptographic hash directly from raw bytes before any canvas or browser decoder mutation, ensuring an indisputable forensic baseline.',
    metric: 'Sub-millisecond hashing',
  },
  {
    step: '03',
    name: 'WASM C2PA Manifest Verification',
    icon: ShieldCheckIcon,
    tag: 'Stage 4 & 5',
    delayClass: 'reveal-delay-3' as const,
    desc: 'Executes the pinned WebAssembly C2PA reader to extract JUMBF containers, validate digital signatures, verify claim hashes, and check asset binding.',
    metric: 'Pinned C2PA v0.15.4',
  },
  {
    step: '04',
    name: 'Meta Llama Multimodal Co-Pilot',
    icon: SparklesIcon,
    tag: 'P1 Stage',
    delayClass: 'reveal-delay-4' as const,
    desc: 'Synthesizes validated structured evidence into concise explanations for newsroom, legal, or general audiences without overriding verification state.',
    metric: 'Meta Llama 3.2 Vision',
  },
];

export function PipelineSection() {
  return (
    <section aria-labelledby="pipeline-heading" className="landing-pipeline-section">
      <ScrollReveal>
        <div className="landing-section-header">
          <p className="eyebrow">Deterministic Architecture</p>
          <h2 id="pipeline-heading" className="landing-section-title">
            How OriginLens <span className="text-emerald">Verifies Integrity</span>
          </h2>
          <p className="landing-section-subtitle">
            Every finding traces to an explicit, isolated pipeline check. No black boxes,
            no hidden cloud relays, and no made-up percentages.
          </p>
        </div>
      </ScrollReveal>

      <div className="landing-pipeline-timeline" role="list" aria-label="Verification pipeline steps">
        {PIPELINE_STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <ScrollReveal key={item.step} delayClass={item.delayClass}>
              <div className="pipeline-card hover-tactile-lift" role="listitem">
                <div className="pipeline-card-top">
                  <span className="pipeline-step-badge">{item.step}</span>
                  <span className="pipeline-tag">{item.tag}</span>
                </div>
                <div className="pipeline-icon-circle">
                  <Icon size={24} />
                </div>
                <h3 className="pipeline-title">{item.name}</h3>
                <p className="pipeline-desc">{item.desc}</p>
                <div className="pipeline-metric-footer">
                  <span className="metric-label">Benchmark:</span>
                  <span className="metric-val">{item.metric}</span>
                </div>
                {index < PIPELINE_STEPS.length - 1 && (
                  <div className="pipeline-connector-line" aria-hidden="true" />
                )}
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
