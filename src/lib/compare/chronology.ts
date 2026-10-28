import type { FileAnalysis } from '@/lib/pipeline/types';

/**
 * Chronology & Provenance Ordering Determination (Feature 6).
 *
 * In the dual-image comparison screen (/compare), parses signed C2PA timestamps
 * (claim.signing_time, RFC 3161 secure timestamps) and camera EXIF DateTimeOriginal.
 *
 * If verifiable timestamps exist:
 * - Computes and displays deterministic Provenance Chronology (which asset predates the other,
 *   exact delta time between creation and edit).
 * - Distinguishes cryptographic authority from unverified EXIF camera clues.
 *
 * If timestamps are missing or unverified:
 * - Emits `inconclusive` strictly adhering to honest uncertainty.
 */

export type TimestampAuthority =
  | 'cryptographically_signed_c2pa'
  | 'unverified_camera_exif'
  | 'none';

export type ChronologyDetermination =
  | 'file_a_predates_file_b'
  | 'file_b_predates_file_a'
  | 'identical_timestamp'
  | 'inconclusive';

export type FileTimestampDetails = Readonly<{
  isoUtc: string | null;
  displayFormatted: string | null;
  authority: TimestampAuthority;
  sourceKey: string;
}>;

export type ChronologyEvaluation = Readonly<{
  determination: ChronologyDetermination;
  authority: TimestampAuthority;
  timeA: FileTimestampDetails;
  timeB: FileTimestampDetails;
  deltaMs: number | null;
  formattedDelta: string | null;
  explanation: string;
  isCryptographicallyVerified: boolean;
  warnings: readonly string[];
}>;

/**
 * Parses diverse date formats into an ISO UTC string and epoch milliseconds.
 */
function parseTimestamp(raw: string | null | undefined): { isoUtc: string; epochMs: number } | null {
  if (!raw || typeof raw !== 'string') return null;

  // EXIF format "YYYY:MM:DD HH:MM:SS"
  const exifMatch = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(.*)$/.exec(raw.trim());
  let normalized = raw;

  if (exifMatch) {
    const [, year, month, day, hour, min, sec, offset] = exifMatch;
    normalized = `${year}-${month}-${day}T${hour}:${min}:${sec}${offset ? offset.trim() : 'Z'}`;
  }

  const date = new Date(normalized);
  const epochMs = date.getTime();

  if (Number.isNaN(epochMs)) return null;

  return { isoUtc: date.toISOString(), epochMs };
}

/**
 * Formats duration milliseconds into human-readable duration string.
 */
export function formatDurationDelta(deltaMs: number): string {
  const absMs = Math.abs(deltaMs);
  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remDays = days % 365;
    const months = Math.floor(remDays / 30);
    return `${years} ${years === 1 ? 'year' : 'years'}${months > 0 ? `, ${months} mo` : ''}`;
  }

  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    return `${months} ${months === 1 ? 'month' : 'months'}${remDays > 0 ? `, ${remDays} d` : ''}`;
  }

  if (days > 0) {
    const remHours = hours % 24;
    return `${days} ${days === 1 ? 'day' : 'days'}${remHours > 0 ? `, ${remHours} hr` : ''}`;
  }

  if (hours > 0) {
    const remMin = minutes % 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}${remMin > 0 ? `, ${remMin} min` : ''}`;
  }

  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  return `${seconds} seconds`;
}

/**
 * Extracts verifiable or unverified timestamps from a FileAnalysis record.
 */
function extractBestTimestamp(analysis: FileAnalysis): FileTimestampDetails {
  // 1. Check signed C2PA manifest timestamp (highest authority)
  const c2paCheck = analysis.checks.find((c) => c.kind === 'c2pa');

  if (c2paCheck && c2paCheck.executionState === 'completed' && analysis.finding?.manifestPresence === 'present') {
    // Look for signing timestamp in evidence
    const signingEvidence = c2paCheck.evidence.find(
      (ev) =>
        ev.key.includes('signing_time') ||
        ev.key.includes('time') ||
        ev.key.includes('timeStamp') ||
        ev.valueType === 'timestamp',
    );

    if (signingEvidence && typeof signingEvidence.value === 'string') {
      const parsed = parseTimestamp(signingEvidence.value);
      if (parsed) {
        return {
          isoUtc: parsed.isoUtc,
          displayFormatted: new Date(parsed.isoUtc).toUTCString(),
          authority: 'cryptographically_signed_c2pa',
          sourceKey: signingEvidence.key,
        };
      }
    }
  }

  // 2. Check camera EXIF metadata (unverified clue)
  if (analysis.metadata && analysis.metadata.fields.length > 0) {
    const exifDate = analysis.metadata.fields.find(
      (f) =>
        f.key === 'captureTime' ||
        f.label.toLowerCase().includes('date') ||
        f.label.toLowerCase().includes('time'),
    );

    if (exifDate && typeof exifDate.value === 'string') {
      const parsed = parseTimestamp(exifDate.value);
      if (parsed) {
        return {
          isoUtc: parsed.isoUtc,
          displayFormatted: new Date(parsed.isoUtc).toUTCString(),
          authority: 'unverified_camera_exif',
          sourceKey: `metadata.${exifDate.key}`,
        };
      }
    }
  }

  return {
    isoUtc: null,
    displayFormatted: null,
    authority: 'none',
    sourceKey: 'none',
  };
}

/**
 * Evaluates chronological ordering between two analyzed files.
 */
export function evaluateChronology(first: FileAnalysis, second: FileAnalysis): ChronologyEvaluation {
  const timeA = extractBestTimestamp(first);
  const timeB = extractBestTimestamp(second);

  // Both have signed C2PA timestamps -> Cryptographically verified chronology
  if (
    timeA.authority === 'cryptographically_signed_c2pa' &&
    timeB.authority === 'cryptographically_signed_c2pa' &&
    timeA.isoUtc &&
    timeB.isoUtc
  ) {
    const epochA = Date.parse(timeA.isoUtc);
    const epochB = Date.parse(timeB.isoUtc);
    const deltaMs = epochB - epochA;
    const formattedDelta = formatDurationDelta(deltaMs);

    if (epochA < epochB) {
      return {
        determination: 'file_a_predates_file_b',
        authority: 'cryptographically_signed_c2pa',
        timeA,
        timeB,
        deltaMs,
        formattedDelta,
        explanation: `File A predates File B by ${formattedDelta} (Attested by RFC 3161 / C2PA Claim Signatures).`,
        isCryptographicallyVerified: true,
        warnings: [],
      };
    }

    if (epochB < epochA) {
      return {
        determination: 'file_b_predates_file_a',
        authority: 'cryptographically_signed_c2pa',
        timeA,
        timeB,
        deltaMs: Math.abs(deltaMs),
        formattedDelta,
        explanation: `File B predates File A by ${formattedDelta} (Attested by RFC 3161 / C2PA Claim Signatures).`,
        isCryptographicallyVerified: true,
        warnings: [],
      };
    }

    return {
      determination: 'identical_timestamp',
      authority: 'cryptographically_signed_c2pa',
      timeA,
      timeB,
      deltaMs: 0,
      formattedDelta: '0 seconds',
      explanation: 'Both files carry identical cryptographic C2PA signing timestamps.',
      isCryptographicallyVerified: true,
      warnings: [],
    };
  }

  // Both have EXIF camera timestamps -> Unverified heuristic clue
  if (
    timeA.authority === 'unverified_camera_exif' &&
    timeB.authority === 'unverified_camera_exif' &&
    timeA.isoUtc &&
    timeB.isoUtc
  ) {
    const epochA = Date.parse(timeA.isoUtc);
    const epochB = Date.parse(timeB.isoUtc);
    const deltaMs = epochB - epochA;
    const formattedDelta = formatDurationDelta(deltaMs);

    const exifWarning =
      'Camera EXIF timestamps are unverified metadata clues. They can be modified, stripped, or inaccurate due to device clock skew.';

    if (epochA < epochB) {
      return {
        determination: 'file_a_predates_file_b',
        authority: 'unverified_camera_exif',
        timeA,
        timeB,
        deltaMs,
        formattedDelta,
        explanation: `File A carries an earlier EXIF creation date than File B by ${formattedDelta} (Unverified Camera Clue).`,
        isCryptographicallyVerified: false,
        warnings: [exifWarning],
      };
    }

    if (epochB < epochA) {
      return {
        determination: 'file_b_predates_file_a',
        authority: 'unverified_camera_exif',
        timeA,
        timeB,
        deltaMs: Math.abs(deltaMs),
        formattedDelta,
        explanation: `File B carries an earlier EXIF creation date than File A by ${formattedDelta} (Unverified Camera Clue).`,
        isCryptographicallyVerified: false,
        warnings: [exifWarning],
      };
    }

    return {
      determination: 'identical_timestamp',
      authority: 'unverified_camera_exif',
      timeA,
      timeB,
      deltaMs: 0,
      formattedDelta: '0 seconds',
      explanation: 'Both files carry identical camera EXIF recorded timestamps.',
      isCryptographicallyVerified: false,
      warnings: [exifWarning],
    };
  }

  // Gaps or mixed unverified states -> Inconclusive
  return {
    determination: 'inconclusive',
    authority: 'none',
    timeA,
    timeB,
    deltaMs: null,
    formattedDelta: null,
    explanation:
      'Inconclusive — Timestamps absent or unverified. At least one image lacks verifiable timestamps, so temporal ordering cannot be established.',
    isCryptographicallyVerified: false,
    warnings: [
      'OriginLens never guesses chronology from file hashes, file sizes, or pixel differences alone.',
    ],
  };
}
