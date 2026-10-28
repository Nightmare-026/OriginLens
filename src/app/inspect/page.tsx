import type { Metadata } from 'next';
import { InspectorWorkflow } from '@/components/inspector/workflow';

export const metadata: Metadata = {
  title: 'Inspect Image — OriginLens',
  description:
    'Inspect single image cryptographic provenance evidence, Content Credentials (C2PA), and EXIF metadata clues client-side.',
};

export default function InspectPage() {
  return <InspectorWorkflow mode="single" />;
}
