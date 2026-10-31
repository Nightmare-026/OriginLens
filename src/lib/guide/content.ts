/**
 * Versioned, reviewed help content for the OriginLens Guide.
 *
 * The model is grounded only in this file. It never browses the web, never sees
 * an uploaded image, and never has authority over a check result. When the
 * provider is unavailable, the same content is served as a deterministic
 * reference answer so the guide never goes dark.
 */

export const GUIDE_CONTENT_VERSION = '1.0.0';

export const GUIDE_TOPIC_IDS = [
  'overview',
  'inspect',
  'compare',
  'evidence-ledger',
  'c2pa',
  'metadata',
  'privacy',
  'report',
  'model-explanation',
  'limitations',
  'formats',
  'troubleshooting',
  'navigation',
] as const;

export type GuideTopicId = (typeof GUIDE_TOPIC_IDS)[number];

export interface GuideTopic {
  readonly id: GuideTopicId;
  readonly title: string;
  readonly answer: string;
  readonly href: string;
  readonly keywords: readonly string[];
}

export const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'overview',
    title: 'What OriginLens does',
    answer:
      'OriginLens is an evidence-first media provenance explorer. It reads supported embedded C2PA Content Credentials and a small allowlist of EXIF metadata from a JPEG or PNG in your browser, records each check in an Evidence Ledger, and can compare two independent files. It does not decide whether an image is real, fake, AI-generated, or trustworthy. Missing, unsupported, or failed checks are shown as such instead of being turned into a verdict.',
    href: '/about',
    keywords: ['originlens', 'overview', 'about', 'purpose', 'product'],
  },
  {
    id: 'inspect',
    title: 'Inspecting one image',
    answer:
      'Open Inspect Image, choose one JPEG or PNG, and OriginLens runs preflight, a SHA-256 fingerprint, the metadata allowlist, and the pinned C2PA checker. Progress reflects real stage states, not invented percentages. The Evidence Ledger lists each check, its execution state, outcome, warnings, limitations, and evidence IDs. Use Clear or Inspect another to discard the session from memory.',
    href: '/inspect',
    keywords: ['inspect', 'single', 'upload', 'one image', 'analyze', 'analysis', 'ledger'],
  },
  {
    id: 'compare',
    title: 'Comparing two images',
    answer:
      'Open Compare Images, add File A and File B, and start. Each file is analyzed independently. The Provenance Delta compares fingerprints, byte sizes, formats, dimensions, selected metadata, credential findings, and a bounded preview pixel metric. It does not decide which file is the original or why they differ. Any original/edited labels are user assertions, not system findings.',
    href: '/compare',
    keywords: ['compare', 'two', 'delta', 'difference', 'original', 'edited', 'a and b'],
  },
  {
    id: 'evidence-ledger',
    title: 'Reading the Evidence Ledger',
    answer:
      'Execution state says whether a check ran: queued, running, completed, skipped, cancelled, failed, or timed_out. Outcome is the result of that check, such as present, not_present, valid, invalid, or unknown. A failed or skipped check is not a content finding. Every row links back to its source check and evidence IDs so you can trace the claim instead of trusting a summary.',
    href: '/how-to-use',
    keywords: ['ledger', 'evidence', 'check', 'state', 'outcome', 'failed', 'skipped', 'running'],
  },
  {
    id: 'c2pa',
    title: 'C2PA and signer trust',
    answer:
      'C2PA is an embedded provenance standard. OriginLens reports manifest presence separately from manifest validation, claim-signature validation, asset/content binding, signer trust, and revocation. A valid signature does not by itself prove who signed or that the scene is true. This build uses an embedded-only trust policy without external trust anchors, so signer trust is often unknown or not evaluated. A valid signature is not the same as a trusted signer.',
    href: '/how-to-use',
    keywords: ['c2pa', 'credential', 'credentials', 'manifest', 'signature', 'signer', 'trust', 'binding', 'revocation', 'jumbf'],
  },
  {
    id: 'metadata',
    title: 'Camera metadata and GPS',
    answer:
      'OriginLens extracts a small allowlist of EXIF fields: capture time, software, camera make and model, orientation, and GPS presence. These are unverified clues and can be absent, copied, edited, or misleading. GPS coordinates are hidden by default. A location view can be unmasked only by an explicit action in your browser, with precise or coarse display. Exported reports exclude precise GPS.',
    href: '/how-to-use',
    keywords: ['metadata', 'exif', 'camera', 'gps', 'location', 'orientation', 'latitude', 'longitude', 'make', 'model'],
  },
  {
    id: 'privacy',
    title: 'What leaves your browser',
    answer:
      'Intake, fingerprinting, metadata parsing, and C2PA reading run in your browser in volatile memory. Original image bytes are not uploaded. The optional model features send bounded text only: evidence explanations send structured check states, evidence IDs and keys, file type, size, dimensions, and SHA-256; this guide sends only your question and the current page name. They never send image bytes, previews, filenames, GPS coordinates, raw metadata values, or manifest text. No account, history, analytics, or persistent local storage is used.',
    href: '/privacy',
    keywords: ['privacy', 'data', 'upload', 'server', 'store', 'persist', 'localstorage', 'tracking', 'leave', 'sent'],
  },
  {
    id: 'report',
    title: 'Exporting a report',
    answer:
      'After an inspection or comparison you can export a versioned JSON report. It contains check states, evidence IDs, warnings, limitations, and the file fingerprint, with includedOriginalImage set to false and includedPreciseGps set to false. The report is validated against its schema before download. A printable/PDF view and a social preview card are also available. Review the report before sharing: it still contains a fingerprint and evidence details.',
    href: '/how-to-use',
    keywords: ['report', 'json', 'export', 'download', 'pdf', 'print', 'share', 'social', 'schema'],
  },
  {
    id: 'model-explanation',
    title: 'How the AI explanation works',
    answer:
      'The model explanation is optional. After you consent, the server sends a bounded evidence summary to the configured provider: check states, evidence IDs and keys, file type, size, dimensions, SHA-256, and your question. The answer is checked against a strict schema, a prohibited-claim filter, and an evidence-ID allowlist. If any check fails or the provider is unavailable, OriginLens shows a deterministic template instead. The explanation is non-authoritative and never changes a validation result.',
    href: '/about',
    keywords: ['model', 'ai', 'explain', 'explanation', 'muse', 'baseten', 'consent', 'llm', 'summary'],
  },
  {
    id: 'limitations',
    title: 'What OriginLens cannot prove',
    answer:
      'OriginLens is not a universal AI detector, a forensic certification service, a truth detector, or a creator-identification service. It cannot prove an image is real, fake, human-made, AI-generated, tampered with, or deceptive. Missing credentials are not proof of anything. A hash identifies one byte version, not origin or intent. Pixel differences are measurements, not tampering findings. Use the Evidence Ledger to see exactly what was and was not checked.',
    href: '/about',
    keywords: ['fake', 'real', 'ai-generated', 'ai generated', 'detect', 'detector', 'authentic', 'tamper', 'truth', 'accuracy', 'reliable', 'trustworthy'],
  },
  {
    id: 'formats',
    title: 'Supported formats and limits',
    answer:
      'Supported formats are JPEG (.jpg, .jpeg) and PNG (.png). Limits are 20 MiB compressed per file, 20 megapixels decoded, and two files per comparison. SVG, animated images, WebP, HEIC/HEIF, AVIF, TIFF, RAW, BMP, PDF, archives, and remote URLs are not supported. A file must pass extension, browser MIME, signature, decode, and format-policy checks before analysis starts.',
    href: '/how-to-use',
    keywords: ['format', 'formats', 'jpeg', 'jpg', 'png', 'size', 'limit', 'limits', 'webp', 'heic', 'svg', 'supported', '20'],
  },
  {
    id: 'troubleshooting',
    title: 'Recovering from an error',
    answer:
      'Common recoverable failures include an unsupported format, a file over 20 MiB, an image over 20 megapixels, a decode failure, an unavailable C2PA WebAssembly runtime, an offline model provider, or a rate limit. Independent completed results are kept when another check fails. Clear the session and retry with a smaller JPEG or PNG. If the credential runtime is unavailable, rerun the check; do not treat that as a missing manifest.',
    href: '/how-to-use',
    keywords: ['error', 'fail', 'unavailable', 'wasm', 'offline', 'too large', 'rate limit', 'retry', 'problem', 'not working', 'crash'],
  },
  {
    id: 'navigation',
    title: 'Finding your way around',
    answer:
      'Pages are Home, Inspect Image, Compare Images, How to Use, About, and Privacy. The two core results are the Evidence Ledger for one file and the Provenance Delta for two files. Report export appears on a completed result. The optional model explanation is inside a result, while this guide is available from the bottom-right button on every page.',
    href: '/how-to-use',
    keywords: ['page', 'where', 'how to', 'guide', 'navigate', 'navigation', 'find', 'menu', 'help'],
  },
];

const TOPIC_BY_ID: ReadonlyMap<GuideTopicId, GuideTopic> = new Map(
  GUIDE_TOPICS.map((topic) => [topic.id, topic]),
);

export function guideTopic(id: GuideTopicId): GuideTopic {
  const topic = TOPIC_BY_ID.get(id);

  if (topic === undefined) {
    throw new Error(`Unknown guide topic: ${id}`);
  }

  return topic;
}

export interface GuideFallbackResult {
  answer: string;
  topicIds: GuideTopicId[];
  followUp?: string;
}

/**
 * Deterministic keyword match over the reviewed content. This is intentionally
 * simple: it is a safe fallback, not a second classifier, and it never invents
 * an answer outside the knowledge base.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a keyword only at a word start, so `ai` finds "AI-generated" but not
 * "available", and `format` still finds "formats".
 */
function keywordMatches(normalized: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}`).test(normalized);
}

export function resolveGuideFallback(question: string): GuideFallbackResult {
  const normalized = question.toLowerCase();
  let best: { topic: GuideTopic; score: number } | null = null;

  for (const topic of GUIDE_TOPICS) {
    let score = 0;

    for (const keyword of topic.keywords) {
      if (keywordMatches(normalized, keyword)) {
        // Compound keywords ("ai-generated", "how to") are more specific than a
        // single word, and outrank the generic product name.
        score += /[\s-]/.test(keyword) ? 2 : 1;
      }
    }

    if (score > 0 && (best === null || score > best.score)) {
      best = { topic, score };
    }
  }

  if (best === null) {
    return {
      answer:
        'I can explain the inspection workflow, the Evidence Ledger, C2PA and metadata limits, privacy, report export, supported formats, and common errors. This question is not covered by the reviewed help content, so I will not guess. The How to Use guide and the About page are the authoritative references.',
      topicIds: ['navigation', 'limitations'],
      followUp: 'Try asking about formats, signer trust, privacy, or report export.',
    };
  }

  return {
    answer: best.topic.answer,
    topicIds: [best.topic.id],
  };
}

export function relatedLinksFor(topicIds: readonly GuideTopicId[]): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  const seen = new Set<string>();

  for (const id of topicIds) {
    const topic = TOPIC_BY_ID.get(id);

    if (topic !== undefined && !seen.has(topic.href)) {
      seen.add(topic.href);
      links.push({ label: topic.title, href: topic.href });
    }
  }

  if (!seen.has('/how-to-use')) {
    links.push({ label: 'How to Use', href: '/how-to-use' });
  }

  return links.slice(0, 4);
}
