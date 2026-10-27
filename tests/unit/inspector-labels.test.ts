import { describe, expect, it } from 'vitest';
import {
  CHECK_DESCRIPTIONS,
  CHECK_LABELS,
  EXECUTION_STATE_LABELS,
  MANIFEST_LABELS,
  OUTCOME_LABELS,
  REVOCATION_LABELS,
  STAGE_ORDER,
  TRUST_LABELS,
  VALIDATION_LABELS,
  formatByteSize,
  formatDimensions,
  formatUtcInstant,
} from '@/components/inspector/labels';
import { PIPELINE_STAGES } from '@/lib/pipeline/types';
import {
  CHECK_KINDS,
  COMMON_OUTCOMES,
  EXECUTION_STATES,
  MANIFEST_PRESENCE_STATES,
  REVOCATION_STATES,
  SIGNER_TRUST_STATES,
  VALIDATION_STATES,
} from '@/lib/results/schemas';

/**
 * Presentation vocabulary is exhaustive by type. These tests make the
 * exhaustiveness a runtime fact too: a new domain state cannot render as a
 * blank cell or silently borrow a friendlier label.
 */

const BANNED_VERDICT_LANGUAGE =
  /\bfake\b|\bauthentic(ity)?\b|\btamper(ed|ing)?\b|\b100%\b|\bprobability\b|\bdeepfake\b|\bAI[- ]generated\b/i;

describe('label vocabularies', () => {
  it('covers every execution state', () => {
    for (const state of EXECUTION_STATES) {
      expect(EXECUTION_STATE_LABELS[state].length).toBeGreaterThan(0);
    }
  });

  it('covers every outcome', () => {
    for (const outcome of COMMON_OUTCOMES) {
      expect(OUTCOME_LABELS[outcome].length).toBeGreaterThan(0);
    }
  });

  it('covers every check kind', () => {
    for (const kind of CHECK_KINDS) {
      expect(CHECK_LABELS[kind].length).toBeGreaterThan(0);
      expect(CHECK_DESCRIPTIONS[kind].length).toBeGreaterThan(0);
    }
  });

  it('covers every credential state family', () => {
    for (const state of MANIFEST_PRESENCE_STATES) {
      expect(MANIFEST_LABELS[state].length).toBeGreaterThan(0);
    }

    for (const state of VALIDATION_STATES) {
      expect(VALIDATION_LABELS[state].length).toBeGreaterThan(0);
    }

    for (const state of SIGNER_TRUST_STATES) {
      expect(TRUST_LABELS[state].length).toBeGreaterThan(0);
    }

    for (const state of REVOCATION_STATES) {
      expect(REVOCATION_LABELS[state].length).toBeGreaterThan(0);
    }
  });

  it('renders distinct labels for distinct states', () => {
    const execution = Object.values(EXECUTION_STATE_LABELS);
    expect(new Set(execution).size).toBe(execution.length);

    const outcomes = Object.values(OUTCOME_LABELS);
    expect(new Set(outcomes).size).toBe(outcomes.length);
  });

  it('keeps the UI stage order aligned with the pipeline order', () => {
    expect(STAGE_ORDER).toEqual(PIPELINE_STAGES);
  });

  it('avoids verdict language in every label and description', () => {
    const text = [
      ...Object.values(CHECK_LABELS),
      ...Object.values(CHECK_DESCRIPTIONS),
      ...Object.values(OUTCOME_LABELS),
      ...Object.values(TRUST_LABELS),
      ...Object.values(VALIDATION_LABELS),
    ].join(' ');

    expect(text).not.toMatch(BANNED_VERDICT_LANGUAGE);
  });
});

describe('display formatting', () => {
  it('formats byte sizes without inventing precision', () => {
    expect(formatByteSize(0)).toBe('0 B');
    expect(formatByteSize(1023)).toBe('1023 B');
    expect(formatByteSize(1024)).toBe('1.0 KiB');
    expect(formatByteSize(1536)).toBe('1.5 KiB');
    expect(formatByteSize(10 * 1024)).toBe('10 KiB');
    expect(formatByteSize(1024 * 1024)).toBe('1.00 MiB');
    expect(formatByteSize(-1)).toBe('Unknown size');
    expect(formatByteSize(1.5)).toBe('Unknown size');
  });

  it('formats dimensions and rejects impossible values', () => {
    expect(formatDimensions(64, 48)).toBe('64 × 48 px (0.0 MP)');
    expect(formatDimensions(1920, 1080)).toBe('1920 × 1080 px (2.1 MP)');
    expect(formatDimensions(0, 10)).toBe('Unknown dimensions');
    expect(formatDimensions(Number.NaN, 10)).toBe('Unknown dimensions');
  });

  it('renders timestamps in UTC with an explicit zone', () => {
    expect(formatUtcInstant('2026-10-27T18:30:00.000Z')).toBe('2026-10-27 18:30:00 UTC');
    expect(formatUtcInstant('not-a-time')).toBe('Unknown time');
  });
});
