import { sanitizeUntrustedText } from '@/lib/security/text';
import type {
  C2paRecordedAction,
  C2paRecordedIngredient,
  C2paSignatureInfo,
  C2paStatusEntry,
  C2paStatusCodeGroup,
  MappedC2paStore,
} from './types';

/**
 * Narrows the SDK manifest store into the small projection the Evidence
 * Ledger uses. The input comes from untrusted file content, so every string is
 * sanitized and bounded, unknown shapes are skipped rather than interpreted,
 * and nothing here decides validity or trust.
 *
 * Unknown codes are preserved as codes. They are never mapped onto a
 * validation or trust state.
 */

const STATUS_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const ACTION_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const ACTIONS_ASSERTION_PATTERN = /^c2pa\.actions(\.v\d+)?$/;

const MAX_STATUS_ENTRIES = 50;
const MAX_ACTIONS = 50;
const MAX_INGREDIENTS = 50;
const MAX_ASSERTIONS = 100;
const MAX_MANIFEST_CANDIDATES = 32;

const MAX_CODE_LENGTH = 80;
const MAX_STATE_LENGTH = 40;
const MAX_EXPLANATION_LENGTH = 300;
const MAX_REFERENCE_LENGTH = 300;
const MAX_TEXT_LENGTH = 200;

const STATUS_GROUPS: readonly C2paStatusCodeGroup[] = [
  'success',
  'informational',
  'failure',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' ? sanitizeUntrustedText(value, maxLength) : null;
}

function readCode(value: unknown, pattern: RegExp): string | null {
  const text = readText(value, MAX_CODE_LENGTH);

  return text !== null && pattern.test(text) ? text : null;
}

function readStatusEntry(
  item: unknown,
  group: C2paStatusCodeGroup,
): C2paStatusEntry | null {
  if (!isRecord(item)) {
    return null;
  }

  const code = readCode(item['code'], STATUS_CODE_PATTERN);

  if (code === null) {
    return null;
  }

  return {
    code,
    group,
    explanation: readText(item['explanation'], MAX_EXPLANATION_LENGTH),
    url: readText(item['url'], MAX_REFERENCE_LENGTH),
  };
}

type StatusRead = Readonly<{ entries: C2paStatusEntry[]; dropped: number }>;

function readStatusList(value: unknown, group: C2paStatusCodeGroup): StatusRead {
  if (!Array.isArray(value)) {
    return { entries: [], dropped: 0 };
  }

  const entries: C2paStatusEntry[] = [];
  let dropped = 0;

  for (const item of value) {
    const entry = readStatusEntry(item, group);

    if (entry === null) {
      dropped += 1;
    } else {
      entries.push(entry);
    }
  }

  return { entries, dropped };
}

/**
 * The store-level `validation_status` duplicates the per-manifest results in
 * the pinned SDK version. It is read as a fallback source only, and a missing
 * `success` flag is treated as informational rather than guessed.
 */
function readStoreStatuses(value: unknown): StatusRead {
  if (value === undefined || value === null) {
    return { entries: [], dropped: 0 };
  }

  const list = Array.isArray(value) ? value : [value];
  const entries: C2paStatusEntry[] = [];
  let dropped = 0;

  for (const item of list) {
    const success = isRecord(item) ? item['success'] : undefined;
    const group: C2paStatusCodeGroup =
      success === true ? 'success' : success === false ? 'failure' : 'informational';
    const entry = readStatusEntry(item, group);

    if (entry === null) {
      dropped += 1;
    } else {
      entries.push(entry);
    }
  }

  return { entries, dropped };
}

function dedupeStatuses(entries: readonly C2paStatusEntry[]): C2paStatusEntry[] {
  const seen = new Set<string>();
  const unique: C2paStatusEntry[] = [];

  for (const entry of entries) {
    if (seen.has(entry.code)) {
      continue;
    }

    seen.add(entry.code);
    unique.push(entry);
  }

  return unique;
}

type ActionsRead = Readonly<{ actions: C2paRecordedAction[]; dropped: number }>;

function readActions(manifest: Record<string, unknown>): ActionsRead {
  const assertions = manifest['assertions'];

  if (!Array.isArray(assertions)) {
    return { actions: [], dropped: 0 };
  }

  const actions: C2paRecordedAction[] = [];
  let dropped = 0;

  for (const assertion of assertions.slice(0, MAX_ASSERTIONS)) {
    if (!isRecord(assertion)) {
      continue;
    }

    const label = readText(assertion['label'], MAX_CODE_LENGTH);

    if (label === null || !ACTIONS_ASSERTION_PATTERN.test(label)) {
      continue;
    }

    const data = assertion['data'];

    if (!isRecord(data)) {
      continue;
    }

    const list = data['actions'];

    if (!Array.isArray(list)) {
      continue;
    }

    for (const item of list) {
      const code = isRecord(item) ? readCode(item['action'], ACTION_CODE_PATTERN) : null;

      if (code === null) {
        dropped += 1;
        continue;
      }

      if (actions.length >= MAX_ACTIONS) {
        dropped += 1;
        continue;
      }

      actions.push({ actionCode: code });
    }
  }

  return { actions, dropped };
}

type IngredientsRead = Readonly<{
  ingredients: C2paRecordedIngredient[];
  dropped: number;
}>;

function readIngredients(manifest: Record<string, unknown>): IngredientsRead {
  const value = manifest['ingredients'];

  if (!Array.isArray(value)) {
    return { ingredients: [], dropped: 0 };
  }

  const ingredients: C2paRecordedIngredient[] = [];
  let dropped = 0;

  for (const item of value) {
    if (!isRecord(item)) {
      dropped += 1;
      continue;
    }

    const relationship = readText(item['relationship'], MAX_CODE_LENGTH);
    const title = readText(item['title'], MAX_TEXT_LENGTH);

    if (relationship === null && title === null) {
      dropped += 1;
      continue;
    }

    if (ingredients.length >= MAX_INGREDIENTS) {
      dropped += 1;
      continue;
    }

    ingredients.push({ relationship, title });
  }

  return { ingredients, dropped };
}

type ResolvedManifest = Readonly<{
  manifest: Record<string, unknown> | null;
  label: string | null;
}>;

function resolveActiveManifest(store: Record<string, unknown>): ResolvedManifest {
  const manifests = store['manifests'];

  if (!isRecord(manifests)) {
    return { manifest: null, label: null };
  }

  const activeLabel = readText(store['active_manifest'], MAX_TEXT_LENGTH);

  if (activeLabel !== null) {
    const candidate = manifests[activeLabel];

    if (isRecord(candidate)) {
      return { manifest: candidate, label: activeLabel };
    }
  }

  const keys = Object.keys(manifests).slice(0, MAX_MANIFEST_CANDIDATES);

  if (keys.length !== 1) {
    return { manifest: null, label: null };
  }

  const onlyKey = keys[0];
  const onlyManifest = onlyKey === undefined ? undefined : manifests[onlyKey];

  if (!isRecord(onlyManifest)) {
    return { manifest: null, label: null };
  }

  return { manifest: onlyManifest, label: onlyKey === undefined ? null : readText(onlyKey, MAX_TEXT_LENGTH) };
}

function readSignatureInfo(manifest: Record<string, unknown>): C2paSignatureInfo | null {
  const info = manifest['signature_info'];

  if (!isRecord(info)) {
    return null;
  }

  return {
    algorithm: readText(info['alg'], MAX_CODE_LENGTH),
    issuer: readText(info['issuer'], MAX_TEXT_LENGTH),
    commonName: readText(info['common_name'], MAX_TEXT_LENGTH),
    serialNumber: readText(info['cert_serial_number'], MAX_TEXT_LENGTH),
    time: readText(info['time'], MAX_TEXT_LENGTH),
  };
}

function mapStore(raw: unknown): MappedC2paStore | null {
  if (!isRecord(raw)) {
    return null;
  }

  let omittedEntryCount = 0;
  const collected: C2paStatusEntry[] = [];

  const results = raw['validation_results'];

  if (isRecord(results) && isRecord(results['activeManifest'])) {
    const activeManifest = results['activeManifest'];

    for (const group of STATUS_GROUPS) {
      const read = readStatusList(activeManifest[group], group);
      collected.push(...read.entries);
      omittedEntryCount += read.dropped;
    }
  }

  const storeStatuses = readStoreStatuses(raw['validation_status']);
  collected.push(...storeStatuses.entries);
  omittedEntryCount += storeStatuses.dropped;

  const unique = dedupeStatuses(collected);

  if (unique.length > MAX_STATUS_ENTRIES) {
    omittedEntryCount += unique.length - MAX_STATUS_ENTRIES;
  }

  const resolved = resolveActiveManifest(raw);
  const manifest = resolved.manifest;

  const actionsRead: ActionsRead =
    manifest === null ? { actions: [], dropped: 0 } : readActions(manifest);
  const ingredientsRead: IngredientsRead =
    manifest === null ? { ingredients: [], dropped: 0 } : readIngredients(manifest);

  omittedEntryCount += actionsRead.dropped + ingredientsRead.dropped;

  return {
    validationState: readText(raw['validation_state'], MAX_STATE_LENGTH),
    statusEntries: unique.slice(0, MAX_STATUS_ENTRIES),
    claimGenerator: manifest === null ? null : readText(manifest['claim_generator'], MAX_TEXT_LENGTH),
    title: manifest === null ? null : readText(manifest['title'], MAX_TEXT_LENGTH),
    format: manifest === null ? null : readText(manifest['format'], MAX_CODE_LENGTH),
    activeManifestLabel: resolved.label,
    actions: actionsRead.actions,
    ingredients: ingredientsRead.ingredients,
    signatureInfo: manifest === null ? null : readSignatureInfo(manifest),
    omittedEntryCount,
  };
}

/**
 * Returns `null` only when the SDK output cannot be read as a manifest store at
 * all. That is an execution failure for the caller, never a "no credential"
 * finding.
 */
export function mapManifestStore(raw: unknown): MappedC2paStore | null {
  try {
    return mapStore(raw);
  } catch {
    return null;
  }
}
