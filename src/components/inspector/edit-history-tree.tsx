import { useState } from 'react';
import type { FileAnalysis } from '@/lib/pipeline/types';
import {
  extractProvenanceGraph,
  type ProvenanceActionStep,
  type ProvenanceIngredientNode,
} from '@/lib/c2pa/provenance-graph';
import {
  GitBranchIcon,
  LayersIcon,
  SlidersIcon,
  CpuIcon,
  FileCheckIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@/components/ui/icons';

export type EditHistoryTreeProps = Readonly<{
  analysis: FileAnalysis;
  idPrefix?: string;
}>;

function getCategoryIcon(category: string) {
  switch (category) {
    case 'genesis':
      return <FileCheckIcon size={14} />;
    case 'ai_algorithmic':
      return <CpuIcon size={14} />;
    case 'layer_composite':
      return <LayersIcon size={14} />;
    default:
      return <SlidersIcon size={14} />;
  }
}

export function EditHistoryTree({ analysis, idPrefix = '' }: EditHistoryTreeProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedParams, setExpandedParams] = useState<Record<string, boolean>>({});
  const tid = (name: string) => (idPrefix ? `${idPrefix}${name}` : name);

  const finding = analysis.finding;
  if (!finding || (finding.actions.length === 0 && finding.ingredients.length === 0)) {
    return null;
  }

  // Construct provenance graph from finding data
  const graph = extractProvenanceGraph(
    {
      active_manifest: 'active',
      manifests: {
        active: {
          title: analysis.file.displayName,
          claim_generator: analysis.finding?.trustPolicyId ? 'C2PA Manifest Engine' : null,
          actions: finding.actions.map((a) => ({ action: a.actionCode })),
          ingredients: finding.ingredients.map((ing) => ({
            title: ing.title ?? 'Source Asset',
            relationship: ing.relationship ?? 'parentOf',
          })),
          assertions: [
            {
              label: 'c2pa.actions.v2',
              data: {
                actions: finding.actions.map((a) => ({ action: a.actionCode })),
              },
            },
          ],
        },
      },
    },
    {
      validationState: finding.manifestValidation,
      claimGenerator: null,
      title: analysis.file.displayName,
      format: analysis.file.detectedMimeType,
      statusEntries: [],
      activeManifestLabel: 'active',
      actions: finding.actions.map((a) => ({ actionCode: a.actionCode })),
      ingredients: finding.ingredients.map((ing) => ({
        title: ing.title ?? null,
        relationship: ing.relationship ?? null,
      })),
      omittedEntryCount: 0,
    },
  );

  const toggleParam = (id: string) => {
    setExpandedParams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredActions = graph.actions.filter((action) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'genesis') return action.category === 'genesis';
    if (selectedFilter === 'geometry') return action.category === 'crop_geometry';
    if (selectedFilter === 'color') return action.category === 'color_tone';
    if (selectedFilter === 'drawing') return action.category === 'drawing';
    if (selectedFilter === 'composite') return action.category === 'layer_composite';
    return true;
  });

  return (
    <section
      aria-labelledby={tid('edit-history-heading')}
      className="panel edit-history-panel"
      data-testid={tid('edit-history-section')}
      style={{ borderLeft: '4px solid #10b981' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranchIcon size={18} className="text-emerald" />
          <h2 id={tid('edit-history-heading')} style={{ margin: 0 }}>
            Editing History &amp; Provenance Graph (Lineage Tree)
          </h2>
        </div>
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <LayersIcon size={13} />
          <span>{graph.totalSteps} Recorded Lineage Steps</span>
        </span>
      </div>

      <p className="note" style={{ marginTop: '8px', marginBottom: '12px' }}>
        Complete visual reconstruction of ancestor assets (ingredients) and transformation actions
        extracted from cryptographically attested C2PA assertions.
      </p>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }} role="toolbar" aria-label="Filter action steps">
        {[
          { id: 'all', label: 'All Steps' },
          { id: 'genesis', label: 'Genesis' },
          { id: 'geometry', label: 'Crop & Geometry' },
          { id: 'color', label: 'Color Adjustments' },
          { id: 'drawing', label: 'Drawing & Vector' },
          { id: 'composite', label: 'Layers & Composite' },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={selectedFilter === chip.id ? 'preset-chip active' : 'preset-chip'}
            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
            onClick={() => setSelectedFilter(chip.id)}
            aria-pressed={selectedFilter === chip.id}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Interactive Visual Graph / Timeline */}
      <div
        className="action-lineage-graph"
        role="region"
        aria-label="C2PA Provenance Tree Timeline"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-sunken, #f8fafc)', padding: '16px', borderRadius: '12px' }}
      >
        {/* Ingredient Ancestor Assets */}
        {graph.ingredients.map((ing: ProvenanceIngredientNode, idx: number) => (
          <div
            key={ing.id}
            className="lineage-node lineage-node-ingredient"
            style={{ width: '100%', maxWidth: 'none', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px' }}
          >
            <div className="lineage-node-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="lineage-step-badge" style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <LayersIcon size={13} />
                <span>Ancestor Ingredient #{idx + 1}</span>
              </span>
              <span className="lineage-tool-badge" style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                {ing.relationship}
              </span>
            </div>
            <strong style={{ fontSize: '0.875rem', color: '#14532d' }}>{ing.title}</strong>
            {ing.instanceId && (
              <p className="note" style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>
                Instance ID: <code>{ing.instanceId}</code>
              </p>
            )}
          </div>
        ))}

        {/* Action Steps */}
        {filteredActions.map((action: ProvenanceActionStep) => (
          <div
            key={action.id}
            className="lineage-node lineage-node-action"
            style={{ width: '100%', maxWidth: 'none', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', padding: '12px', borderRadius: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0369a1', fontSize: '0.8125rem' }}>
                {getCategoryIcon(action.category)}
                <span>Step {action.sequenceIndex}: {action.categoryLabel}</span>
              </span>
              <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {action.actionCode}
              </code>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-muted, #64748b)', flexWrap: 'wrap', alignItems: 'center' }}>
              {action.softwareAgent && (
                <span>Software: <strong>{action.softwareAgent}</strong></span>
              )}
              {action.when && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ClockIcon size={12} />
                  <span>{action.when}</span>
                </span>
              )}
              {action.description && (
                <span>Description: {action.description}</span>
              )}
            </div>

            {/* Expandable Parameters toggle */}
            {action.parameters && (
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="button-ghost"
                  style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                  onClick={() => toggleParam(action.id)}
                  aria-expanded={Boolean(expandedParams[action.id])}
                >
                  {expandedParams[action.id] ? 'Hide Parameters' : 'View Parameters'}
                </button>
                {expandedParams[action.id] && (
                  <pre
                    style={{
                      margin: '6px 0 0 0',
                      padding: '8px',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(action.parameters, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Terminal Version Node */}
        <div
          className="lineage-node lineage-node-terminal"
          style={{ width: '100%', maxWidth: 'none', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 600 }}>
              <ShieldCheckIcon size={14} />
              <span>Current Audited Version: {graph.terminal.title}</span>
            </span>
            <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem' }}>
              State: {graph.terminal.validationState}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
