import { sanitizeUntrustedText } from '@/lib/security/text';
import type { MappedC2paStore } from './types';

/**
 * Full Editing-History Reconstruction (Feature 5).
 *
 * Traverses C2PA manifests to extract the complete provenance graph, including
 * ancestor ingredients, sequential transformation actions, software agents,
 * parameters (e.g. crop bounds, color filters), and digital source types.
 */

export type ProvenanceActionCategory =
  | 'genesis'
  | 'crop_geometry'
  | 'color_tone'
  | 'filter'
  | 'drawing'
  | 'layer_composite'
  | 'ai_algorithmic'
  | 'general_edit';

export type ProvenanceActionStep = Readonly<{
  id: string;
  sequenceIndex: number;
  actionCode: string;
  category: ProvenanceActionCategory;
  categoryLabel: string;
  softwareAgent: string | null;
  when: string | null;
  description: string | null;
  digitalSourceType: string | null;
  parameters: Record<string, string | number | boolean> | null;
  sourceEvidenceId?: string;
}>;

export type ProvenanceIngredientNode = Readonly<{
  id: string;
  title: string;
  relationship: string;
  format: string | null;
  instanceId: string | null;
  documentId: string | null;
  validationStatus: string | null;
  isRoot: boolean;
  sourceEvidenceId?: string;
}>;

export type ProvenanceTerminalNode = Readonly<{
  id: string;
  title: string;
  format: string;
  claimGenerator: string | null;
  validationState: string;
  signingTime: string | null;
}>;

export type ProvenanceGraph = Readonly<{
  hasHistory: boolean;
  ingredients: readonly ProvenanceIngredientNode[];
  actions: readonly ProvenanceActionStep[];
  terminal: ProvenanceTerminalNode;
  softwareAgents: readonly string[];
  genesisAction: ProvenanceActionStep | null;
  totalSteps: number;
}>;

const MAX_TEXT = 200;
const MAX_ACTIONS = 60;
const MAX_INGREDIENTS = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLen = MAX_TEXT): string | null {
  return typeof value === 'string' ? sanitizeUntrustedText(value, maxLen) : null;
}

export function classifyAction(actionCode: string): {
  category: ProvenanceActionCategory;
  categoryLabel: string;
} {
  const code = actionCode.toLowerCase();

  if (code.includes('created') || code.includes('genesis') || code.includes('capture')) {
    return { category: 'genesis', categoryLabel: 'Asset Genesis' };
  }
  if (code.includes('crop') || code.includes('resize') || code.includes('orient') || code.includes('geom')) {
    return { category: 'crop_geometry', categoryLabel: 'Crop & Geometry' };
  }
  if (code.includes('color') || code.includes('tone') || code.includes('adjust') || code.includes('contrast')) {
    return { category: 'color_tone', categoryLabel: 'Color & Tone Adjustment' };
  }
  if (code.includes('filter') || code.includes('blur') || code.includes('sharpen') || code.includes('noise')) {
    return { category: 'filter', categoryLabel: 'Filter Process' };
  }
  if (code.includes('draw') || code.includes('paint') || code.includes('brush') || code.includes('text')) {
    return { category: 'drawing', categoryLabel: 'Vector & Drawing' };
  }
  if (code.includes('placed') || code.includes('composite') || code.includes('layer') || code.includes('blend')) {
    return { category: 'layer_composite', categoryLabel: 'Composite Layer' };
  }
  if (code.includes('ai') || code.includes('generate') || code.includes('inpaint') || code.includes('algorithmic')) {
    return { category: 'ai_algorithmic', categoryLabel: 'Generative AI Step' };
  }

  return { category: 'general_edit', categoryLabel: 'Manifest Action' };
}

function extractParameters(raw: unknown): Record<string, string | number | boolean> | null {
  if (!isRecord(raw)) {
    return null;
  }

  const result: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [key, val] of Object.entries(raw)) {
    if (count >= 10) break;
    const sanitizedKey = safeText(key, 40);
    if (!sanitizedKey) continue;

    if (typeof val === 'string') {
      const sanitizedVal = safeText(val, 100);
      if (sanitizedVal !== null) {
        result[sanitizedKey] = sanitizedVal;
        count += 1;
      }
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      result[sanitizedKey] = val;
      count += 1;
    } else if (typeof val === 'boolean') {
      result[sanitizedKey] = val;
      count += 1;
    }
  }

  return count > 0 ? result : null;
}

export function extractProvenanceGraph(
  rawStore: unknown,
  activeStore?: MappedC2paStore | null,
): ProvenanceGraph {
  const ingredients: ProvenanceIngredientNode[] = [];
  const actions: ProvenanceActionStep[] = [];
  const softwareAgentsSet = new Set<string>();

  let terminalTitle = 'Current Asset';
  let terminalFormat = 'image/jpeg';
  let terminalGenerator: string | null = null;
  let validationState = 'Unknown';
  let signingTime: string | null = null;

  if (activeStore) {
    if (activeStore.title) terminalTitle = activeStore.title;
    if (activeStore.format) terminalFormat = activeStore.format;
    terminalGenerator = activeStore.claimGenerator;
    if (activeStore.validationState) validationState = activeStore.validationState;
    if (activeStore.signatureInfo?.time) signingTime = activeStore.signatureInfo.time;
  }

  if (isRecord(rawStore)) {
    const rawManifests = rawStore['manifests'];

    if (isRecord(rawManifests)) {
      // Find active manifest or candidates
      const activeLabel = safeText(rawStore['active_manifest']);
      const manifestEntries = Object.entries(rawManifests);

      for (const [manifestKey, manifestValue] of manifestEntries) {
        if (!isRecord(manifestValue)) continue;

        const isCurrent = activeLabel === manifestKey || manifestEntries.length === 1;

        if (isCurrent) {
          if (typeof manifestValue['title'] === 'string') {
            terminalTitle = safeText(manifestValue['title']) ?? terminalTitle;
          }
          if (typeof manifestValue['format'] === 'string') {
            terminalFormat = safeText(manifestValue['format']) ?? terminalFormat;
          }
          if (!terminalGenerator && typeof manifestValue['claim_generator'] === 'string') {
            terminalGenerator = safeText(manifestValue['claim_generator']);
          }
          if (isRecord(manifestValue['signature_info']) && !signingTime) {
            signingTime = safeText(manifestValue['signature_info']['time']);
          }
        }

        // Extract ingredients
        const rawIngredients = manifestValue['ingredients'];
        if (Array.isArray(rawIngredients)) {
          for (const rawIng of rawIngredients) {
            if (!isRecord(rawIng) || ingredients.length >= MAX_INGREDIENTS) continue;

            const title = safeText(rawIng['title']) ?? 'Source Ingredient';
            const relationship = safeText(rawIng['relationship']) ?? 'parentOf';
            const format = safeText(rawIng['format']);
            const instanceId = safeText(rawIng['instance_id']);
            const documentId = safeText(rawIng['document_id']);
            const status = safeText(rawIng['validation_status']);

            ingredients.push({
              id: instanceId ?? `ing_${ingredients.length + 1}`,
              title,
              relationship,
              format,
              instanceId,
              documentId,
              validationStatus: status,
              isRoot: relationship === 'parentOf',
            });
          }
        }

        // Extract actions assertions
        const assertions = manifestValue['assertions'];
        if (Array.isArray(assertions)) {
          for (const assertion of assertions) {
            if (!isRecord(assertion)) continue;
            const label = safeText(assertion['label']);
            if (!label || !/^c2pa\.actions(\.v\d+)?$/.test(label)) continue;

            const data = assertion['data'];
            if (!isRecord(data)) continue;

            const actionList = data['actions'];
            if (!Array.isArray(actionList)) continue;

            for (const item of actionList) {
              if (!isRecord(item) || actions.length >= MAX_ACTIONS) continue;

              const actionCode = safeText(item['action'] ?? item['actionCode']);
              if (!actionCode) continue;

              const { category, categoryLabel } = classifyAction(actionCode);
              const softwareAgent = safeText(item['softwareAgent'] ?? item['software_agent']);
              if (softwareAgent) softwareAgentsSet.add(softwareAgent);

              const when = safeText(item['when']);
              const description = safeText(item['description']);
              const digitalSourceType = safeText(item['digitalSourceType']);
              const parameters = extractParameters(item['parameters']);

              actions.push({
                id: `act_${actions.length + 1}`,
                sequenceIndex: actions.length + 1,
                actionCode,
                category,
                categoryLabel,
                softwareAgent,
                when,
                description,
                digitalSourceType,
                parameters,
              });
            }
          }
        }

        // Extract from direct manifest actions if assertions did not supply actions
        const directActions = manifestValue['actions'];
        if (Array.isArray(directActions) && actions.length === 0) {
          for (const item of directActions) {
            if (!isRecord(item) || actions.length >= MAX_ACTIONS) continue;
            const actionCode = safeText(item['action'] ?? item['actionCode']);
            if (!actionCode) continue;

            const { category, categoryLabel } = classifyAction(actionCode);
            const softwareAgent = safeText(item['softwareAgent'] ?? item['software_agent']);
            if (softwareAgent) softwareAgentsSet.add(softwareAgent);

            const when = safeText(item['when']);
            const description = safeText(item['description']);
            const digitalSourceType = safeText(item['digitalSourceType']);
            const parameters = extractParameters(item['parameters']);

            actions.push({
              id: `act_${actions.length + 1}`,
              sequenceIndex: actions.length + 1,
              actionCode,
              category,
              categoryLabel,
              softwareAgent,
              when,
              description,
              digitalSourceType,
              parameters,
            });
          }
        }
      }
    }
  }

  // Fallback to activeStore actions if rawStore was empty
  if (actions.length === 0 && activeStore && activeStore.actions.length > 0) {
    for (const [index, action] of activeStore.actions.entries()) {
      const { category, categoryLabel } = classifyAction(action.actionCode);
      actions.push({
        id: `act_${index + 1}`,
        sequenceIndex: index + 1,
        actionCode: action.actionCode,
        category,
        categoryLabel,
        softwareAgent: null,
        when: null,
        description: null,
        digitalSourceType: null,
        parameters: null,
      });
    }
  }

  // Fallback to activeStore ingredients if rawStore ingredients was empty
  if (ingredients.length === 0 && activeStore && activeStore.ingredients.length > 0) {
    for (const [index, ing] of activeStore.ingredients.entries()) {
      ingredients.push({
        id: `ing_${index + 1}`,
        title: ing.title ?? 'Source Ingredient',
        relationship: ing.relationship ?? 'parentOf',
        format: null,
        instanceId: null,
        documentId: null,
        validationStatus: null,
        isRoot: true,
      });
    }
  }

  const genesisAction = (actions.find((a) => a.category === 'genesis') ?? actions[0]) ?? null;

  const terminal: ProvenanceTerminalNode = {
    id: 'terminal_current',
    title: terminalTitle,
    format: terminalFormat,
    claimGenerator: terminalGenerator,
    validationState,
    signingTime,
  };

  return {
    hasHistory: ingredients.length > 0 || actions.length > 0,
    ingredients,
    actions,
    terminal,
    softwareAgents: Array.from(softwareAgentsSet),
    genesisAction,
    totalSteps: ingredients.length + actions.length,
  };
}
