import { z } from 'zod';
import { GUIDE_TOPIC_IDS } from './content';
import { GUIDE_PAGE_IDS } from './pages';

/**
 * Contract for the site-wide help guide.
 *
 * The request is deliberately tiny: one bounded question and a coarse page
 * identifier. It has no field for an image, report, hash, filename, metadata,
 * or prior conversation, so those values cannot be sent by accident.
 */

export const GUIDE_SCHEMA_VERSION = '1.0';

export const guideRequestSchema = z
  .object({
    schemaVersion: z.literal(GUIDE_SCHEMA_VERSION),
    consent: z.literal(true),
    question: z.string().trim().min(2).max(300),
    page: z.enum(GUIDE_PAGE_IDS).optional(),
  })
  .strict();

export type GuideRequest = z.infer<typeof guideRequestSchema>;

export const rawGuideResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(900),
    topicIds: z.array(z.enum(GUIDE_TOPIC_IDS)).min(1).max(3),
    followUp: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export type RawGuideResponse = z.infer<typeof rawGuideResponseSchema>;

export const guideResponseSchema = rawGuideResponseSchema.extend({
  mode: z.enum(['ai_generated', 'deterministic_fallback']),
  modelUsed: z.string().max(120),
  generatedAtUtc: z.string(),
  latencyMs: z.number().int().nonnegative().optional(),
  reason: z.string().max(200).optional(),
  links: z
    .array(
      z
        .object({
          label: z.string().max(80),
          href: z.enum(['/', '/inspect', '/compare', '/how-to-use', '/about', '/privacy']),
        })
        .strict(),
    )
    .max(4),
});

export type GuideResponse = z.infer<typeof guideResponseSchema>;
