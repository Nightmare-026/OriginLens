import type { Metadata } from 'next';
import { InspectorWorkflow } from '@/components/inspector/workflow';

export const metadata: Metadata = {
  title: 'Compare Images — OriginLens',
  description:
    'Compare two independent images with Provenance Delta: hashes, metadata, C2PA credentials, and visual difference metrics side by side.',
};

export default function ComparePage() {
  return <InspectorWorkflow mode="compare" />;
}
