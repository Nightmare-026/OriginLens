import type { Metadata } from 'next';
import { LandingHero } from '@/components/landing/landing-hero';
import { StorytellingSection } from '@/components/landing/storytelling-section';
import { PipelineSection } from '@/components/landing/pipeline-section';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { CtaSection } from '@/components/landing/cta-section';

export const metadata: Metadata = {
  title: 'OriginLens — Evidence-First Media Provenance Explorer',
  description:
    'Inspect embedded Content Credentials (C2PA), compute exact-byte SHA-256 fingerprints, and compare two images without guessing which is original.',
};

export default function HomePage() {
  return (
    <main className="landing-page-container">
      <LandingHero />
      <StorytellingSection />
      <PipelineSection />
      <FeaturesGrid />
      <CtaSection />
    </main>
  );
}
