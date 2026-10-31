'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { guidePageIdForPath } from '@/lib/guide/pages';
import type { GuideResponse } from '@/lib/guide/schema';

type GuideMode = GuideResponse['mode'];

interface GuideLink {
  label: string;
  href: string;
}

interface GuideMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: GuideMode;
  links?: GuideLink[];
  followUp?: string;
}

const SUGGESTED_QUESTIONS = [
  'What formats and size limits are supported?',
  'What does signer trust unknown mean?',
  'Does OriginLens tell me if an image is AI-generated?',
  'What data leaves my browser?',
] as const;

function errorMessageFor(status: number): string {
  if (status === 429) {
    return 'You have asked several questions in a short time. Please wait a few minutes.';
  }

  if (status === 413) {
    return 'That question is too long to send. Keep it under 300 characters.';
  }

  if (status === 403) {
    return 'This request was blocked by the site security policy.';
  }

  return 'The guide is unavailable right now. Please try again.';
}

export function GuideWidget() {
  const pathname = usePathname();
  const pageId = guidePageIdForPath(pathname);
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();

  const launcherRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messageCounter = useRef(0);
  const consentFocusApplied = useRef(false);
  const restoreLauncherFocus = useRef(false);

  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');

  const nextMessageId = (): string => {
    messageCounter.current += 1;
    return `guide-message-${messageCounter.current}`;
  };

  const closeGuide = useCallback(() => {
    restoreLauncherFocus.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      headingRef.current?.focus();
      return;
    }

    // The launcher is unmounted while the panel is open, so focus must be
    // restored on the render that brings it back, not inside the click handler.
    if (restoreLauncherFocus.current) {
      restoreLauncherFocus.current = false;
      launcherRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeGuide]);

  useEffect(() => {
    if (consented && !consentFocusApplied.current) {
      consentFocusApplied.current = true;
      inputRef.current?.focus();
    }
  }, [consented]);

  useEffect(() => {
    const log = logRef.current;

    if (log === null) {
      return;
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleAsk = async (questionOverride?: string): Promise<void> => {
    const question = (questionOverride ?? input).trim();

    if (question.length < 2 || status === 'loading') {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: 'user', text: question },
    ]);
    setInput('');
    setLastQuestion(question);
    setError(null);
    setStatus('loading');

    try {
      const response = await fetch('/api/guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({
          schemaVersion: '1.0',
          consent: true,
          question,
          page: pageId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        setError(errorMessageFor(response.status));
        setStatus('error');
        return;
      }

      const data = (await response.json()) as GuideResponse;

      setMessages((previous) => [
        ...previous,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: data.answer,
          mode: data.mode,
          links: data.links,
          followUp: data.followUp,
        },
      ]);
      setStatus('idle');
    } catch (requestError: unknown) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return;
      }

      setError('The guide is unavailable right now. Please try again.');
      setStatus('error');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const resetConversation = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setError(null);
    setStatus('idle');
    setLastQuestion('');
  };

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          className="guide-launcher"
          aria-label="Ask OriginLens help guide"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          data-testid="guide-launcher"
        >
          <svg
            className="guide-launcher-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            <path d="M8 9h8M8 13h5" />
          </svg>
          <span>Ask OriginLens</span>
        </button>
      )}

      {open && (
        <section
          id={panelId}
          className="guide-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-testid="guide-panel"
        >
          <header className="guide-header">
            <div>
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="guide-title"
                data-testid="guide-title"
              >
                OriginLens Guide
              </h2>
              <p className="guide-subtitle">Help with the site, the checks, and privacy.</p>
            </div>
            <button
              type="button"
              className="guide-close"
              aria-label="Close help guide"
              onClick={closeGuide}
              data-testid="guide-close"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          {!consented ? (
            <div className="guide-consent" data-testid="guide-consent">
              <p>
                This optional AI guide answers questions about OriginLens using reviewed help
                content. When you ask, <strong>only your question and the current page name</strong>{' '}
                are sent to Baseten, which hosts Meta Muse Spark Open. No image, report, hash,
                filename, GPS coordinate, or metadata value is sent.
              </p>
              <p>
                Answers are AI-generated, can be wrong, and never change a verification result. If
                the provider is unavailable, a reviewed reference answer is shown instead.
              </p>
              <div className="guide-consent-actions">
                <button
                  type="button"
                  onClick={() => setConsented(true)}
                  data-testid="guide-start"
                >
                  Start guide
                </button>
                <Link href="/privacy" className="guide-privacy-link">
                  Read the privacy notice
                </Link>
              </div>
              <p className="guide-fine-print">
                Muse Spark Open via Baseten · non-authoritative · provider terms apply
              </p>
            </div>
          ) : (
            <>
              <div
                ref={logRef}
                className="guide-log"
                role="log"
                aria-live="polite"
                aria-label="Guide conversation"
                data-testid="guide-log"
              >
                {messages.length === 0 && (
                  <div className="guide-empty">
                    <p>Ask about supported formats, the Evidence Ledger, signer trust, privacy, or reports.</p>
                    <div className="guide-suggestions">
                      {SUGGESTED_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="guide-suggestion"
                          onClick={() => void handleAsk(question)}
                          disabled={status === 'loading'}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`guide-message guide-message-${message.role}`}
                    data-testid={`guide-message-${message.role}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="guide-message-meta">
                        <span
                          className={
                            message.mode === 'ai_generated'
                              ? 'guide-badge guide-badge-ai'
                              : 'guide-badge guide-badge-reference'
                          }
                          data-testid="guide-mode"
                        >
                          {message.mode === 'ai_generated'
                            ? 'AI-generated'
                            : 'Reviewed reference'}
                        </span>
                      </div>
                    )}
                    <p>{message.text}</p>
                    {message.links !== undefined && message.links.length > 0 && (
                      <ul className="guide-links" aria-label="Related pages">
                        {message.links.map((link) => (
                          <li key={link.href}>
                            <Link href={link.href}>{link.label}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {message.followUp !== undefined && (
                      <button
                        type="button"
                        className="guide-follow-up"
                        onClick={() => void handleAsk(message.followUp)}
                        disabled={status === 'loading'}
                      >
                        {message.followUp}
                      </button>
                    )}
                  </div>
                ))}

                {status === 'loading' && (
                  <div className="guide-message guide-message-assistant" data-testid="guide-loading">
                    <p className="guide-loading-text" role="status">
                      Checking the reviewed help content and preparing an answer…
                    </p>
                  </div>
                )}

                {error !== null && (
                  <div className="guide-error" role="alert" data-testid="guide-error">
                    <p>{error}</p>
                    {lastQuestion !== '' && (
                      <button
                        type="button"
                        className="guide-retry"
                        onClick={() => void handleAsk(lastQuestion)}
                        disabled={status === 'loading'}
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
              </div>

              <form
                className="guide-input-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAsk();
                }}
              >
                <label htmlFor={inputId} className="visually-hidden">
                  Ask a question about OriginLens
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  value={input}
                  maxLength={300}
                  placeholder="Ask about formats, privacy, or evidence…"
                  onChange={(event) => setInput(event.target.value)}
                  disabled={status === 'loading'}
                  data-testid="guide-input"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || input.trim().length < 2}
                  data-testid="guide-send"
                >
                  Ask
                </button>
              </form>

              <footer className="guide-footer">
                <span>
                  AI answers can be wrong. Verification results come only from the Evidence Ledger.
                </span>
                <button
                  type="button"
                  className="guide-clear"
                  onClick={resetConversation}
                  disabled={messages.length === 0 && error === null}
                >
                  Clear
                </button>
              </footer>
            </>
          )}
        </section>
      )}
    </>
  );
}
