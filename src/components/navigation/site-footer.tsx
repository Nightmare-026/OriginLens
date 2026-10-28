'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLinkIcon } from '@/components/ui/icons';

export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer role="contentinfo" className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand-col">
          <div className="footer-logo">
            <span className="brand-logo-mark" aria-hidden="true">
              <Image
                src="/logo.png"
                alt=""
                width={38}
                height={38}
                className="brand-logo-img"
              />
            </span>
            <span className="footer-brand-name">
              Origin<span className="brand-lens-gradient">Lens</span>
            </span>
          </div>
          <p className="footer-mission">
            Evidence-First Media Provenance Explorer. Inspects cryptographic C2PA credentials
            and file metadata clues with honest uncertainty—without guessing authenticity or intent.
          </p>
        </div>

        <div className="footer-nav-col">
          <h2 className="footer-heading">Navigation</h2>
          <ul className="footer-links" role="list">
            <li>
              <Link
                id="footer-home"
                href="/"
                className={`footer-link ${pathname === '/' ? 'footer-link-active' : ''}`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                id="footer-inspect"
                href="/inspect"
                className={`footer-link ${pathname === '/inspect' ? 'footer-link-active' : ''}`}
              >
                Inspect Image
              </Link>
            </li>
            <li>
              <Link
                id="footer-compare"
                href="/compare"
                className={`footer-link ${pathname === '/compare' ? 'footer-link-active' : ''}`}
              >
                Compare Images
              </Link>
            </li>
            <li>
              <Link
                id="footer-how-to-use"
                href="/how-to-use"
                className={`footer-link ${pathname === '/how-to-use' ? 'footer-link-active' : ''}`}
              >
                How to Use Guide
              </Link>
            </li>
            <li>
              <Link
                id="footer-privacy"
                href="/privacy"
                className={`footer-link ${pathname === '/privacy' ? 'footer-link-active' : ''}`}
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-nav-col">
          <h2 className="footer-heading">Standards</h2>
          <ul className="footer-links" role="list">
            <li>
              <a
                id="footer-c2pa"
                href="https://c2pa.org"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-ext-link"
              >
                <span>C2PA Specification</span>
                <ExternalLinkIcon size={12} />
              </a>
            </li>
            <li>
              <a
                id="footer-cai"
                href="https://contentauthenticity.org"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-ext-link"
              >
                <span>CAI Initiative</span>
                <ExternalLinkIcon size={12} />
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-nav-col">
          <h2 className="footer-heading">Open Source</h2>
          <ul className="footer-links" role="list">
            <li>
              <a
                id="footer-github"
                href="https://github.com/Nightmare-026/OriginLens"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-ext-link"
              >
                <span>GitHub Repository</span>
                <ExternalLinkIcon size={12} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
