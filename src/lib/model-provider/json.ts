/**
 * Extracts the outermost JSON object from a model completion.
 *
 * Muse Spark Open does not support JSON mode or structured outputs, so a
 * completion can contain reasoning tags, markdown fences, or a short preamble.
 * This function only removes those wrappers; it never repairs invalid JSON.
 * Callers must still validate the parsed value against a strict schema.
 */
export function extractJsonObject(rawContent: string): string {
  let cleaned = rawContent.trim();

  // Strip closed <thought>...</thought> and <think>...</think> blocks (including attributes).
  cleaned = cleaned.replace(/<thought\b[^>]*>[\s\S]*?<\/thought>/gi, '');
  cleaned = cleaned.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '');

  // If a reasoning block was not closed, resume at the first JSON object after it.
  const unclosedMatch = cleaned.match(/<(?:thought|think)\b[^>]*>/i);
  if (unclosedMatch?.index !== undefined) {
    const afterTag = cleaned.slice(unclosedMatch.index + unclosedMatch[0].length);
    const jsonStart = afterTag.indexOf('{');
    if (jsonStart !== -1) {
      cleaned = afterTag.slice(jsonStart);
    }
  }

  // Strip markdown code fences (closed or unclosed).
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch?.[1] !== undefined) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Extract the outermost object if leading/trailing prose remains.
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}
