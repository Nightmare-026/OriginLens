import type { Metadata } from 'next';
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
  return <C2paSmokeClient />;
}
