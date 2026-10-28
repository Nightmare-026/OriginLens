'use client';

import {
  AlertTriangleIcon,
  ShieldCheckIcon,
  CpuIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@/components/ui/icons';
import { ScrollReveal } from './scroll-reveal';

export function StorytellingSection() {
  return (
    <section aria-labelledby="story-heading" className="landing-story-section">
      <ScrollReveal>
        <div className="landing-section-header">
          <p className="eyebrow">The Provenance Approach</p>
          <h2 id="story-heading" className="landing-section-title">
            Why Statistical Detection Fails &amp; <span className="text-emerald">Cryptographic Verification</span> Succeeds
          </h2>
          <p className="landing-section-subtitle">
            In an era of generative AI proliferation, statistical classifiers offer an unreliable heuristic.
            Here is why OriginLens takes a calm, rigorous, evidence-first cryptographic approach.
          </p>
        </div>
      </ScrollReveal>

      <div className="landing-story-grid">
        {/* Story Card 1 */}
        <ScrollReveal delayClass="reveal-delay-1">
          <article className="story-card hover-tactile-lift">
            <div className="story-card-icon-wrapper amber">
              <AlertTriangleIcon size={28} />
            </div>
            <span className="story-card-tag amber">Statistical Classification</span>
            <h3 className="story-card-title">The Limits of Statistical AI Detection</h3>
            <p className="story-card-text">
              Statistical classifiers attempt to identify synthetic media by analyzing pixel distribution patterns.
              However, standard operations like JPEG recompression, social platform downscaling, or subtle color filtering
              fundamentally alter high-frequency pixel noise—frequently resulting in unverified findings and false accusations.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>Elevated false-positive rates on compressed web distribution formats</span>
              </li>
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>No mathematical chain of custody or cryptographic verification</span>
              </li>
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>Presents opaque probability heuristics rather than deterministic evidence</span>
              </li>
            </ul>
          </article>
        </ScrollReveal>

        {/* Story Card 2 */}
        <ScrollReveal delayClass="reveal-delay-2">
          <article className="story-card hover-tactile-lift">
            <div className="story-card-icon-wrapper emerald">
              <ShieldCheckIcon size={28} />
            </div>
            <span className="story-card-tag emerald">The Provenance Standard</span>
            <h3 className="story-card-title">The C2PA Open Standard</h3>
            <p className="story-card-text">
              Rather than guessing from pixel heuristics, the open C2PA standard embeds cryptographically signed
              JUMBF metadata manifest boxes directly within media files. If any image bytes are modified after signing,
              the cryptographic hash binding fails deterministically and verifiably.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Mathematical binding between image bytes and author signing key</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Supported by major media, hardware, and software organizations</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Validated 100% locally in your browser via WebAssembly</span>
              </li>
            </ul>
          </article>
        </ScrollReveal>

        {/* Story Card 3 */}
        <ScrollReveal delayClass="reveal-delay-3">
          <article className="story-card hover-tactile-lift">
            <div className="story-card-icon-wrapper cyan">
              <CpuIcon size={28} />
            </div>
            <span className="story-card-tag cyan">Multimodal Synthesis</span>
            <h3 className="story-card-title">Meta Llama Multimodal Co-Pilot</h3>
            <p className="story-card-text">
              Raw cryptographic certificates and EXIF structures can be challenging for non-specialists to navigate.
              OriginLens offers an optional Meta Llama 3.2 Vision explanation to summarize validated evidence into
              clear, objective language for newsrooms, legal teams, and researchers.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Explains verified evidence items without extrapolating scene truth</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Tailors explanations for General, Newsroom, and Forensic audiences</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Strictly sandboxed: never mutates or overrides cryptographic results</span>
              </li>
            </ul>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
