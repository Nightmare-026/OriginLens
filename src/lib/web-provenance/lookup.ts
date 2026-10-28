import { isSha256Hex } from '@/lib/fingerprint/sha256';

/**
 * Reverse-Image / Web Provenance Lookup (Feature 4).
 *
 * Provides web provenance discovery across public indexes, web archives,
 * and external reverse search engines with strict zero-knowledge privacy:
 *
 * Privacy Invariants:
 * - 100% zero-knowledge client-side by default.
 * - Dispatched ONLY upon explicit, deliberate user consent.
 * - Transmits ONLY the 64-character SHA-256 digest, never image bytes.
 */

export type WebProvenanceOccurrence = Readonly<{
  sourceName: string;
  sourceUrl: string;
  earliestSeenUtc: string | null;
  similarity: string;
  notes?: string;
}>;

export type WebProvenanceSearchLinks = Readonly<{
  googleLens: string;
  tineye: string;
  bingVisual: string;
  waybackMachine: string;
}>;

export type WebProvenanceResult = Readonly<{
  status: 'completed' | 'not_found' | 'error';
  sha256: string;
  occurrences: readonly WebProvenanceOccurrence[];
  searchLinks: WebProvenanceSearchLinks;
  searchedAtUtc: string;
  disclosures: readonly string[];
}>;

export const WEB_PROVENANCE_DISCLOSURES = [
  'Web provenance queries check indexed public archives and reverse-search registries. Absence of online matches does not establish an image is private or newly captured.',
  'Only the 64-character SHA-256 fingerprint is dispatched during hash lookups; zero image bytes or metadata are sent.',
  'Online occurrences can represent copies, re-encodings, or modified versions and do not prove original authorship or scene truth.',
] as const;

export function generateWebSearchLinks(sha256: string): WebProvenanceSearchLinks {
  const encodedHash = encodeURIComponent(sha256);

  return {
    googleLens: `https://lens.google.com/upload?ep=originlens&query=${encodedHash}`,
    tineye: `https://tineye.com/search/?hash=${encodedHash}`,
    bingVisual: `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=hash:${encodedHash}`,
    waybackMachine: `https://web.archive.org/web/*/${encodedHash}`,
  };
}

export async function queryWebProvenance(sha256: string): Promise<WebProvenanceResult> {
  const searchedAtUtc = new Date().toISOString();
  const searchLinks = generateWebSearchLinks(sha256);

  if (!isSha256Hex(sha256)) {
    return {
      status: 'error',
      sha256,
      occurrences: [],
      searchLinks,
      searchedAtUtc,
      disclosures: [...WEB_PROVENANCE_DISCLOSURES],
    };
  }

  try {
    const response = await fetch('/api/web-provenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256 }),
    });

    if (!response.ok) {
      return {
        status: 'error',
        sha256,
        occurrences: [],
        searchLinks,
        searchedAtUtc,
        disclosures: [...WEB_PROVENANCE_DISCLOSURES],
      };
    }

    const data = await response.json();

    return {
      status: data.status === 'completed' ? 'completed' : 'not_found',
      sha256,
      occurrences: Array.isArray(data.occurrences) ? data.occurrences : [],
      searchLinks,
      searchedAtUtc,
      disclosures: [...WEB_PROVENANCE_DISCLOSURES],
    };
  } catch {
    return {
      status: 'error',
      sha256,
      occurrences: [],
      searchLinks,
      searchedAtUtc,
      disclosures: [...WEB_PROVENANCE_DISCLOSURES],
    };
  }
}
