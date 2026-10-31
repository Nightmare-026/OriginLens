import type { Metadata } from 'next';
import { InspectorWorkflow } from '@/components/inspector/workflow';

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://originlens-ai.vercel.app';

export const metadata: Metadata = {
  title: 'Inspect Image — OriginLens',
  description:
    'Inspect single image cryptographic provenance evidence, Content Credentials (C2PA), and EXIF metadata clues client-side.',
  alternates: {
    canonical: '/inspect',
  },
  openGraph: {
    title: 'Inspect Image — OriginLens',
    description:
      'Inspect single image cryptographic provenance evidence, Content Credentials (C2PA), and EXIF metadata clues client-side.',
    url: `${baseUrl}/inspect`,
  },
};

export default function InspectPage() {
  return <InspectorWorkflow mode="single" />;
}
