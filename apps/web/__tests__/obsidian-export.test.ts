import { createHash } from 'node:crypto';
import type { GraphNode } from '@highport/shared/types/graph';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { exportObsidianVault } from '../lib/obsidian-export';

const EXPORTED_AT = '2026-01-01T00:00:00.000Z';

function makeNode(overrides: Partial<GraphNode> & Pick<GraphNode, 'id' | 'label'>): GraphNode {
  return {
    id: overrides.id,
    type: overrides.type ?? 'npc',
    label: overrides.label,
    position: overrides.position ?? { x: 0, y: 0 },
    metadata: overrides.metadata ?? {},
    locked: overrides.locked ?? false,
    hidden: overrides.hidden ?? false,
    created_at: overrides.created_at ?? Date.UTC(2026, 0, 1),
    created_by: overrides.created_by ?? 'tester',
  };
}

async function exportAndOpenZip(nodes: GraphNode[]) {
  const bytes = await exportObsidianVault(nodes, 'campaign-123', EXPORTED_AT);
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files).sort();
  const digest = createHash('sha256').update(bytes).digest('hex');

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('manifest.json missing');
  }

  const manifestText = await manifestFile.async('string');
  const manifest = JSON.parse(manifestText) as {
    version: number;
    exportedAt: string;
    campaignId: string;
    entities: Array<{ id: string; slug: string; label: string; type: string; checksum: string }>;
  };

  return { zip, files, digest, manifest };
}

describe('exportObsidianVault', () => {
  it('is deterministic and includes sorted notes plus manifest', async () => {
    const nodes = [
      makeNode({ id: '2', label: 'Beta Node' }),
      makeNode({ id: '1', label: 'Alpha Node' }),
    ];

    const runA = await exportAndOpenZip(nodes);
    const runB = await exportAndOpenZip(nodes);

    expect(runA.digest).toBe(runB.digest);
    expect(runA.files).toEqual([
      'manifest.json',
      'notes/',
      'notes/alpha-node.md',
      'notes/beta-node.md',
    ]);
    expect(runA.manifest).toEqual({
      version: 1,
      exportedAt: EXPORTED_AT,
      campaignId: 'campaign-123',
      entities: [
        expect.objectContaining({ id: '1', slug: 'alpha-node', label: 'Alpha Node', type: 'npc' }),
        expect.objectContaining({ id: '2', slug: 'beta-node', label: 'Beta Node', type: 'npc' }),
      ],
    });

    for (const entity of runA.manifest.entities) {
      expect(entity.checksum).toMatch(/^[a-f0-9]{8}$/);
    }
  });

  it('writes required markdown structure and preserves wikilinks', async () => {
    const nodes = [
      makeNode({
        id: 'n1',
        label: 'Jexa Varn',
        type: 'traveller',
        created_at: Date.UTC(2026, 0, 1),
        metadata: {
          description: 'Free trader captain',
          content: 'Rumors mention [[The Last Orbit]] and [[Drinax]].',
          tags: ['captain', 'free-trader'],
          aliases: ['Jexa', 'Varn'],
          updated_at: Date.UTC(2026, 0, 2),
        },
      }),
    ];

    const { zip } = await exportAndOpenZip(nodes);
    const noteFile = zip.file('notes/jexa-varn.md');
    if (!noteFile) {
      throw new Error('notes/jexa-varn.md missing');
    }
    const markdown = await noteFile.async('string');

    expect(markdown).toContain('---\nid: "n1"');
    expect(markdown).toContain('type: "traveller"');
    expect(markdown).toContain('tags:');
    expect(markdown).toContain('- "captain"');
    expect(markdown).toContain('aliases:');
    expect(markdown).toContain('- "Jexa"');
    expect(markdown).toContain('created_at: "2026-01-01T00:00:00.000Z"');
    expect(markdown).toContain('updated_at: "2026-01-02T00:00:00.000Z"');
    expect(markdown).toContain('# Jexa Varn');
    expect(markdown).toContain('## Description');
    expect(markdown).toContain('Free trader captain');
    expect(markdown).toContain('## Content');
    expect(markdown).toContain('Rumors mention [[The Last Orbit]] and [[Drinax]].');
  });

  it('disambiguates duplicate slugs in deterministic order', async () => {
    const nodes = [
      makeNode({ id: 'a', label: 'The Broker' }),
      makeNode({ id: 'b', label: 'the-broker' }),
      makeNode({ id: 'c', label: 'The Broker' }),
    ];

    const { files, manifest } = await exportAndOpenZip(nodes);

    expect(files).toEqual([
      'manifest.json',
      'notes/',
      'notes/the-broker-2.md',
      'notes/the-broker-3.md',
      'notes/the-broker.md',
    ]);
    expect(manifest.entities.map((entity) => entity.slug)).toEqual([
      'the-broker',
      'the-broker-2',
      'the-broker-3',
    ]);
  });
});
