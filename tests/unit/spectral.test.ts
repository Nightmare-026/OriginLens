import { describe, expect, it } from 'vitest';
import {
  computeDct2D,
  inspectWatermarkMarkers,
  analyzeLuminanceSpectrum,
  sampleLuminanceGridFromBytes,
} from '@/lib/watermark/spectral';

describe('Watermark & Frequency Domain Spectral Analysis (Feature 3)', () => {
  it('computes 2D DCT with expected mathematical properties', () => {
    const N = 8;
    const matrix = new Float64Array(N * N);

    // Flat DC plane
    for (let i = 0; i < N * N; i++) {
      matrix[i] = 1.0;
    }

    const dct = computeDct2D(matrix, N);

    // DC coefficient (0, 0) should hold all energy; AC coefficients should be 0
    expect(dct[0]).toBeCloseTo(N, 4);

    let acEnergy = 0;
    for (let i = 1; i < N * N; i++) {
      acEnergy += (dct[i] ?? 0) ** 2;
    }

    expect(acEnergy).toBeCloseTo(0, 4);
  });

  it('detects high-frequency periodic grid patterns', () => {
    const N = 16;
    const matrix = new Float64Array(N * N);

    // Checkerboard / periodic upsampling pattern (high frequency alternating)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        matrix[y * N + x] = (x % 2 === 0 && y % 2 === 0) ? 1.0 : 0.0;
      }
    }

    const result = analyzeLuminanceSpectrum(matrix, N);

    expect(result.highFrequencyRatio).toBeGreaterThan(0.3);
    expect(['periodic_grid_detected', 'elevated_high_frequency']).toContain(result.spectralVerdict);
    expect(result.disclosures.length).toBeGreaterThanOrEqual(3);
  });

  it('detects natural falloff on smooth gradients', () => {
    const N = 16;
    const matrix = new Float64Array(N * N);

    // Smooth gradient (1/f² decay)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        matrix[y * N + x] = (x + y) / (2 * N);
      }
    }

    const result = analyzeLuminanceSpectrum(matrix, N);

    expect(result.spectralVerdict).toBe('natural_falloff');
    expect(result.energyDistribution.lowFreqShare).toBeGreaterThan(result.energyDistribution.highFreqShare);
  });

  it('scans and detects Google DeepMind SynthID and Adobe watermark markers', () => {
    const textWithSynthId = 'Software: Google DeepMind SynthID v1.2 model=imagen-3';
    const synthResult = inspectWatermarkMarkers(textWithSynthId);
    expect(synthResult.hasSynthId).toBe(true);
    expect(synthResult.markers).toContain('Google DeepMind SynthID marker');

    const textWithAdobe = 'c2pa.watermark embed=true issuer=Adobe';
    const adobeResult = inspectWatermarkMarkers(textWithAdobe);
    expect(adobeResult.markers).toContain('Adobe Content Credentials Watermark marker');

    const textWithTruepic = 'Metadata includes truepic-watermark hardware payload';
    const truepicResult = inspectWatermarkMarkers(textWithTruepic);
    expect(truepicResult.markers).toContain('Truepic Invisible Provenance Watermark marker');

    const cleanText = 'Captured with Canon EOS R5 aperture=f/2.8';
    const cleanResult = inspectWatermarkMarkers(cleanText);
    expect(cleanResult.hasSynthId).toBe(false);
    expect(cleanResult.markers).toHaveLength(0);
  });

  it('samples luminance grid from raw bytes safely', () => {
    const sampleBytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const grid = sampleLuminanceGridFromBytes(sampleBytes.buffer, 4);

    expect(grid.length).toBe(16);
    expect(grid.every((val) => val >= 0 && val <= 1)).toBe(true);
  });

  it('handles empty matrix honestly with inconclusive verdict and metadata markers preserved', () => {
    const empty = new Float64Array(0);
    const result = analyzeLuminanceSpectrum(empty, 16, 'Includes Google DeepMind SynthID marker');

    expect(result.spectralVerdict).toBe('inconclusive');
    expect(result.verdictLabel).toContain('Inconclusive');
    expect(result.hasSynthIdMarker).toBe(true);
    expect(result.energyDistribution.highFreqShare).toBe(0);
  });
});
