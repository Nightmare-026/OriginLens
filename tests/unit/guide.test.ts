import { beforeEach, describe, expect, it } from 'vitest';
import {
  GUIDE_TOPICS,
  GUIDE_TOPIC_IDS,
  relatedLinksFor,
  resolveGuideFallback,
} from '@/lib/guide/content';
import { guidePageIdForPath } from '@/lib/guide/pages';
import {
  guideRequestSchema,
  guideResponseSchema,
  rawGuideResponseSchema,
} from '@/lib/guide/schema';
import { answerGuideQuestion } from '@/lib/guide/service';
import { hasForbiddenClaim } from '@/lib/model-explainer/claims';
import { extractJsonObject } from '@/lib/model-provider/json';
import { getModelProviderConfig, isModelProviderReady } from '@/lib/model-provider/config';

describe('OriginLens Guide (site-wide help) unit tests', () => {
  beforeEach(() => {
    delete process.env.MODEL_EXPLANATION_ENABLED;
    delete process.env.MODEL_API_KEY;
    delete process.env.MODEL_API_BASE_URL;
    delete process.env.MODEL_NAME;
  });

  it('maps only known paths to coarse page identifiers', () => {
    expect(guidePageIdForPath('/')).toBe('home');
    expect(guidePageIdForPath('/inspect')).toBe('inspect');
    expect(guidePageIdForPath('/compare/')).toBe('other');
  });

  it('accepts a minimal consented request and rejects unsafe shapes', () => {
    const valid = guideRequestSchema.safeParse({
      schemaVersion: '1.0',
      consent: true,
      question: 'What formats are supported?',
      page: 'inspect',
    });
    expect(valid.success).toBe(true);

    expect(
      guideRequestSchema.safeParse({
        schemaVersion: '1.0',
        consent: false,
        question: 'What formats are supported?',
      }).success,
    ).toBe(false);

    expect(
      guideRequestSchema.safeParse({
        schemaVersion: '1.0',
        consent: true,
        question: 'x'.repeat(301),
      }).success,
    ).toBe(false);

    expect(
      guideRequestSchema.safeParse({
        schemaVersion: '1.0',
        consent: true,
        question: 'Explain this',
        image: 'data:image/jpeg;base64,AAAA',
      }).success,
    ).toBe(false);

    expect(
      guideRequestSchema.safeParse({
        schemaVersion: '1.0',
        consent: true,
        question: 'Explain this',
        page: '../admin',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown topic ids in a model response', () => {
    expect(
      rawGuideResponseSchema.safeParse({
        answer: 'Grounded answer.',
        topicIds: ['not-a-real-topic'],
      }).success,
    ).toBe(false);

    expect(
      rawGuideResponseSchema.safeParse({
        answer: 'Grounded answer.',
        topicIds: ['formats'],
      }).success,
    ).toBe(true);
  });

  it('resolves reviewed answers deterministically for common questions', () => {
    const formats = resolveGuideFallback('What formats and size limits are supported?');
    expect(formats.topicIds).toContain('formats');
    expect(formats.answer).toContain('JPEG');
    expect(formats.answer).toContain('20 MiB');

    const trust = resolveGuideFallback('What does signer trust unknown mean?');
    expect(trust.topicIds).toContain('c2pa');
    expect(trust.answer).toContain('trust');

    const privacy = resolveGuideFallback('What data leaves my browser?');
    expect(privacy.topicIds).toContain('privacy');
    expect(privacy.answer).toContain('Original image bytes are not uploaded');

    const detector = resolveGuideFallback('Does OriginLens tell me if an image is AI-generated?');
    expect(detector.topicIds).toContain('limitations');
  });

  it('does not guess when a question is outside the reviewed content', () => {
    const result = resolveGuideFallback('How do I bake sourdough bread?');
    expect(result.topicIds).toEqual(['navigation', 'limitations']);
    expect(result.answer).toContain('not covered by the reviewed help content');
  });

  it('serves a deterministic fallback with only approved internal links', async () => {
    const response = await answerGuideQuestion(
      {
        schemaVersion: '1.0',
        consent: true,
        question: 'What formats are supported?',
        page: 'home',
      },
      { enabled: false },
    );

    expect(response.mode).toBe('deterministic_fallback');
    expect(response.modelUsed).toBe('reviewed-help-content');
    expect(response.answer).toContain('JPEG');
    expect(response.links.length).toBeGreaterThan(0);

    for (const link of response.links) {
      expect(['/', '/inspect', '/compare', '/how-to-use', '/about', '/privacy']).toContain(
        link.href,
      );
    }

    expect(guideResponseSchema.safeParse(response).success).toBe(true);
  });

  it('deduplicates related links and always offers how-to-use', () => {
    const links = relatedLinksFor(['formats', 'formats', 'privacy']);
    const hrefs = links.map((link) => link.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain('/how-to-use');
  });

  it('extracts a JSON object from reasoning tags, fences, and prose', () => {
    expect(
      extractJsonObject('```json\n{"answer":"ok","topicIds":["formats"]}\n```'),
    ).toBe('{"answer":"ok","topicIds":["formats"]}');

    expect(
      extractJsonObject(
        '<thought>internal</thought> Here is the answer: {"answer":"ok","topicIds":["formats"]}',
      ),
    ).toBe('{"answer":"ok","topicIds":["formats"]}');
  });

  it('keeps every reviewed answer inside the prohibited-claim policy', () => {
    const violations = GUIDE_TOPICS.filter((topic) => hasForbiddenClaim(topic.answer)).map(
      (topic) => topic.id,
    );

    expect(violations, `reviewed answers rejected by the claims filter: ${violations.join(', ')}`).toEqual([]);
  });

  it('has unique topic ids and non-empty reviewed answers', () => {
    expect(new Set(GUIDE_TOPIC_IDS).size).toBe(GUIDE_TOPICS.length);

    for (const topic of GUIDE_TOPICS) {
      expect(topic.answer.length).toBeGreaterThan(80);
      expect(topic.answer.length).toBeLessThanOrEqual(900);
      expect(topic.href.startsWith('/')).toBe(true);
    }
  });
});

describe('model provider configuration', () => {
  beforeEach(() => {
    delete process.env.MODEL_EXPLANATION_ENABLED;
    delete process.env.MODEL_API_KEY;
    delete process.env.MODEL_API_BASE_URL;
    delete process.env.MODEL_NAME;
    delete process.env.MODEL_MAX_TOKENS;
    delete process.env.MODEL_TIMEOUT_MS;
    delete process.env.MODEL_REASONING_EFFORT;
  });

  it('is disabled and unready by default', () => {
    const config = getModelProviderConfig();
    expect(config.enabled).toBe(false);
    expect(config.maxTokens).toBe(3000);
    expect(config.timeoutMs).toBe(45000);
    expect(config.reasoningEffort).toBe('low');
    expect(isModelProviderReady(config)).toBe(false);
  });

  it('bounds numeric settings and validates reasoning effort', () => {
    process.env.MODEL_MAX_TOKENS = '999999';
    process.env.MODEL_TIMEOUT_MS = '1';
    process.env.MODEL_REASONING_EFFORT = 'extreme';

    const config = getModelProviderConfig();
    expect(config.maxTokens).toBe(8000);
    expect(config.timeoutMs).toBe(5000);
    expect(config.reasoningEffort).toBe('low');
  });

  it('treats an explicit empty override as unconfigured', () => {
    process.env.MODEL_API_KEY = 'server-key';
    process.env.MODEL_API_BASE_URL = 'https://example.invalid/v1';
    process.env.MODEL_NAME = 'example-model';

    const config = getModelProviderConfig({ apiKey: '' });
    expect(config.apiKey).toBeUndefined();
    expect(isModelProviderReady({ ...config, enabled: true })).toBe(false);
  });
});
