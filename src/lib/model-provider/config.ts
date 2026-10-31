/**
 * Shared, server-only configuration for the optional model provider.
 *
 * The provider endpoint and model are never assumed: an operator must set both
 * explicitly. Every numeric limit is bounded so a misconfigured environment
 * cannot request an unbounded generation or hang a request indefinitely.
 *
 * Muse Spark Open always reasons, and its reasoning tokens are drawn from the
 * same output budget as the visible answer. `maxTokens` therefore has to be
 * large enough for both; the old 800-token budget produced empty content.
 */

export type ModelReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  modelName?: string;
  timeoutMs: number;
  maxTokens: number;
  reasoningEffort: ModelReasoningEffort;
}

const DEFAULT_TIMEOUT_MS = 45_000;
const MIN_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 120_000;

const DEFAULT_MAX_TOKENS = 3_000;
const MIN_MAX_TOKENS = 512;
const MAX_MAX_TOKENS = 8_000;

const DEFAULT_REASONING_EFFORT: ModelReasoningEffort = 'low';

const REASONING_EFFORTS: readonly ModelReasoningEffort[] = ['low', 'medium', 'high', 'xhigh'];

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function reasoningEffort(raw: string | undefined): ModelReasoningEffort {
  const value = raw?.trim().toLowerCase();

  if (value !== undefined && (REASONING_EFFORTS as readonly string[]).includes(value)) {
    return value as ModelReasoningEffort;
  }

  return DEFAULT_REASONING_EFFORT;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

export function getModelProviderConfig(
  overrides: Partial<ModelProviderConfig> = {},
): ModelProviderConfig {
  const base: ModelProviderConfig = {
    enabled: process.env.MODEL_EXPLANATION_ENABLED === 'true',
    apiKey: nonEmpty(process.env.MODEL_API_KEY),
    baseURL: nonEmpty(process.env.MODEL_API_BASE_URL),
    modelName: nonEmpty(process.env.MODEL_NAME),
    timeoutMs: boundedInteger(
      process.env.MODEL_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      MIN_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    ),
    maxTokens: boundedInteger(
      process.env.MODEL_MAX_TOKENS,
      DEFAULT_MAX_TOKENS,
      MIN_MAX_TOKENS,
      MAX_MAX_TOKENS,
    ),
    reasoningEffort: reasoningEffort(process.env.MODEL_REASONING_EFFORT),
  };

  return {
    ...base,
    ...overrides,
    apiKey: nonEmpty(overrides.apiKey) ?? (overrides.apiKey === undefined ? base.apiKey : undefined),
    baseURL:
      nonEmpty(overrides.baseURL) ?? (overrides.baseURL === undefined ? base.baseURL : undefined),
    modelName:
      nonEmpty(overrides.modelName) ??
      (overrides.modelName === undefined ? base.modelName : undefined),
  };
}

export function isModelProviderReady(config: ModelProviderConfig): boolean {
  return config.enabled && Boolean(config.apiKey && config.baseURL && config.modelName);
}
