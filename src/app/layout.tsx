import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/navigation/site-header';
import { SiteFooter } from '@/components/navigation/site-footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'OriginLens — Evidence-First Media Provenance Explorer',
  description:
    'Inspect supported embedded provenance evidence and compare two images without a real or fake verdict.',
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
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
