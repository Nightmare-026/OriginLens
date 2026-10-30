import type { RawModelResponse } from './schema';

/**
 * Forbidden claim patterns per PRD §1, §2.3, and ADR-017.
 * The model must never make affirmative definitive claims regarding authenticity,
 * fraud, tampering, human authorship, or absolute 100% guarantees.
 */

// Unconditional bans: never permitted under any circumstance or phrasing
export const UNCONDITIONAL_BANNED_PATTERNS = [
  /100\s*%/,
  /verified by meta/i,
] as const;

// Prohibited verdict keywords that require defensive hedging/epistemic negation
export const PROHIBITED_VERDICT_KEYWORD =
  /\b(?:tamper(?:ed|ing)?|authentic(?:ity)?|genuine|fake|forg(?:ed|ery)|human[- ](?:made|created)|fraud(?:ulent)?|deceptive|guarantee(?:s|d|ing)?|proves?)\b/i;

// Epistemic negation patterns (hedging that clarifies the limits of evidence)
const EPISTEMIC_VERB_NEGATION =
  /\b(?:(?:does|do|did|can|could|should|would)\s+not|doesn't|don't|didn't|cannot|can't|couldn't|nor\s+(?:does|is|can|will)?)\s+(?:prove|mean|indicate|show|confirm|establish|guarantee|imply|verify|determine|provide|constitute|represent|offer)\b[\s\w,‘'’"“”()\-]*?\b(?:tamper(?:ed|ing)?|authentic(?:ity)?|genuine|fake|forg(?:ed|ery)|human[- ](?:made|created)|fraud(?:ulent)?|deceptive|guarantee(?:s|d)?|proves?)\b/i;

const EPISTEMIC_NOUN_NEGATION =
  /\b(?:(?:is|are|was|were)\s+not|isn't|aren't|wasn't|weren't|not\s+necessarily)\s+(?:proof|evidence|a\s+guarantee|indicative|confirmation)\s+(?:that|of)?\b[\s\w,‘'’"“”()\-]*?\b(?:tamper(?:ed|ing)?|authentic(?:ity)?|genuine|fake|forg(?:ed|ery)|human[- ](?:made|created)|fraud(?:ulent)?|deceptive|guarantee(?:s|d)?|proves?)\b/i;

const NO_EVIDENCE_NEGATION =
  /\b(?:no\s+(?:evidence|proof|guarantee|indication)\s+(?:that|of)?|not\s+(?:evidence\s+that|proof\s+that|a\s+guarantee\s+that)|nor\s+(?:is\s+it|are\s+they|does\s+it|is|are|was|were)?\s*(?:evidence|proof|a\s+guarantee|indicative|confirmation)\s+(?:that|of)?|without\s+proving|neither\s+confirms?\s+nor\s+denies?|fails?\s+to\s+prove)\b[\s\w,‘'’"“”()\-]*?\b(?:tamper(?:ed|ing)?|authentic(?:ity)?|genuine|fake|forg(?:ed|ery)|human[- ](?:made|created)|fraud(?:ulent)?|deceptive|guarantee(?:s|d)?|proves?)\b/i;

/**
 * Scans a string for forbidden claims per ADR-017.
 * - Affirmative claims (e.g. "This image is fake", "Confirmed authentic", "Was tampered with") are rejected.
 * - Defensive negations (e.g. "Absence does not prove the image is fake", "Missing credentials do not prove tampering") are permitted.
 * - Compound sentences containing an affirmative violation alongside a negation are rejected.
 */
export function hasForbiddenClaim(text: string): boolean {
  // 1. Check unconditional bans
  for (const pattern of UNCONDITIONAL_BANNED_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // 2. If no prohibited verdict keyword is present, it is completely valid
  if (!PROHIBITED_VERDICT_KEYWORD.test(text)) {
    return false;
  }

  // 3. Prohibited keywords are present. Check clause-by-clause.
  // Split on sentence punctuation, contrasting conjunctions, or coordinating conjunctions introducing an assertion
  const clauses = text.split(
    /[.!?;]+|\b(?:but|however|whereas|although|while|yet)\b|,\s*(?:and|while|whereas|yet)?\b|\band\s+(?:this|that|the|it|they|we|images?|photos?|files?)\b/i,
  );

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    // If this clause has a prohibited verdict keyword
    if (PROHIBITED_VERDICT_KEYWORD.test(trimmed)) {
      // Check if it is a legitimate epistemic defensive negation
      const isNegated =
        EPISTEMIC_VERB_NEGATION.test(trimmed) ||
        EPISTEMIC_NOUN_NEGATION.test(trimmed) ||
        NO_EVIDENCE_NEGATION.test(trimmed);

      if (!isNegated) {
        // Unhedged affirmative verdict detected!
        return true;
      }
    }
  }

  return false;
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
