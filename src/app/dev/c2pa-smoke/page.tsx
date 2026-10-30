import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { C2paSmokeClient } from './smoke-client';

export const metadata: Metadata = {
  title: 'C2PA Smoke Harness — OriginLens',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/dev/c2pa-smoke',
  },
};

export default function C2paSmokePage() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_SMOKE) {
    notFound();
  }
  return <C2paSmokeClient />;
}
