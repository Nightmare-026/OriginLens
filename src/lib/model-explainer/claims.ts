import type { RawModelResponse } from './schema';

/**
 * Forbidden claim patterns per PRD §1, §2.3, and P1-001 plan.
 * The model must never make definitive claims regarding authenticity, fraud,
 * human authorship, or 100% guarantees.
 */
export const FORBIDDEN_CLAIM_PATTERNS = [
  /\btamper/i,
  /\bauthentic\b/i,
  /\bfake\b/i,
  /\bforg(ed|ery)\b/i,
  /\bhuman[- ](made|created)/i,
  /\bfraud\b/i,
  /\bdeceptive\b/i,
  /100\s*%/,
  /verified by meta/i,
  /\bproves?\b/i,
  /\bguarantee/i,
] as const;

/**
 * Scans a string for forbidden claims. Returns true if any forbidden pattern matches.
 */
export function hasForbiddenClaim(text: string): boolean {
  return FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Deeply scans the structured model response to verify it contains no forbidden claim.
 */
export function validateResponseClaims(response: RawModelResponse): {
  valid: boolean;
  violation?: string;
} {
  if (hasForbiddenClaim(response.plainLanguageSummary)) {
    return { valid: false, violation: 'plainLanguageSummary contains forbidden claim' };
  }

  for (const item of response.whatThisSupports) {
    if (hasForbiddenClaim(item.text)) {
      return { valid: false, violation: `whatThisSupports contains forbidden claim: ${item.text}` };
    }
  }

  for (const item of response.whatRemainsUnknown) {
    if (hasForbiddenClaim(item.text)) {
      return { valid: false, violation: `whatRemainsUnknown contains forbidden claim: ${item.text}` };
    }
  }

  for (const item of response.nextChecks) {
    if (hasForbiddenClaim(item.text)) {
      return { valid: false, violation: `nextChecks contains forbidden claim: ${item.text}` };
    }
  }

  return { valid: true };
}

/**
 * Validates that every evidence ID cited in whatThisSupports and whatRemainsUnknown
 * actually exists in the request's evidence set.
 */
export function validateEvidenceIdCitations(
  response: RawModelResponse,
  knownEvidenceIds: Set<string>,
): {
  valid: boolean;
  unknownId?: string;
} {
  for (const item of response.whatThisSupports) {
    for (const id of item.evidenceIds) {
      if (!knownEvidenceIds.has(id)) {
        return { valid: false, unknownId: id };
      }
    }
  }

  for (const item of response.whatRemainsUnknown) {
    for (const id of item.evidenceIds) {
      if (!knownEvidenceIds.has(id)) {
        return { valid: false, unknownId: id };
      }
    }
  }

  return { valid: true };
}
