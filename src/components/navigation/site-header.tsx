'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header role="banner" className="site-header">
      <div className="site-header-inner">
        <Link id="nav-brand" href="/" className="brand-link">
          <span className="brand-logo-mark" aria-hidden="true">
            <svg
              className="brand-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 3v3" />
              <path d="M12 18v3" />
              <path d="M3 12h3" />
              <path d="M18 12h3" />
            </svg>
          </span>
          <span className="brand-text-group">
            <span className="brand-name">OriginLens</span>
            <span className="brand-badge">Evidence-First</span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="site-nav">
          <Link
            id="nav-how-to-use"
            data-testid="nav-how-to-use"
            href="/how-to-use"
            className={`nav-link ${pathname === '/how-to-use' ? 'nav-link-active' : ''}`}
          >
            How to Use
          </Link>
          <Link
            id="nav-privacy"
            data-testid="nav-privacy"
            href="/privacy"
            className={`nav-link ${pathname === '/privacy' ? 'nav-link-active' : ''}`}
          >
            Privacy Policy
          </Link>
        </nav>

        <div className="header-status-badge" aria-hidden="true">
          <span className="status-dot-pulse" />
          <span className="status-badge-text">100% Client-Side</span>
        </div>
      </div>
    </header>
  );
}
