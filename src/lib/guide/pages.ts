/**
 * Coarse page identifiers for the help guide.
 *
 * Only one of these fixed values is sent with a question; the raw URL, query
 * string, and any path parameter are never forwarded.
 */

export const GUIDE_PAGE_IDS = [
  'home',
  'inspect',
  'compare',
  'how-to-use',
  'about',
  'privacy',
  'other',
] as const;

export type GuidePageId = (typeof GUIDE_PAGE_IDS)[number];

export const GUIDE_PAGE_LABELS: Readonly<Record<GuidePageId, string>> = {
  home: 'Home / overview',
  inspect: 'Inspect Image',
  compare: 'Compare Images',
  'how-to-use': 'How to Use',
  about: 'About OriginLens',
  privacy: 'Privacy',
  other: 'Another OriginLens page',
};

const PATH_TO_PAGE: Readonly<Record<string, GuidePageId>> = {
  '/': 'home',
  '/inspect': 'inspect',
  '/compare': 'compare',
  '/how-to-use': 'how-to-use',
  '/about': 'about',
  '/privacy': 'privacy',
};

export function guidePageIdForPath(pathname: string): GuidePageId {
  return PATH_TO_PAGE[pathname] ?? 'other';
}
