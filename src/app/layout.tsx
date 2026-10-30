import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/navigation/site-header';
import { SiteFooter } from '@/components/navigation/site-footer';
import './globals.css';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'OriginLens — Evidence-First Media Provenance Explorer',
  description:
    'Inspect supported embedded provenance evidence and compare two images without a real or fake verdict. Grounded in C2PA Content Credentials and exact cryptographic fingerprints.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'OriginLens — Evidence-First Media Provenance Explorer',
    description:
      'Inspect supported embedded provenance evidence and compare two images without a real or fake verdict. Grounded in C2PA Content Credentials and exact cryptographic fingerprints.',
    url: appUrl,
    siteName: 'OriginLens',
    images: [
      {
        url: '/logo.png',
        width: 128,
        height: 128,
        alt: 'OriginLens Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'OriginLens — Evidence-First Media Provenance Explorer',
    description:
      'Inspect supported embedded provenance evidence and compare two images without a real or fake verdict. Grounded in C2PA Content Credentials and exact cryptographic fingerprints.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-layout">
          <SiteHeader />
          <div className="site-content" id="main-content">
            {children}
          </div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
