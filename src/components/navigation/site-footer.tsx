'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  const isHome = pathname === '/';

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
          <div className="footer-privacy-pill" role="status">
            <span className="footer-privacy-dot" aria-hidden="true" />
            <span>100% In-Browser Engine • Zero Remote Relays • Zero Cookies</span>
          </div>
        </div>

        {!isHome ? (
          <>
            <div className="footer-nav-col">
              <h2 className="footer-heading">Navigation</h2>
              <ul className="footer-links" role="list">
                <li>
                  <Link id="footer-explorer" href="/" className="footer-link">
                    Media Explorer
                  </Link>
                </li>
                <li>
                  <Link id="footer-how-to-use" href="/how-to-use" className="footer-link">
                    How to Use Guide
                  </Link>
                </li>
                <li>
                  <Link id="footer-privacy" href="/privacy" className="footer-link">
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
                    className="footer-link"
                  >
                    C2PA Specification ↗
                  </a>
                </li>
                <li>
                  <a
                    id="footer-cai"
                    href="https://contentauthenticity.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    CAI Initiative ↗
                  </a>
                </li>
              </ul>
            </div>
          </>
        ) : null}

        <div className="footer-nav-col">
          <h2 className="footer-heading">Open Source</h2>
          <ul className="footer-links" role="list">
            <li>
              <a
                id="footer-github"
                href="https://github.com/Nightmare-026/OriginLens"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                GitHub Repository ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p className="footer-copy">
          OriginLens is open-source under the MIT License • Powered by pinned{' '}
          <code>@contentauth/c2pa-web@0.15.4</code> WebAssembly engine.
        </p>
      </div>
    </footer>
  );
}
