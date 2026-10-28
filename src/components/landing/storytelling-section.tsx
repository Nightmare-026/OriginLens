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
          <p className="eyebrow">The Anti-Snake-Oil Philosophy</p>
          <h2 id="story-heading" className="landing-section-title">
            Why Guesswork Fails & <span className="text-emerald">Cryptographic Truth</span> Wins
          </h2>
          <p className="landing-section-subtitle">
            In an era of generative AI explosion, statistical &quot;AI detectors&quot; offer a false sense of security.
            Here is why OriginLens takes an uncompromising, evidence-first cryptographic stance.
          </p>
        </div>
      </ScrollReveal>

      <div className="landing-story-grid">
        {/* Story Card 1 */}
        <ScrollReveal delayClass="reveal-delay-1">
          <article className="story-card hover-tactile-lift">
            <div className="story-card-icon-wrapper danger">
              <AlertTriangleIcon size={28} />
            </div>
            <span className="story-card-tag danger">The Industry Flaw</span>
            <h3 className="story-card-title">The &quot;AI Detector&quot; Illusion</h3>
            <p className="story-card-text">
            Statistical classifiers claim to detect AI images by analyzing pixel noise patterns.
            In reality, simple JPEG compression, social media resizing, or mild color grading easily fools them,
            producing catastrophic false accusations against real photojournalists.
          </p>
          <ul className="story-points-list" role="list">
            <li className="story-point-item negative">
              <XCircleIcon size={16} />
              <span>High false-positive rate on recompressed web media</span>
            </li>
            <li className="story-point-item negative">
              <XCircleIcon size={16} />
              <span>Zero mathematical proof or verifiable audit trail</span>
            </li>
            <li className="story-point-item negative">
              <XCircleIcon size={16} />
              <span>Misleads the public with arbitrary probability scores (e.g. 78% AI)</span>
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
            <h3 className="story-card-title">Cryptographic Custody (C2PA)</h3>
            <p className="story-card-text">
              Rather than guessing, the open C2PA standard embeds tamper-evident JUMBF metadata boxes
              signed with public-key certificates directly into the image header. If a single pixel is altered,
              the cryptographic hash breaks immediately and verifiably.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Mathematical binding between image bytes and author signature</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Backed by Leica, Sony, Nikon, Adobe, BBC, and Microsoft</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Verified 100% locally in your browser via WebAssembly</span>
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
            <span className="story-card-tag cyan">AI Explainability Co-Pilot</span>
            <h3 className="story-card-title">Meta Llama Multimodal Co-Pilot</h3>
            <p className="story-card-text">
              Raw cryptographic certificates and EXIF dumps are dense and confusing for non-engineers.
              OriginLens integrates Meta Llama 3.2 Vision to interpret validated evidence into plain,
              accessible, neutral language for newsrooms, legal teams, and the public.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Explains verified facts without hallucinating certainty</span>
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
