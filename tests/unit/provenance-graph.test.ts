import { describe, expect, it } from 'vitest';
import {
  classifyAction,
  extractProvenanceGraph,
} from '@/lib/c2pa/provenance-graph';

describe('C2PA Provenance Graph & Lineage Reconstruction (Feature 5)', () => {
  it('classifies various C2PA actions into appropriate categories', () => {
    expect(classifyAction('c2pa.created').category).toBe('genesis');
    expect(classifyAction('c2pa.cropped').category).toBe('crop_geometry');
    expect(classifyAction('c2pa.resized').category).toBe('crop_geometry');
    expect(classifyAction('c2pa.color_adjusted').category).toBe('color_tone');
    expect(classifyAction('c2pa.filtered').category).toBe('filter');
    expect(classifyAction('c2pa.drawing').category).toBe('drawing');
    expect(classifyAction('c2pa.placed').category).toBe('layer_composite');
    expect(classifyAction('c2pa.generate').category).toBe('ai_algorithmic');
    expect(classifyAction('c2pa.unknown_action').category).toBe('general_edit');
  });

  it('extracts complete lineage from a C2PA manifest store with ingredients and actions', () => {
    const rawStore = {
      active_manifest: 'urn:uuid:active-123',
      manifests: {
        'urn:uuid:active-123': {
          title: 'final-composite.jpg',
          format: 'image/jpeg',
          claim_generator: 'Adobe Photoshop 2024',
          signature_info: {
            time: '2024-05-15T14:30:00Z',
          },
          ingredients: [
            {
              title: 'background.png',
              relationship: 'parentOf',
              format: 'image/png',
              instance_id: 'xmp:iid:1111',
            },
            {
              title: 'overlay-logo.svg',
              relationship: 'componentOf',
              format: 'image/svg+xml',
              instance_id: 'xmp:iid:2222',
            },
          ],
          assertions: [
            {
              label: 'c2pa.actions.v2',
              data: {
                actions: [
                  {
                    action: 'c2pa.created',
                    softwareAgent: 'Photoshop Camera',
                    when: '2024-05-10T10:00:00Z',
                  },
                  {
                    action: 'c2pa.cropped',
                    softwareAgent: 'Adobe Photoshop 2024',
                    parameters: {
                      width: 1920,
                      height: 1080,
                    },
                  },
                  {
                    action: 'c2pa.color_adjusted',
                    softwareAgent: 'Lightroom',
                    description: 'Applied warm preset',
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const graph = extractProvenanceGraph(rawStore);

    expect(graph.hasHistory).toBe(true);
    expect(graph.ingredients).toHaveLength(2);
    expect(graph.actions).toHaveLength(3);

    // Verify ingredients
    expect(graph.ingredients[0]?.title).toBe('background.png');
    expect(graph.ingredients[0]?.relationship).toBe('parentOf');
    expect(graph.ingredients[0]?.isRoot).toBe(true);
    expect(graph.ingredients[1]?.title).toBe('overlay-logo.svg');

    // Verify actions
    expect(graph.actions[0]?.actionCode).toBe('c2pa.created');
    expect(graph.actions[0]?.category).toBe('genesis');
    expect(graph.actions[0]?.softwareAgent).toBe('Photoshop Camera');

    expect(graph.actions[1]?.actionCode).toBe('c2pa.cropped');
    expect(graph.actions[1]?.category).toBe('crop_geometry');
    expect(graph.actions[1]?.parameters).toEqual({ width: 1920, height: 1080 });

    expect(graph.actions[2]?.actionCode).toBe('c2pa.color_adjusted');
    expect(graph.actions[2]?.description).toBe('Applied warm preset');

    // Software agents set
    expect(graph.softwareAgents).toContain('Photoshop Camera');
    expect(graph.softwareAgents).toContain('Adobe Photoshop 2024');
    expect(graph.softwareAgents).toContain('Lightroom');

    // Terminal node
    expect(graph.terminal.title).toBe('final-composite.jpg');
    expect(graph.terminal.signingTime).toBe('2024-05-15T14:30:00Z');
  });

  it('handles empty or malformed manifest store gracefully', () => {
    const graph = extractProvenanceGraph(null);
    expect(graph.hasHistory).toBe(false);
    expect(graph.ingredients).toHaveLength(0);
    expect(graph.actions).toHaveLength(0);
    expect(graph.genesisAction).toBeNull();
  });

  it('extracts actions from direct manifest actions array when assertions are omitted', () => {
    const rawStore = {
      active_manifest: 'active',
      manifests: {
        active: {
          title: 'edited.png',
          actions: [
            { action: 'c2pa.cropped', softwareAgent: 'Web Editor' },
            { action: 'c2pa.color_adjusted' },
          ],
          ingredients: [
            { title: 'raw.png', relationship: 'parentOf' },
          ],
        },
      },
    };

    const graph = extractProvenanceGraph(rawStore);
    expect(graph.hasHistory).toBe(true);
    expect(graph.actions).toHaveLength(2);
    expect(graph.actions[0]?.actionCode).toBe('c2pa.cropped');
    expect(graph.actions[0]?.category).toBe('crop_geometry');
    expect(graph.actions[0]?.softwareAgent).toBe('Web Editor');
    expect(graph.actions[1]?.actionCode).toBe('c2pa.color_adjusted');
    expect(graph.actions[1]?.category).toBe('color_tone');
    expect(graph.ingredients).toHaveLength(1);
  });
});
