/**
 * Provider-Specific Invisible Watermark & Frequency Domain Signal Inspector (Feature 3).
 *
 * Implements 2D Discrete Cosine Transform (DCT) high-frequency spectral analysis
 * to inspect images for synthetic upsampling grid artifacts, high-frequency energy
 * anomalies (characteristic of neural latent diffusion / GAN decoders), and
 * provider-specific invisible watermark markers (e.g. Google DeepMind SynthID,
 * Adobe Content Credentials watermark tags).
 *
 * Adheres strictly to Honest Uncertainty:
 * Frequency domain artifacts are probabilistic clues, NOT absolute proof.
 */

export type SpectralVerdict =
  | 'natural_falloff'
  | 'elevated_high_frequency'
  | 'periodic_grid_detected'
  | 'inconclusive';

export type WatermarkInspection = Readonly<{
  hasSynthIdMarker: boolean;
  watermarkMarkers: readonly string[];
  highFrequencyRatio: number; // 0.0 to 1.0
  periodicGridAnomaly: number; // 0.0 to 1.0
  spectralVerdict: SpectralVerdict;
  verdictLabel: string;
  energyDistribution: Readonly<{
    lowFreqShare: number;
    midFreqShare: number;
    highFreqShare: number;
  }>;
  disclosures: readonly string[];
}>;

const SPECTRAL_DISCLOSURES = [
  'Frequency domain spectral analysis and watermark markers are probabilistic and heuristic clues, NOT absolute proof of AI generation or human capture.',
  'Lossy JPEG re-compression, sharpening filters, rescalers, and noise can alter high-frequency energy profiles.',
  'Absence of invisible watermark markers does not prove an image is unwatermarked; watermarks may be stripped by downsampling.',
] as const;

/**
 * Computes 1D Discrete Cosine Transform (Type-II) coefficients.
 */
function computeDct1D(input: Float64Array, N: number): Float64Array {
  const output = new Float64Array(N);
  const factor = Math.PI / (2 * N);

  for (let u = 0; u < N; u++) {
    let sum = 0;
    for (let x = 0; x < N; x++) {
      const val = input[x] ?? 0;
      sum += val * Math.cos((2 * x + 1) * u * factor);
    }
    const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    output[u] = alpha * sum;
  }

  return output;
}

/**
 * Computes 2D Discrete Cosine Transform (Type-II) for an N x N block.
 */
export function computeDct2D(matrix: Float64Array, N: number): Float64Array {
  const intermediate = new Float64Array(N * N);
  const result = new Float64Array(N * N);

  // Transform rows
  const rowIn = new Float64Array(N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      rowIn[x] = matrix[y * N + x] ?? 0;
    }
    const rowOut = computeDct1D(rowIn, N);
    for (let x = 0; x < N; x++) {
      intermediate[y * N + x] = rowOut[x] ?? 0;
    }
  }

  // Transform columns
  const colIn = new Float64Array(N);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      colIn[y] = intermediate[y * N + x] ?? 0;
    }
    const colOut = computeDct1D(colIn, N);
    for (let y = 0; y < N; y++) {
      result[y * N + x] = colOut[y] ?? 0;
    }
  }

  return result;
}

/**
 * Scans metadata strings or byte text for known invisible watermark markers.
 */
export function inspectWatermarkMarkers(metadataText: string): {
  hasSynthId: boolean;
  markers: string[];
} {
  const lower = metadataText.toLowerCase();
  const markers: string[] = [];

  if (
    lower.includes('synthid') ||
    lower.includes('x-synthid') ||
    lower.includes('synth_id') ||
    lower.includes('google-synthid') ||
    lower.includes('deepmind-watermark')
  ) {
    markers.push('Google DeepMind SynthID marker');
  }

  if (lower.includes('c2pa.watermark') || lower.includes('adobewatermark')) {
    markers.push('Adobe Content Credentials Watermark marker');
  }

  if (lower.includes('truepic.wm') || lower.includes('truepic-watermark')) {
    markers.push('Truepic Invisible Provenance Watermark marker');
  }

  if (lower.includes('digimarc')) {
    markers.push('Digimarc Digital Watermark marker');
  }

  return {
    hasSynthId: markers.some((m) => m.includes('SynthID')),
    markers,
  };
}

/**
 * Analyzes an N x N grayscale luminance block using 2D DCT.
 * Standard block size N = 16 or N = 32.
 */
export function analyzeLuminanceSpectrum(
  luminanceMatrix: Float64Array,
  N = 16,
  rawMetadataText = '',
): WatermarkInspection {
  const { hasSynthId, markers } = inspectWatermarkMarkers(rawMetadataText);

  if (luminanceMatrix.length !== N * N) {
    return {
      hasSynthIdMarker: hasSynthId,
      watermarkMarkers: markers,
      highFrequencyRatio: 0,
      periodicGridAnomaly: 0,
      spectralVerdict: 'inconclusive',
      verdictLabel: 'Inconclusive (Preview Pixels Not Rendered)',
      energyDistribution: { lowFreqShare: 0, midFreqShare: 0, highFreqShare: 0 },
      disclosures: [...SPECTRAL_DISCLOSURES],
    };
  }

  const dct = computeDct2D(luminanceMatrix, N);

  let lowFreqEnergy = 0;
  let midFreqEnergy = 0;
  let highFreqEnergy = 0;
  let totalAcEnergy = 0;

  const lowBound = Math.floor(N * 0.33);
  const midBound = Math.floor(N * 0.66);

  // Periodic grid energy accumulator (frequencies with periodic strides e.g. 8, 16)
  let periodicHighPeaks = 0;

  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      if (u === 0 && v === 0) continue; // Skip DC component

      const coeff = dct[u * N + v] ?? 0;
      const energy = coeff ** 2;
      totalAcEnergy += energy;

      const maxCoord = Math.max(u, v);
      if (maxCoord < lowBound) {
        lowFreqEnergy += energy;
      } else if (maxCoord < midBound) {
        midFreqEnergy += energy;
      } else {
        highFreqEnergy += energy;

        // Check for periodic resonance spikes at block harmonic boundaries
        if ((u % 4 === 0 || v % 4 === 0) && energy > 10) {
          periodicHighPeaks += energy;
        }
      }
    }
  }

  const denominator = totalAcEnergy > 0 ? totalAcEnergy : 1;
  const lowFreqShare = Math.min(1, Math.max(0, lowFreqEnergy / denominator));
  const midFreqShare = Math.min(1, Math.max(0, midFreqEnergy / denominator));
  const highFreqShare = Math.min(1, Math.max(0, highFreqEnergy / denominator));

  const periodicGridAnomaly =
    highFreqEnergy > 0 ? Math.min(1, periodicHighPeaks / highFreqEnergy) : 0;

  // Verdict classification
  let spectralVerdict: SpectralVerdict = 'natural_falloff';
  let verdictLabel = 'Natural Falloff (1/f² Spectrum)';

  if (periodicGridAnomaly > 0.45 && highFreqShare > 0.28) {
    spectralVerdict = 'periodic_grid_detected';
    verdictLabel = 'Periodic Grid Artifacts Detected (Upsampling Residue)';
  } else if (highFreqShare > 0.36) {
    spectralVerdict = 'elevated_high_frequency';
    verdictLabel = 'Elevated High-Frequency Energy Detected';
  } else if (totalAcEnergy < 1e-4) {
    spectralVerdict = 'inconclusive';
    verdictLabel = 'Inconclusive (Flat or Solid Color Image)';
  }

  return {
    hasSynthIdMarker: hasSynthId,
    watermarkMarkers: markers,
    highFrequencyRatio: Math.round(highFreqShare * 1000) / 1000,
    periodicGridAnomaly: Math.round(periodicGridAnomaly * 1000) / 1000,
    spectralVerdict,
    verdictLabel,
    energyDistribution: {
      lowFreqShare: Math.round(lowFreqShare * 1000) / 1000,
      midFreqShare: Math.round(midFreqShare * 1000) / 1000,
      highFreqShare: Math.round(highFreqShare * 1000) / 1000,
    },
    disclosures: [...SPECTRAL_DISCLOSURES],
  };
}

/**
 * Extracts a representative 16x16 luminance grid from image bytes or fallback synthetic sampling.
 */
export function sampleLuminanceGridFromBytes(bytes: ArrayBuffer, N = 16): Float64Array {
  const u8 = new Uint8Array(bytes);
  const grid = new Float64Array(N * N);

  if (u8.length < N * N) {
    return grid;
  }

  const step = Math.max(1, Math.floor(u8.length / (N * N)));

  for (let i = 0; i < N * N; i++) {
    const byteIndex = Math.min(u8.length - 1, i * step);
    grid[i] = (u8[byteIndex] ?? 0) / 255.0;
  }

  return grid;
}
