import { z } from 'zod';
import { SUMMARY_CODES } from '@/lib/results/schemas';

/**
 * P1-001 Meta Model Evidence Explanation Contract
 * Strict Zod validation at both request and response boundaries.
 */

export const explainRequestSchema = z
  .object({
    schemaVersion: z.literal('2.0'),
    consent: z.literal(true),
    model: z.string().min(1).max(120),
    audience: z.enum(['general', 'newsroom', 'forensic']).optional(),
    userQuery: z.string().max(300).optional(),
    report: z.object({
      reportId: z.string().regex(/^rpt_[A-Za-z0-9_-]{6,64}$/),
      summaryCodes: z.array(z.enum(SUMMARY_CODES)).max(8),
      trustPolicyId: z.string().max(120),
      files: z
        .array(
          z.object({
            fileId: z.string().regex(/^file_[A-Za-z0-9_-]{6,64}$/),
            detectedMimeType: z.enum(['image/jpeg', 'image/png']),
            byteSize: z.number().int().positive().max(20 * 1024 * 1024),
            width: z.number().int().positive().max(20_000),
            height: z.number().int().positive().max(20_000),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          }),
        )
        .min(1)
        .max(2),
      checks: z
        .array(
          z.object({
            checkId: z.string().regex(/^chk_[A-Za-z0-9_-]{6,64}$/),
            kind: z.string().max(40),
            executionState: z.enum([
              'queued',
              'running',
              'completed',
              'skipped',
              'cancelled',
              'failed',
              'timed_out',
            ]),
            outcome: z.string().max(40).optional(),
            warnings: z.array(z.string().max(300)).max(10),
            limitations: z.array(z.string().max(300)).max(10),
            errorCode: z.string().max(80).optional(),
          }),
        )
        .max(40),
      evidence: z
        .array(
          z.object({
            evidenceId: z.string().regex(/^ev_[A-Za-z0-9_-]{6,64}$/),
            sourceCheckId: z.string().regex(/^chk_[A-Za-z0-9_-]{6,64}$/),
            key: z.string().max(120),
            valueType: z.enum(['text', 'number', 'boolean', 'hash', 'timestamp', 'code']),
            value: z.union([z.string().max(600), z.number(), z.boolean(), z.null()]),
            authority: z.enum([
              'cryptographic_validation',
              'provider_result',
              'file_measurement',
              'unverified_metadata',
              'model_explanation',
            ]),
          }),
        )
        .max(150),
      disclaimers: z.array(z.string().max(400)).max(15),
    }),
  })
  .strict();

export type ExplainRequest = z.infer<typeof explainRequestSchema>;

export const rawModelResponseSchema = z
  .object({
    plainLanguageSummary: z.string().min(1).max(1200),
    whatThisSupports: z
      .array(
        z.object({
          evidenceIds: z.array(z.string().regex(/^ev_[A-Za-z0-9_-]{6,64}$/)).min(1).max(10),
          text: z.string().min(1).max(400),
        }),
      )
      .max(8),
    whatRemainsUnknown: z
      .array(
        z.object({
          evidenceIds: z.array(z.string().regex(/^ev_[A-Za-z0-9_-]{6,64}$/)).max(10),
          text: z.string().min(1).max(400),
        }),
      )
      .max(8),
    nextChecks: z
      .array(
        z.object({
          text: z.string().min(1).max(300),
          capabilityId: z.enum([
            'compare_two_files',
            'inspect_metadata',
            'view_c2pa_details',
            'none',
          ]),
        }),
      )
      .max(4),
  })
  .strict();

export type RawModelResponse = z.infer<typeof rawModelResponseSchema>;

export const explainResponseSchema = rawModelResponseSchema.extend({
  mode: z.enum(['ai_generated', 'deterministic_fallback']),
  modelUsed: z.string().max(120),
  generatedAtUtc: z.string(),
  evidenceAttribution: z.string(),
  reason: z.string().max(200).optional(),
});

export type ExplainResponse = z.infer<typeof explainResponseSchema>;
