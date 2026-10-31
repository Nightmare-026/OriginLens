import {
  getModelProviderConfig,
  isModelProviderReady,
  type ModelProviderConfig,
} from '@/lib/model-provider/config';
import { requestModelText, ModelCallError } from '@/lib/model-provider/client';
import { extractJsonObject } from '@/lib/model-provider/json';
import { hasForbiddenClaim } from '@/lib/model-explainer/claims';
import {
  relatedLinksFor,
  resolveGuideFallback,
} from './content';
import { buildGuideSystemPrompt, buildGuideUserPrompt } from './prompt';
import {
  guideResponseSchema,
  rawGuideResponseSchema,
  type GuideRequest,
  type GuideResponse,
} from './schema';

/**
 * Output-safety checks for model-generated guide text.
 *
 * The model must not smuggle links, HTML, code fences, or email addresses into
 * the answer. Approved navigation links are attached server-side from the
 * topic allowlist, so the model never controls a destination URL.
 */
const UNSAFE_ANSWER_PATTERN =
  /(https?:\/\/|www\.|```|<[a-z!/][^>]*>|[\w.+-]+@[\w-]+\.[\w.-]+)/i;

function isUnsafeAnswer(text: string): boolean {
  return UNSAFE_ANSWER_PATTERN.test(text);
}

function buildFallback(request: GuideRequest, reason: string): GuideResponse {
  const fallback = resolveGuideFallback(request.question);

  return guideResponseSchema.parse({
    answer: fallback.answer,
    topicIds: fallback.topicIds,
    ...(fallback.followUp === undefined ? {} : { followUp: fallback.followUp }),
    links: relatedLinksFor(fallback.topicIds),
    mode: 'deterministic_fallback',
    modelUsed: 'reviewed-help-content',
    generatedAtUtc: new Date().toISOString(),
    reason,
  });
}

export type GuideConfig = ModelProviderConfig;

/**
 * Answers one help question. Any disabled configuration, provider failure,
 * timeout, malformed response, prohibited claim, or unsafe output falls back to
 * the reviewed reference content; the UI never shows a broken answer.
 */
export async function answerGuideQuestion(
  request: GuideRequest,
  overrides: Partial<GuideConfig> = {},
): Promise<GuideResponse> {
  const config = getModelProviderConfig(overrides);

  if (!config.enabled) {
    return buildFallback(request, 'Model provider is disabled by configuration.');
  }

  if (!isModelProviderReady(config)) {
    return buildFallback(request, 'Model provider is not fully configured.');
  }

  try {
    const result = await requestModelText(
      config,
      [
        { role: 'system', content: buildGuideSystemPrompt() },
        { role: 'user', content: buildGuideUserPrompt(request) },
      ],
      { maxTokens: Math.min(config.maxTokens, 2_000) },
    );

    if (result.finishReason === 'length') {
      return buildFallback(
        request,
        'Model reached its output-token limit before completing a help answer.',
      );
    }

    if (result.content.trim() === '') {
      return buildFallback(request, 'Model returned empty response content.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(extractJsonObject(result.content));
    } catch {
      return buildFallback(request, 'Model output was not valid JSON.');
    }

    const parsed = rawGuideResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return buildFallback(request, 'Model response did not match the required schema.');
    }

    const answer = parsed.data;

    if (isUnsafeAnswer(answer.answer) || (answer.followUp !== undefined && isUnsafeAnswer(answer.followUp))) {
      return buildFallback(request, 'Model response contained a disallowed link or markup.');
    }

    if (hasForbiddenClaim(answer.answer) || (answer.followUp !== undefined && hasForbiddenClaim(answer.followUp))) {
      return buildFallback(request, 'Model response contained a prohibited verdict claim.');
    }

    return guideResponseSchema.parse({
      answer: answer.answer,
      topicIds: answer.topicIds,
      ...(answer.followUp === undefined ? {} : { followUp: answer.followUp }),
      links: relatedLinksFor(answer.topicIds),
      mode: 'ai_generated',
      modelUsed: config.modelName ?? 'server-configured',
      generatedAtUtc: new Date().toISOString(),
      latencyMs: result.latencyMs,
    });
  } catch (error: unknown) {
    // Only the mapped, non-reflective message is exposed.
    return buildFallback(
      request,
      error instanceof ModelCallError ? error.message : 'Model call failed.',
    );
  }
}
