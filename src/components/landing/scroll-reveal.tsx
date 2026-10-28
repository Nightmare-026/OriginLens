'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export type ScrollRevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  delayClass?: 'reveal-delay-1' | 'reveal-delay-2' | 'reveal-delay-3' | 'reveal-delay-4';
}>;

export function ScrollReveal({ children, className = '', delayClass }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-revealed');
      return;
    }

    // Fallback if IntersectionObserver is unsupported
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-revealed');
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px',
      },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const combinedClass = [
    'reveal-on-scroll',
    delayClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={combinedClass}>
      {children}
    </div>
  );
}
