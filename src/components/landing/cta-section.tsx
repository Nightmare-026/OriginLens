'use client';

import Link from 'next/link';
import {
  ShieldCheckIcon,
  SlidersIcon,
  ArrowRightIcon,
  LockIcon,
} from '@/components/ui/icons';
import { ScrollReveal } from './scroll-reveal';

export function CtaSection() {
  return (
    <section aria-labelledby="cta-bottom-heading" className="landing-bottom-cta">
      <ScrollReveal>
        <div className="landing-cta-card">
          <div className="landing-cta-content">
            <p className="eyebrow">Ready to Inspect?</p>
            <h2 id="cta-bottom-heading" className="landing-cta-title">
              Verify Media Integrity In Seconds
            </h2>
            <p className="landing-cta-desc">
              No signup required. No images uploaded. 100% private in-browser analysis.
              Experience the new standard for digital media provenance.
            </p>

            <div className="landing-cta-buttons">
              <Link
                id="cta-bottom-inspect"
                data-testid="cta-bottom-inspect"
                href="/inspect"
                className="btn-primary landing-cta-primary"
              >
                <ShieldCheckIcon size={18} />
                <span>Inspect Single Image</span>
                <ArrowRightIcon size={16} />
              </Link>
              <Link
                id="cta-bottom-compare"
                data-testid="cta-bottom-compare"
                href="/compare"
                className="btn-secondary landing-cta-secondary"
              >
                <SlidersIcon size={18} />
                <span>Compare Two Images</span>
              </Link>
            </div>

            <div className="landing-cta-privacy-note">
              <LockIcon size={14} />
              <span>Files are analyzed in local browser memory and released upon session clear.</span>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
