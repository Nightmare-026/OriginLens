import type { RawModelResponse } from './schema';

/**
 * Forbidden claim policy per PRD §1, §2.3, and ADR-017.
 *
 * The model must never assert authenticity, tampering, human authorship,
 * fabrication, fraud, or absolute proof. OriginLens reports check states; it does
 * not deliver verdicts, so any affirmative verdict in generated prose is a
 * product-integrity failure, not just a wording problem.
 *
 * The filter therefore works in two passes:
 *
 *  1. Unconditional bans (`100%`, `verified by Meta`) are always violations.
 *  2. Otherwise a clause is stripped of *scoped* negations it legitimately
 *     contains, and any verdict term left over is a violation.
 *
 * Scoped negations are of two kinds:
 *
 *  - Epistemic negation: a negation followed by an epistemic verb, which limits
 *    what evidence can establish. Everything after that verb inside the same
 *    clause is treated as negated scope, so a list such as "does not decide
 *    whether an image is real, fake, AI-generated, or trustworthy" is permitted
 *    in full.
 *  - Direct negation of a negative verdict: "the image is not fake", "has not
 *    been tampered with", "nothing here is synthetic". These deny a bad finding
 *    and do not promote trust in a credential.
 *
 * A direct negation of a *positive* verdict is NOT permitted ("the image is not
 * authentic", "it is not real"), because that asserts the opposite verdict about
 * the file instead of limiting the evidence.
 */

// Unconditional bans: never permitted under any circumstance or phrasing
export const UNCONDITIONAL_BANNED_PATTERNS = [
  /100\s*%/,
  /verified by meta/i,
] as const;

// Terms that only ever appear in a verdict or proof claim about the file.
// `prove`/`proof` are included because OriginLens never proves anything about an
// image's origin, intent, or truth; a negated form is handled as evidence
// limitation below.
const VERDICT_TERM_SOURCE = String.raw`tamper(?:ed|ing)?|authentic(?:ity)?|genuine|forg(?:ed|ery)|human[- ](?:made|created)|fraud(?:ulent)?|deceptive|guarantee(?:s|d|ing)?|ai[- ]generated|synthetic|manipulat(?:ed|ion|ing)?|prove[sn]?|proof|fake`;

/**
 * `real` is ordinary English ("real stage states", "a real check result"), so it
 * only counts as a verdict in a predicate position about the subject:
 * "the image is real", "it looks real", "this is not real".
 */
const REAL_AS_VERDICT = new RegExp(
  String.raw`\b(?:is|are|was|were|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|seems?|appears?|looks?|be|been|being|remains?)\s+(?:not\s+|a\s+|an\s+|the\s+|very\s+|clearly\s+|definitely\s+|actually\s+|really\s+|truly\s+|entirely\s+|completely\s+)*real\b`,
  'i',
);

export const PROHIBITED_VERDICT_KEYWORD = new RegExp(
  String.raw`\b(?:${VERDICT_TERM_SOURCE}|real(?![- ](?:world|time)))\b`,
  'i',
);

const VERDICT_TERM = new RegExp(String.raw`\b(?:${VERDICT_TERM_SOURCE})\b`, 'i');

function containsVerdictClaim(text: string): boolean {
  return VERDICT_TERM.test(text) || REAL_AS_VERDICT.test(text);
}

const NEGATION_PREFIX = String.raw`(?:does|do|did|can|could|should|would|has|have|had|is|are|was|were|will|must|might|may|need|needs)\s+not|doesn['’]t|don['’]t|didn['’]t|cannot|can['’]t|couldn['’]t|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|won['’]t|no|never|without|nor|neither`;

const EPISTEMIC_VERB_SOURCE = String.raw`prove|proof|mean|indicate|show|confirm|establish|guarantee|imply|verify|determine|decide|conclude|infer|evidence|indication|confirmation|indicative|constitute|represent|deny|denies|provide|suggest`;

/**
 * Negation + epistemic verb, scoped to the rest of the clause.
 * Example: "does not by itself prove who signed or that the scene is true".
 */
const EPISTEMIC_NEGATION_TO_END = new RegExp(
  String.raw`\b(?:${NEGATION_PREFIX})\b[\s\S]{0,40}?\b(?:${EPISTEMIC_VERB_SOURCE})\b[\s\S]*$`,
  'i',
);

/** Verdicts that describe a bad finding; denying them is defensive. */
const NEGATIVE_VERDICT_SOURCE = String.raw`tamper(?:ed|ing)?|forg(?:ed|ery)|fraud(?:ulent)?|deceptive|fake|ai[- ]generated|synthetic|manipulat(?:ed|ion|ing)?|prove[sn]?|proof`;

/** "not fake", "never tampered with", "not been synthetic", "not proof of". */
const DIRECT_NEGATIVE_VERDICT = new RegExp(
  String.raw`\b(?:not|never|no)\b[\s\S]{0,20}?\b(?:${NEGATIVE_VERDICT_SOURCE})\b`,
  'i',
);

/**
 * Clause boundaries for scope analysis. Commas alone do not end a clause,
 * because verdict lists use them ("real, fake, AI-generated"); a comma only
 * starts a new clause when a new subject or a contrast follows.
 */
const CLAUSE_BOUNDARY =
  /[.!?;:—–]+|\b(?:but|however|whereas|although|while|yet)\b|,\s*(?:and|but|while|whereas|yet|this|that|these|those|the|it|they|we|images?|photos?|files?)\b|\band\s+(?:this|that|the|it|they|we|images?|photos?|files?)\b/i;

function stripScopedNegations(clause: string): string {
  return clause
    .replace(EPISTEMIC_NEGATION_TO_END, '')
    .replace(DIRECT_NEGATIVE_VERDICT, '');
}

/**
 * Scans a string for forbidden claims per ADR-017.
 * - Affirmative verdicts ("This image is fake", "Confirmed authentic") are rejected.
 * - Evidence-limit negations ("Absence does not prove the image is fake") are permitted.
 * - A compound sentence that pairs a permitted negation with an affirmative
 *   verdict is rejected, because the affirmative clause survives the stripping.
 */
export function hasForbiddenClaim(text: string): boolean {
  for (const pattern of UNCONDITIONAL_BANNED_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  if (!PROHIBITED_VERDICT_KEYWORD.test(text)) {
    return false;
  }

  for (const clause of text.split(CLAUSE_BOUNDARY)) {
    const trimmed = clause.trim();
    if (trimmed === '') continue;

    if (containsVerdictClaim(stripScopedNegations(trimmed))) {
      return true;
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
