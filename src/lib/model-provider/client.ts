import OpenAI from 'openai';
import type { ModelProviderConfig } from './config';

/**
 * One bounded chat-completions call against the operator-configured provider.
 *
 * Provider-specific facts this encodes (verified against Baseten's docs on
 * 2026-10-31):
 * - Muse Spark Open always reasons and does not support JSON mode or structured
 *   outputs, so callers must validate the returned text themselves.
 * - Reasoning tokens share the `max_tokens` budget, so the budget must cover
 *   both reasoning and the visible answer.
 * - `reasoning_effort` is a top-level Chat Completions parameter. `low` keeps
 *   latency and cost predictable for short structured answers; it can be
 *   raised with `MODEL_REASONING_EFFORT`.
 */

export interface ModelCallResult {
  content: string;
  finishReason: string | null;
  latencyMs: number;
  reasoningTokens?: number;
}

export type ModelCallErrorKind = 'timeout' | 'rate_limited' | 'auth' | 'provider' | 'unknown';

export class ModelCallError extends Error {
  readonly kind: ModelCallErrorKind;
  readonly status?: number;

  constructor(kind: ModelCallErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ModelCallError';
    this.kind = kind;
    this.status = status;
  }
}

export async function requestModelText(
  config: ModelProviderConfig,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: { maxTokens?: number } = {},
): Promise<ModelCallResult> {
  if (!config.apiKey || !config.baseURL || !config.modelName) {
    throw new ModelCallError('provider', 'Model provider is not fully configured.');
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    maxRetries: 0,
  });

  const startedAt = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model: config.modelName,
      messages,
      max_tokens: options.maxTokens ?? config.maxTokens,
      reasoning_effort: config.reasoningEffort,
    });

    const choice = completion.choices[0];
    const reasoningTokens = completion.usage?.completion_tokens_details?.reasoning_tokens;

    return {
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason ?? null,
      latencyMs: Date.now() - startedAt,
      ...(typeof reasoningTokens === 'number' ? { reasoningTokens } : {}),
    };
  } catch (error: unknown) {
    throw toModelCallError(error);
  }
}

/**
 * Maps provider failures to safe, non-reflective error kinds. Provider error
 * bodies and messages are deliberately not forwarded: they can echo request
 * details, internal URLs, or credential fragments into a client response.
 */
export function toModelCallError(error: unknown): ModelCallError {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new ModelCallError('auth', 'Model provider rejected the configured credentials.', error.status);
    }

    if (error.status === 429) {
      return new ModelCallError('rate_limited', 'Model provider rate limit was reached.', error.status);
    }

    if (error.status !== undefined && error.status >= 500) {
      return new ModelCallError('provider', 'Model provider is temporarily unavailable.', error.status);
    }

    return new ModelCallError('provider', 'Model provider rejected the request.', error.status);
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new ModelCallError('timeout', 'Model provider request timed out.');
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new ModelCallError('provider', 'Model provider could not be reached.');
  }

  return new ModelCallError('unknown', 'Model provider call failed.');
}
