'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Adjust state during render when pathname changes (React recommended pattern)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  return (
    <header role="banner" className="site-header">
      <div className="site-header-inner">
        <Link id="nav-brand" href="/" className="brand-link">
          <span className="brand-logo-mark" aria-hidden="true">
            <Image
              src="/logo.png"
              alt=""
              width={38}
              height={38}
              priority
              className="brand-logo-img"
            />
          </span>
          <span className="brand-text-group">
            <span className="brand-name">
              Origin<span className="brand-lens-gradient">Lens</span>
            </span>
            <span className="brand-badge">Evidence-First</span>
          </span>
        </Link>

        {/* Breadboard / Hamburger Dropdown Navigation */}
        <div className="nav-dropdown-wrapper" ref={menuRef}>
          <button
            type="button"
            id="nav-menu-button"
            data-testid="nav-menu-button"
            aria-label="Navigation menu"
            aria-expanded={isOpen}
            aria-controls="nav-dropdown-menu"
            aria-haspopup="true"
            className="menu-toggle-btn"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <svg
              className="menu-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>

          <nav
            id="nav-dropdown-menu"
            aria-label="Primary navigation"
            className={`nav-dropdown ${isOpen ? 'nav-dropdown-open' : ''}`}
            hidden={!isOpen}
          >
            <div className="nav-dropdown-header">Navigation</div>
            <Link
              id="nav-how-to-use"
              data-testid="nav-how-to-use"
              href="/how-to-use"
              className={`nav-dropdown-link nav-link ${pathname === '/how-to-use' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                className="nav-item-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>How to Use</span>
            </Link>
            <Link
              id="nav-privacy"
              data-testid="nav-privacy"
              href="/privacy"
              className={`nav-dropdown-link nav-link ${pathname === '/privacy' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                className="nav-item-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Privacy Policy</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
