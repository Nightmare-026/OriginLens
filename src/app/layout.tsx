import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Source_Sans_3 } from 'next/font/google';
import { SiteHeader } from '@/components/navigation/site-header';
import { SiteFooter } from '@/components/navigation/site-footer';
import './globals.css';

const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-source-sans-3',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OriginLens — Evidence-First Media Provenance Explorer',
  description:
    'Inspect supported embedded provenance evidence and compare two images without a real or fake verdict. Grounded in C2PA Content Credentials and exact cryptographic fingerprints.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={sourceSans3.variable}>
      <body className={sourceSans3.className}>
        <div className="site-layout">
          <SiteHeader />
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
