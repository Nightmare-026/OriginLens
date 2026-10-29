import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { generateSocialCardBlob, generateComparisonCardBlob, downloadSocialCard } from '@/lib/report/card';
import { ActionLineageGraph } from '@/components/inspector/ledger';
import { runFileAnalysis } from '@/lib/pipeline/analyze';
import { buildComparison } from '@/lib/compare/build';
import { createHarness, jpegFile } from './helpers/pipeline-harness';

describe('Social Card Export and ActionLineageGraph', () => {
  it('exports generateSocialCardBlob and generateComparisonCardBlob functions', () => {
    expect(typeof generateSocialCardBlob).toBe('function');
    expect(typeof generateComparisonCardBlob).toBe('function');
    expect(typeof downloadSocialCard).toBe('function');
  });

  describe('ActionLineageGraph Component', () => {
    it('renders null when actions and ingredients are empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionLineageGraph, { actions: [], ingredients: [] }),
      );
      expect(html).toBe('');
    });

    it('renders ingredient node and terminal node when ingredients are present', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionLineageGraph, {
          actions: [],
          ingredients: [
            {
              sourceEvidenceId: 'ev_000001',
              title: 'Original Raw Photo.cr3',
              relationship: 'parentOf',
            },
          ],
        }),
      );
      expect(html).toContain('c2pa-lineage-graph');
      expect(html).toContain('Ingredient');
      expect(html).toContain('parentOf');
      expect(html).toContain('Original Raw Photo.cr3');
      expect(html).toContain('evidence ev_000001');
      expect(html).toContain('lineage-connector');
      expect(html).toContain('Inspected');
      expect(html).not.toContain('Audited');
      expect(html).toContain('exact bytes supplied to this check');
    });

    it('renders sequential action nodes with step numbers, categories, and tool markers', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionLineageGraph, {
          actions: [
            { sourceEvidenceId: 'ev_000010', actionCode: 'c2pa.created' },
            { sourceEvidenceId: 'ev_000011', actionCode: 'c2pa.cropped' },
            { sourceEvidenceId: 'ev_000012', actionCode: 'c2pa.resized' },
            { sourceEvidenceId: 'ev_000013', actionCode: 'c2pa.filtered' },
            { sourceEvidenceId: 'ev_000014', actionCode: 'c2pa.placed' },
            { sourceEvidenceId: 'ev_000015', actionCode: 'c2pa.edited' },
          ],
          ingredients: [],
        }),
      );
      expect(html).toContain('Recorded 1');
      expect(html).toContain('Order 1');
      expect(html).toContain('c2pa.created');
      expect(html).toContain('Geometry Crop');
      expect(html).toContain('Resample Geometry');
      expect(html).toContain('Filter Process');
      expect(html).toContain('Composite Layer');
      expect(html).toContain('Image Modification');
      expect(html).toContain('evidence ev_000010');
      expect(html).toContain('Inspected');
    });
  });

  describe('Canvas Rendering & Fallbacks', () => {
    it('handles missing canvas context in Node environment safely without unhandled exception', async () => {
      const harness = createHarness();
      const result = await runFileAnalysis(
        { file: jpegFile(), signal: harness.controller.signal },
        harness.deps,
      );
      if (result.status !== 'ok') throw new Error('Expected ok');

      await expect(generateSocialCardBlob(result.analysis)).rejects.toThrow(
        /Canvas 2D context is unavailable|document is not defined/,
      );

      const harness2 = createHarness({ startId: 100 });
      const result2 = await runFileAnalysis(
        { file: jpegFile(), signal: harness2.controller.signal },
        harness2.deps,
      );
      if (result2.status !== 'ok') throw new Error('Expected ok');

      let ids = 500;
      const compOutput = buildComparison({
        first: result.analysis,
        second: result2.analysis,
        preview: { status: 'skipped', reason: 'identical_fingerprint' },
        createId: (prefix) => `${prefix}_${String((ids += 1)).padStart(6, '0')}`,
        now: () => new Date('2026-10-27T12:30:00.000Z'),
      });
      if (compOutput.status !== 'ok') {
        throw new Error(`Expected compOutput ok, got ${compOutput.error.code}: ${compOutput.error.message}`);
      }

      await expect(
        generateComparisonCardBlob(result.analysis, result2.analysis, compOutput.comparison),
      ).rejects.toThrow(/Canvas 2D context is unavailable|document is not defined/);
    });

    it('generates comparison and single social card Blobs with mocked canvas context', async () => {
      const harness = createHarness();
      const result = await runFileAnalysis(
        { file: jpegFile(), signal: harness.controller.signal },
        harness.deps,
      );
      if (result.status !== 'ok') throw new Error('Expected ok');

      const harness2 = createHarness({
        startId: 100,
        sha256: async () => 'bb'.repeat(32),
      });
      const result2 = await runFileAnalysis(
        { file: jpegFile(), signal: harness2.controller.signal },
        harness2.deps,
      );
      if (result2.status !== 'ok') throw new Error('Expected ok');

      let ids = 500;
      const compOutput = buildComparison({
        first: result.analysis,
        second: result2.analysis,
        preview: {
          status: 'measured',
          targetWidth: 64,
          targetHeight: 48,
          metric: {
            pixelCount: 64 * 48,
            meanAbsoluteChannelError: 12.4,
            changedPixelCount: 15,
            changedPixelShare: 15 / (64 * 48),
          },
        },
        createId: (prefix) => `${prefix}_${String((ids += 1)).padStart(6, '0')}`,
        now: () => new Date('2026-10-27T12:30:00.000Z'),
      });
      if (compOutput.status !== 'ok') {
        throw new Error(`Expected compOutput ok, got ${compOutput.error.code}: ${compOutput.error.message}`);
      }

      // Create a mock canvas context
      const mockBlob = new Blob(['mock-png'], { type: 'image/png' });
      const mockGradient = { addColorStop: vi.fn() };
      const mockCtx = {
        createLinearGradient: vi.fn(() => mockGradient),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'start',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        roundRect: vi.fn(),
        rect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        width: 1200,
        height: 630,
        getContext: vi.fn((type: string) => (type === '2d' ? mockCtx : null)),
        toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
          cb(mockBlob);
        }),
      };

      const originalDocument = globalThis.document;
      try {
        globalThis.document = {
          createElement: vi.fn((tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {};
          }),
        } as unknown as Document;

        // Test single social card blob generation
        const singleBlob = await generateSocialCardBlob(result.analysis);
        expect(singleBlob).toBe(mockBlob);
        expect(mockCtx.fillText).toHaveBeenCalled();

        // Test comparison social card blob generation
        const compBlob = await generateComparisonCardBlob(
          result.analysis,
          result2.analysis,
          compOutput.comparison,
          null,
          null,
        );
        expect(compBlob).toBe(mockBlob);
        expect(mockCtx.fillText).toHaveBeenCalledWith(
          expect.stringContaining('Provenance Delta Comparison Card'),
          expect.any(Number),
          expect.any(Number),
        );
      } finally {
        globalThis.document = originalDocument;
      }
    });

    it('downloadSocialCard sanitizes filenames and triggers link click', () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const appendSpy = vi.fn();
      const clickSpy = vi.fn();
      const removeSpy = vi.fn();
      let createdHref = '';
      let downloadedName = '';

      const mockAnchor = {
        set href(val: string) {
          createdHref = val;
        },
        get href() {
          return createdHref;
        },
        set download(val: string) {
          downloadedName = val;
        },
        get download() {
          return downloadedName;
        },
        rel: '',
        click: clickSpy,
        remove: removeSpy,
      };

      const originalDocument = globalThis.document;
      const originalURL = globalThis.URL;

      try {
        globalThis.document = {
          createElement: vi.fn((tag: string) => {
            if (tag === 'a') return mockAnchor;
            return {};
          }),
          body: {
            appendChild: appendSpy,
          },
        } as unknown as Document;

        globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        globalThis.URL.revokeObjectURL = vi.fn();

        downloadSocialCard(mockBlob, 'unsafe/file:name?*with spaces!');

        expect(appendSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
        expect(downloadedName).toMatch(/^[a-zA-Z0-9_-]+_provenance_card\.png$/);
        expect(downloadedName).not.toContain('/');
        expect(downloadedName).not.toContain(':');
        expect(downloadedName).not.toContain('?');
      } finally {
        globalThis.document = originalDocument;
        globalThis.URL = originalURL;
      }
    });
  });
});
