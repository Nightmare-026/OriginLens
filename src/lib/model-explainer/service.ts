import OpenAI from 'openai';
import {
  type ExplainRequest,
  type ExplainResponse,
  rawModelResponseSchema,
  explainResponseSchema,
} from './schema';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { validateResponseClaims, validateEvidenceIdCitations } from './claims';
import { generateDeterministicFallback } from './fallback';

export interface ModelExplainerConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  modelName?: string;
  timeoutMs: number;
}

export function getExplainerConfig(): ModelExplainerConfig {
  const enabled = process.env.MODEL_EXPLANATION_ENABLED === 'true';
  const apiKey = process.env.MODEL_API_KEY;
  // No provider endpoint or model is assumed. An operator must set both
  // explicitly; otherwise the route returns the deterministic template and
  // never sends data to a third party by default.
  const baseURL = process.env.MODEL_API_BASE_URL?.trim() || undefined;
  const modelName = process.env.MODEL_NAME?.trim() || undefined;
  const timeoutMs = 20_000;

  return { enabled, apiKey, baseURL, modelName, timeoutMs };
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
  const config = { ...getExplainerConfig(), ...customConfig };

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
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeoutMs,
    });

    const systemPrompt = buildSystemPrompt(request.audience);
    const userPrompt = buildUserPrompt(request);

    const completion = await openai.chat.completions.create({
      model: config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return generateDeterministicFallback(request, 'Model returned empty response content.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return generateDeterministicFallback(request, 'Model output was not valid JSON.');
    }

    // 1. Zod schema validation
    const parsedResult = rawModelResponseSchema.safeParse(parsedJson);
    if (!parsedResult.success) {
      return generateDeterministicFallback(
        request,
        `Model response schema mismatch: ${parsedResult.error.issues[0]?.message ?? 'invalid'}`,
      );
    }

    const rawResponse = parsedResult.data;

    // 2. Forbidden claims validation (no tamper, fake, authentic, human-made assertions)
    const claimsCheck = validateResponseClaims(rawResponse);
    if (!claimsCheck.valid) {
      return generateDeterministicFallback(
        request,
        `Model response rejected for forbidden claim: ${claimsCheck.violation}`,
      );
    }

    // 3. Evidence ID citation verification (must only cite evidence IDs present in report)
    const citationCheck = validateEvidenceIdCitations(rawResponse, knownEvidenceIds);
    if (!citationCheck.valid) {
      return generateDeterministicFallback(
        request,
        `Model response cited unknown evidence ID: ${citationCheck.unknownId}`,
      );
    }

    // Successful validation!
    const explanation: ExplainResponse = {
      ...rawResponse,
      mode: 'ai_generated',
      modelUsed: config.modelName,
      generatedAtUtc: new Date().toISOString(),
      evidenceAttribution: `AI-generated explanation (${config.modelName} — non-authoritative)`,
    };

    return explainResponseSchema.parse(explanation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during model call';
    return generateDeterministicFallback(request, `Model execution fallback: ${message}`);
  }
}
