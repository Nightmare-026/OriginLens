'use client';

import {
  FileCheckIcon,
  SlidersIcon,
  SplitIcon,
  CompassIcon,
  LockIcon,
  DownloadIcon,
} from '@/components/ui/icons';
import { ScrollReveal } from './scroll-reveal';

const FEATURES = [
  {
    icon: FileCheckIcon,
    title: 'Evidence Ledger',
    delayClass: 'reveal-delay-1' as const,
    desc: 'Every single claim is linked to an exact check ID and immutable structured evidence object. Zero ungrounded assertions.',
  },
  {
    icon: SlidersIcon,
    title: 'Provenance Delta',
    delayClass: 'reveal-delay-2' as const,
    desc: 'Compare two independent images side by side without guessing which one is the original, older, or edited version.',
  },
  {
    icon: SplitIcon,
    title: 'Visual Split & Heatmap',
    delayClass: 'reveal-delay-3' as const,
    desc: 'Interactive wipe slider and canvas difference heatmap to visually explore subtle pixel modifications between paired files.',
  },
  {
    icon: CompassIcon,
    title: 'Honest Uncertainty Engine',
    delayClass: 'reveal-delay-1' as const,
    desc: 'Absence of C2PA credentials is never mislabeled as fake or human-made. Transparently reports what was checked and what was not.',
  },
  {
    icon: LockIcon,
    title: 'Privacy By Design',
    delayClass: 'reveal-delay-2' as const,
    desc: 'Runs entirely in local browser RAM via WebAssembly. Zero image uploads, zero cookies, zero telemetry, and GPS masked by default.',
  },
  {
    icon: DownloadIcon,
    title: 'Verifiable Audit Export',
    delayClass: 'reveal-delay-3' as const,
    desc: 'Download versioned PRD v2.0 JSON audit reports and downloadable social summary cards with embedded cryptographic digests.',
  },
];

export function FeaturesGrid() {
  return (
    <section aria-labelledby="features-heading" className="landing-features-section">
      <ScrollReveal>
        <div className="landing-section-header">
          <p className="eyebrow">Comprehensive Capabilities</p>
          <h2 id="features-heading" className="landing-section-title">
            Built For <span className="text-emerald">Journalists, Researchers & Citizens</span>
          </h2>
          <p className="landing-section-subtitle">
            OriginLens provides enterprise-grade media forensics with the simplicity of a web app.
          </p>
        </div>
      </ScrollReveal>

      <div className="landing-features-grid" role="list" aria-label="OriginLens feature list">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <ScrollReveal key={feature.title} delayClass={feature.delayClass}>
              <div className="feature-card hover-tactile-lift" role="listitem">
                <div className="feature-icon-wrapper">
                  <Icon size={24} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
