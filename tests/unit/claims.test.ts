import { describe, expect, it } from 'vitest';
import {
  hasForbiddenClaim,
  validateResponseClaims,
  validateEvidenceIdCitations,
} from '@/lib/model-explainer/claims';

describe('Hedging-Aware Claims Filter (ADR-017) Unit Tests', () => {
  describe('Prohibited Affirmative Verdicts', () => {
    it('rejects 100% authenticity guarantees', () => {
      expect(hasForbiddenClaim('This image is 100% authentic')).toBe(true);
      expect(hasForbiddenClaim('100 % genuine photograph')).toBe(true);
    });

    it('rejects fabricated Meta verification claims', () => {
      expect(hasForbiddenClaim('Verified by Meta AI')).toBe(true);
      expect(hasForbiddenClaim('This file was verified by meta')).toBe(true);
    });

    it('rejects affirmative human authorship claims', () => {
      expect(hasForbiddenClaim('Evidence confirms this was human-made')).toBe(true);
      expect(hasForbiddenClaim('The picture was human-created')).toBe(true);
    });

    it('rejects affirmative tampering verdicts', () => {
      expect(hasForbiddenClaim('The photo has been tampered with')).toBe(true);
      expect(hasForbiddenClaim('Evidence indicates tampering')).toBe(true);
    });

    it('rejects affirmative fake or forgery verdicts', () => {
      expect(hasForbiddenClaim('This is a fake image')).toBe(true);
      expect(hasForbiddenClaim('The image is forged')).toBe(true);
      expect(hasForbiddenClaim('This file is a forgery')).toBe(true);
    });

    it('rejects fraud and deception assertions', () => {
      expect(hasForbiddenClaim('This is deceptive')).toBe(true);
      expect(hasForbiddenClaim('Clear evidence of fraud')).toBe(true);
    });

    it('rejects unhedged proof claims', () => {
      expect(hasForbiddenClaim('This proves the file was modified')).toBe(true);
      expect(hasForbiddenClaim('The hash proves authenticity')).toBe(true);
      expect(hasForbiddenClaim('We guarantee the origin of this image')).toBe(true);
    });
  });

  describe('Permitted Defensive Negations & Epistemic Statements', () => {
    it('permits defensive negations regarding fake status', () => {
      expect(hasForbiddenClaim('Absence does not prove the image is fake')).toBe(false);
      expect(hasForbiddenClaim('Absence of C2PA manifest does not prove an image is fake')).toBe(false);
      expect(hasForbiddenClaim('Missing credentials do not mean the image is fake')).toBe(false);
      expect(hasForbiddenClaim("This isn't proof that the image is fake")).toBe(false);
    });

    it('permits defensive negations regarding tampering', () => {
      expect(hasForbiddenClaim('Missing credentials do not prove the image has been tampered with')).toBe(false);
      expect(hasForbiddenClaim('No evidence of tampering was detected')).toBe(false);
      expect(hasForbiddenClaim('Lack of manifest does not indicate tampering')).toBe(false);
      expect(hasForbiddenClaim("This isn't proof of tampering")).toBe(false);
      expect(hasForbiddenClaim("Discrepancies aren't evidence of tampering")).toBe(false);
      expect(hasForbiddenClaim('Absence does not provide evidence of tampering')).toBe(false);
    });

    it('permits defensive negations regarding authenticity and genuine origin', () => {
      expect(hasForbiddenClaim('This does not guarantee authenticity')).toBe(false);
      expect(hasForbiddenClaim('The presence of metadata is not proof of authenticity')).toBe(false);
      expect(hasForbiddenClaim('Neither confirms nor denies authenticity')).toBe(false);
      expect(hasForbiddenClaim('Absence does not mean the photo is genuine')).toBe(false);
      expect(hasForbiddenClaim('This does not constitute proof of authenticity')).toBe(false);
    });

    it('permits defensive negations regarding human-made authorship', () => {
      expect(hasForbiddenClaim('Lack of manifest does not mean it is human-made')).toBe(false);
      expect(hasForbiddenClaim('Absence of an embedded credential is not evidence that an image is human-made')).toBe(false);
      expect(hasForbiddenClaim("The metadata wasn't proof that this was human-created")).toBe(false);
    });

    it('permits completely neutral factual statements', () => {
      expect(hasForbiddenClaim('No C2PA manifest was detected in the file')).toBe(false);
      expect(hasForbiddenClaim('Cryptographic SHA-256 fingerprint computed')).toBe(false);
      expect(hasForbiddenClaim('Dimensions are 1920x1080 with JPEG compression')).toBe(false);
    });
  });

  describe('Compound Sentences with Mixed Claims', () => {
    it('rejects compound sentences where an affirmative violation is paired with a negation', () => {
      expect(
        hasForbiddenClaim('Absence does not prove the image is fake, but the photo is fake.'),
      ).toBe(true);

      expect(
        hasForbiddenClaim('Missing credentials do not prove tampering; however, this image has been tampered with.'),
      ).toBe(true);

      expect(
        hasForbiddenClaim('This does not guarantee authenticity. The image is 100% authentic.'),
      ).toBe(true);

      expect(
        hasForbiddenClaim('Absence does not prove the image is fake and this image is authentic.'),
      ).toBe(true);

      expect(
        hasForbiddenClaim('Absence does not prove the image is fake, this image is authentic.'),
      ).toBe(true);

      expect(
        hasForbiddenClaim('Absence does not prove the image is fake, while it is tampered with.'),
      ).toBe(true);
    });
  });

  describe('List scoping and polarity', () => {
    it('permits a negated verdict list without splitting it into affirmative claims', () => {
      expect(
        hasForbiddenClaim(
          'It does not decide whether an image is real, fake, AI-generated, or trustworthy.',
        ),
      ).toBe(false);

      expect(
        hasForbiddenClaim(
          'It cannot prove an image is real, fake, human-made, AI-generated, tampered with, or deceptive.',
        ),
      ).toBe(false);
    });

    it('permits direct denials of negative verdicts', () => {
      expect(hasForbiddenClaim('The image has not been tampered with.')).toBe(false);
      expect(hasForbiddenClaim('The image is not fake.')).toBe(false);
      expect(hasForbiddenClaim('Pixel differences are measurements, not tampering findings.')).toBe(false);
      expect(hasForbiddenClaim('This direct field is not AI-generated.')).toBe(false);
    });

    it('still rejects affirmative verdicts next to a permitted denial', () => {
      expect(hasForbiddenClaim('This image is AI-generated.')).toBe(true);
      expect(hasForbiddenClaim('The image is real.')).toBe(true);
      expect(hasForbiddenClaim('The file is authentic.')).toBe(true);
      expect(hasForbiddenClaim('This is a genuine photograph.')).toBe(true);
    });

    it('rejects a negated positive verdict because it asserts the opposite verdict', () => {
      // "not authentic" / "not real" are verdicts about the file, not limits on evidence.
      expect(hasForbiddenClaim('The image is not authentic.')).toBe(true);
      expect(hasForbiddenClaim('The photo is not real.')).toBe(true);
    });

    it('does not treat the ordinary adjective "real" as a verdict', () => {
      expect(hasForbiddenClaim('This is a real-world example.')).toBe(false);
      expect(hasForbiddenClaim('Progress reflects real stage states, not invented percentages.')).toBe(
        false,
      );
    });

    it('permits an epistemic limit that names what a signature proves', () => {
      expect(
        hasForbiddenClaim('A valid signature does not by itself prove who signed.'),
      ).toBe(false);
    });
  });

  describe('validateResponseClaims Integration', () => {
    it('accepts responses where whatRemainsUnknown contains valid defensive negations', () => {
      const response = {
        plainLanguageSummary: 'The file was fingerprinted and checked for embedded credentials.',
        whatThisSupports: [
          {
            evidenceIds: ['ev_sha256'],
            text: 'SHA-256 fingerprint computed accurately.',
          },
        ],
        whatRemainsUnknown: [
          {
            evidenceIds: [],
            text: 'Absence of C2PA manifest does not prove an image is fake or human-made.',
          },
          {
            evidenceIds: [],
            text: 'Missing credentials do not prove the image has been tampered with.',
          },
        ],
        nextChecks: [
          {
            text: 'Compare with another file.',
            capabilityId: 'compare_two_files' as const,
          },
        ],
      };

      const result = validateResponseClaims(response);
      expect(result.valid).toBe(true);
    });

    it('rejects responses where whatThisSupports contains an affirmative violation', () => {
      const response = {
        plainLanguageSummary: 'Analysis complete.',
        whatThisSupports: [
          {
            evidenceIds: ['ev_1'],
            text: 'This image is confirmed authentic.',
          },
        ],
        whatRemainsUnknown: [],
        nextChecks: [],
      };

      const result = validateResponseClaims(response);
      expect(result.valid).toBe(false);
      expect(result.violation).toContain('whatThisSupports contains forbidden claim');
    });
  });

  describe('validateEvidenceIdCitations Integration', () => {
    it('verifies that cited evidence IDs must exist in known set', () => {
      const response = {
        plainLanguageSummary: 'Fingerprint verified.',
        whatThisSupports: [
          {
            evidenceIds: ['ev_known_1'],
            text: 'Valid hash match.',
          },
        ],
        whatRemainsUnknown: [
          {
            evidenceIds: ['ev_known_2'],
            text: 'Signer trust not evaluated.',
          },
        ],
        nextChecks: [],
      };

      const validResult = validateEvidenceIdCitations(
        response,
        new Set(['ev_known_1', 'ev_known_2']),
      );
      expect(validResult.valid).toBe(true);

      const invalidResult = validateEvidenceIdCitations(
        response,
        new Set(['ev_known_1']),
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.unknownId).toBe('ev_known_2');
    });
  });
});
