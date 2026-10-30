'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheckIcon,
  SplitIcon,
  CompassIcon,
  LockIcon,
  BookOpenIcon,
  InfoIcon,
} from '@/components/ui/icons';

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
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
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
          </span>
        </Link>

        {/* Desktop inline navigation links */}
        <nav className="desktop-nav-links" aria-label="Desktop navigation">
          <Link
            id="nav-inspect-desktop"
            data-testid="nav-inspect-desktop"
            href="/inspect"
            className={`desktop-nav-link ${pathname === '/inspect' ? 'nav-link-active' : ''}`}
          >
            Inspect Image
          </Link>
          <Link
            id="nav-compare-desktop"
            data-testid="nav-compare-desktop"
            href="/compare"
            className={`desktop-nav-link ${pathname === '/compare' ? 'nav-link-active' : ''}`}
          >
            Compare Images
          </Link>
          <Link
            id="nav-how-to-use-desktop"
            data-testid="nav-how-to-use-desktop"
            href="/how-to-use"
            className={`desktop-nav-link ${pathname === '/how-to-use' ? 'nav-link-active' : ''}`}
          >
            How to Use
          </Link>
          <Link
            id="nav-about-desktop"
            data-testid="nav-about-desktop"
            href="/about"
            className={`desktop-nav-link ${pathname === '/about' ? 'nav-link-active' : ''}`}
          >
            About
          </Link>
          <Link
            id="nav-privacy-desktop"
            data-testid="nav-privacy-desktop"
            href="/privacy"
            className={`desktop-nav-link ${pathname === '/privacy' ? 'nav-link-active' : ''}`}
          >
            Privacy Policy
          </Link>
        </nav>

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
              id="nav-home"
              data-testid="nav-home"
              href="/"
              className={`nav-dropdown-link nav-link ${pathname === '/' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <CompassIcon size={18} className="nav-item-icon" />
              <span>Home</span>
            </Link>
            <Link
              id="nav-inspect"
              data-testid="nav-inspect"
              href="/inspect"
              className={`nav-dropdown-link nav-link ${pathname === '/inspect' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <ShieldCheckIcon size={18} className="nav-item-icon" />
              <span>Inspect Image</span>
            </Link>
            <Link
              id="nav-compare"
              data-testid="nav-compare"
              href="/compare"
              className={`nav-dropdown-link nav-link ${pathname === '/compare' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <SplitIcon size={18} className="nav-item-icon" />
              <span>Compare Images</span>
            </Link>
            <Link
              id="nav-how-to-use"
              data-testid="nav-how-to-use"
              href="/how-to-use"
              className={`nav-dropdown-link nav-link ${pathname === '/how-to-use' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <BookOpenIcon size={18} className="nav-item-icon" />
              <span>How to Use</span>
            </Link>
            <Link
              id="nav-about"
              data-testid="nav-about"
              href="/about"
              className={`nav-dropdown-link nav-link ${pathname === '/about' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <InfoIcon size={18} className="nav-item-icon" />
              <span>About</span>
            </Link>
            <Link
              id="nav-privacy"
              data-testid="nav-privacy"
              href="/privacy"
              className={`nav-dropdown-link nav-link ${pathname === '/privacy' ? 'nav-link-active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <LockIcon size={18} className="nav-item-icon" />
              <span>Privacy Policy</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
    </>
  );
}
