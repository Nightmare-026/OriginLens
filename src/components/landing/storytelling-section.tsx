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
            Why OriginLens Relies on <span className="text-emerald">Recorded Provenance Evidence</span>
          </h2>
          <p className="landing-section-subtitle">
            Statistical classifiers infer from pixel patterns. OriginLens instead reports what an
            embedded credential actually records, and states plainly what remains unknown.
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
              Statistical classifiers try to identify synthetic media from pixel distribution
              patterns. Ordinary operations such as JPEG recompression, social platform downscaling,
              or colour filtering change those patterns, so a classifier score is not a record of how
              a file was produced.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>Results depend on processing that happens after capture or generation</span>
              </li>
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>No recorded chain of custody or signed statement to inspect</span>
              </li>
              <li className="story-point-item negative">
                <XCircleIcon size={16} />
                <span>Outputs a score rather than a check result that can be reviewed</span>
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
              Rather than guessing from pixel heuristics, the open C2PA standard stores a signed
              manifest inside the file. The manifest can record the claim, the signer, and a hash of
              the covered content. If the covered bytes change after signing, the content-binding
              check can report a mismatch; that is a finding about the credential, not proof of
              intent.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Signed claim binding reported separately from signer trust</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Supported by major media, hardware, and software organizations</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Manifest reading runs locally in your browser via WebAssembly</span>
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
            <span className="story-card-tag cyan">Optional Layer</span>
            <h3 className="story-card-title">Optional Model Explanation</h3>
            <p className="story-card-text">
              Certificates and EXIF structures can be hard to read for non-specialists. When a
              deployment enables a language model, OriginLens can explain the recorded check states
              in plain language. The request never includes image bytes or metadata values, and the
              explanation never changes a result.
            </p>
            <ul className="story-points-list" role="list">
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Explains recorded check states without asserting scene truth</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Tailors explanations for General, Newsroom, and Technical audiences</span>
              </li>
              <li className="story-point-item positive">
                <CheckCircleIcon size={16} />
                <span>Non-authoritative: cannot add findings or change any check outcome</span>
              </li>
            </ul>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
