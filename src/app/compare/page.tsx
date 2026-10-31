import type { Metadata } from 'next';
import { InspectorWorkflow } from '@/components/inspector/workflow';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://originlens-ai.vercel.app';

export const metadata: Metadata = {
  title: 'Compare Images — OriginLens',
  description:
    'Compare two independent images with Provenance Delta: hashes, metadata, C2PA credentials, and visual difference metrics side by side.',
  alternates: {
    canonical: '/compare',
  },
  openGraph: {
    title: 'Compare Images — OriginLens',
    description:
      'Compare two independent images with Provenance Delta: hashes, metadata, C2PA credentials, and visual difference metrics side by side.',
    url: `${baseUrl}/compare`,
  },
};

export default function ComparePage() {
  return <InspectorWorkflow mode="compare" />;
}
