import {
  getModelProviderConfig,
  type ModelProviderConfig,
} from '@/lib/model-provider/config';
import { requestModelText } from '@/lib/model-provider/client';
import {
  type ExplainRequest,
  type ExplainResponse,
  rawModelResponseSchema,
  explainResponseSchema,
} from './schema';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { validateResponseClaims, validateEvidenceIdCitations } from './claims';
import { generateDeterministicFallback } from './fallback';

export type ModelExplainerConfig = ModelProviderConfig;

export function getExplainerConfig(): ModelExplainerConfig {
  // No provider endpoint or model is assumed. An operator must set both
  // explicitly; otherwise the route returns the deterministic template and
  // never sends data to a third party by default.
  return getModelProviderConfig();
}

import { extractJsonObject } from '@/lib/model-provider/json';

/**
 * Backwards-compatible name for the shared JSON extractor. Existing callers and
 * tests import `cleanModelOutput`; the implementation lives in the provider
 * layer so the guide and the explainer cannot drift apart.
 */
export function cleanModelOutput(rawContent: string): string {
  return extractJsonObject(rawContent);
}

/**
 * Executes an explanation request.
 * If the model is disabled, unconfigured, fails, times out, or produces invalid claims,
 * it safely falls back to a deterministic template without failing the user experience.
 */
export async function explainReportEvidence(
  request: ExplainRequest,
  customConfig?: Partial<ModelExplainerConfig>,
): Promise<ExplainResponse> {
  const config = getModelProviderConfig(customConfig);

  if (!config.enabled) {
    return generateDeterministicFallback(request, 'Model explanation is disabled by configuration.');
  }

  if (!config.apiKey) {
    return generateDeterministicFallback(request, 'No Model API key configured.');
  }

  if (!config.baseURL || !config.modelName) {
    return generateDeterministicFallback(
      request,
      'No model endpoint configured. Set MODEL_API_BASE_URL and MODEL_NAME explicitly to enable a provider.',
    );
  }

  const knownEvidenceIds = new Set(request.report.evidence.map((e) => e.evidenceId));

  try {
    const systemPrompt = buildSystemPrompt(request.audience);
    const userPrompt = buildUserPrompt(request);

    const result = await requestModelText(config, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Muse Spark Open draws reasoning and answer from the same budget. A
    // `length` finish means the visible answer may be missing or truncated;
    // never attempt to parse it as a complete explanation.
    if (result.finishReason === 'length') {
      return generateDeterministicFallback(
        request,
        'Model reached its output-token limit before completing a structured explanation.',
      );
    }

    const rawContent = result.content;
    if (!rawContent.trim()) {
      return generateDeterministicFallback(request, 'Model returned empty response content.');
    }

    const cleanedContent = cleanModelOutput(rawContent);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedContent);
    } catch {
      return generateDeterministicFallback(request, 'Model output was not valid JSON.');
    }

    // 1. Zod schema validation
    const parsedResult = rawModelResponseSchema.safeParse(parsedJson);
    if (!parsedResult.success) {
      return generateDeterministicFallback(request, 'Model response did not match the required schema.');
    }

    const rawResponse = parsedResult.data;

    // 2. Forbidden claims validation (no tamper, fake, authentic, human-made assertions)
    const claimsCheck = validateResponseClaims(rawResponse);
    if (!claimsCheck.valid) {
      return generateDeterministicFallback(request, 'Model response contained a prohibited verdict claim.');
    }

    // 3. Evidence ID citation verification (must only cite evidence IDs present in report)
    const citationCheck = validateEvidenceIdCitations(rawResponse, knownEvidenceIds);
    if (!citationCheck.valid) {
      return generateDeterministicFallback(request, 'Model response cited an unknown evidence identifier.');
    }

    // Successful validation!
    const explanation: ExplainResponse = {
      ...rawResponse,
      mode: 'ai_generated',
      modelUsed: config.modelName ?? 'server-configured',
      generatedAtUtc: new Date().toISOString(),
      evidenceAttribution: `AI-generated explanation (${config.modelName ?? 'server-configured'} — non-authoritative)`,
      latencyMs: result.latencyMs,
    };

    return explainResponseSchema.parse(explanation);
  } catch (error: unknown) {
    // Only the safe, mapped message is returned. Raw provider errors can echo
    // credentials or request details and must never reach the client.
    return generateDeterministicFallback(
      request,
      error instanceof Error ? error.message : 'Model call failed.',
    );
  }
}
