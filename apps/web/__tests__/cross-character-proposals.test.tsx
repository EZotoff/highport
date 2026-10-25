import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  createSession,
  addCrossCharacterLink,
  getCrossCharacterLinks,
  acceptCrossCharacterLink,
  removeCrossCharacterLink,
  createCharacter,
  getCharacter,
  resolveCrossCharacterLink,
} from '../lib/chargen/state';
import { createCharacterNode } from '../lib/chargen/finalize';
import { getNodesMap, getEdgesMap, getYDoc } from '../lib/ydoc';
import CrossCharacterProposalList from '../components/chargen/CrossCharacterProposalList';
import { useCrossCharacterLinks, useAllCharacters } from '../lib/chargen/hooks';
import type { ChargenCharacter, CrossCharacterLinkProposal } from '../lib/chargen/types';

// Mock the hooks for component testing
vi.mock('../lib/chargen/hooks', () => ({
  useCrossCharacterLinks: vi.fn(),
  useAllCharacters: vi.fn(),
}));

vi.mock('../lib/ydoc', async () => {
  const actual = await vi.importActual<typeof import('../lib/ydoc')>('../lib/ydoc');
  return {
    ...actual,
    getYDoc: vi.fn(),
  };
});

describe('Cross-character link player-to-player flow', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    createSession(doc, 'campaign-123', 'gm-user-1');
  });
  it('handles dual acceptance correctly', async () => {
    const linkId = addCrossCharacterLink(doc, {
      sourceCharId: 'char-1',
      targetCharId: 'char-2',
      relationship: 'Rival',
      description: 'Competed for the same promotion.',
    });

    // Initially pending, acceptedBy is empty/undefined
    let links = getCrossCharacterLinks(doc);
    expect(links[0].status).toBe('pending');
    expect(links[0].acceptedBy).toBeUndefined();

    // Player 1 accepts
    await acceptCrossCharacterLink(doc, linkId, 'char-1');
    links = getCrossCharacterLinks(doc);
    expect(links[0].status).toBe('pending');
    expect(links[0].acceptedBy).toEqual(['char-1']);

    // Player 1 accepts again (should be no-op)
    await acceptCrossCharacterLink(doc, linkId, 'char-1');
    links = getCrossCharacterLinks(doc);
    expect(links[0].acceptedBy).toEqual(['char-1']);

    // Player 2 accepts -> status becomes accepted
    await acceptCrossCharacterLink(doc, linkId, 'char-2');
    links = getCrossCharacterLinks(doc);
    expect(links[0].status).toBe('accepted');
    expect(links[0].acceptedBy).toEqual(['char-1', 'char-2']);
  });

  it('creates graph edge when both accepted and both characters are finalized', async () => {
    // Create two characters in Yjs
    const char1Id = createCharacter(doc, 'player-1', 'Zara');
    const char2Id = createCharacter(doc, 'player-2', 'Milo');

    // Finalize both characters to create their graph nodes
    const node1 = createCharacterNode(getCharacter(doc, char1Id)!);
    const node2 = createCharacterNode(getCharacter(doc, char2Id)!);

    // Add cross-character link proposal
    const linkId = addCrossCharacterLink(doc, {
      sourceCharId: char1Id,
      targetCharId: char2Id,
      relationship: 'Rival',
      description: 'Competed for the same promotion.',
    });

    // Player 1 accepts
    await acceptCrossCharacterLink(doc, linkId, char1Id);
    let edges = getEdgesMap(doc);
    expect(edges.size).toBe(0); // No edge yet

    // Player 2 accepts -> edge should be created
    await acceptCrossCharacterLink(doc, linkId, char2Id);
    edges = getEdgesMap(doc);
    expect(edges.size).toBe(1);

    let edge: Y.Map<unknown> = new Y.Map();
    edges.forEach((e) => {
      edge = e;
    });
    expect(edge.get('source_id')).toBe(node1.graphNodeId);
    expect(edge.get('target_id')).toBe(node2.graphNodeId);
    expect(edge.get('relation_label')).toBe('Rival');
  });

  it('allows GM acceptance without player votes and couples rejection to the edge', async () => {
    // Given
    const source = createCharacter(doc, 'player-1', 'Zara');
    const target = createCharacter(doc, 'player-2', 'Milo');
    const a = getCharacter(doc, source);
    const b = getCharacter(doc, target);
    if (!a || !b) throw new Error('Missing fixture characters');
    createCharacterNode(a);
    createCharacterNode(b);
    const id = addCrossCharacterLink(doc, {
      sourceCharId: source,
      targetCharId: target,
      relationship: 'Rival',
      description: '',
    });
    // When / Then
    await resolveCrossCharacterLink(doc, id, true);
    expect(getCrossCharacterLinks(doc)[0].status).toBe('accepted');
    expect(getEdgesMap(doc).size).toBe(1);
    await resolveCrossCharacterLink(doc, id, false);
    expect(getCrossCharacterLinks(doc)[0].status).toBe('rejected');
    expect(getEdgesMap(doc).size).toBe(0);
  });

  it('repairs a missing edge when an already-recorded player accepts again', async () => {
    // Given
    const source = createCharacter(doc, 'player-1', 'Zara');
    const target = createCharacter(doc, 'player-2', 'Milo');
    const a = getCharacter(doc, source);
    const b = getCharacter(doc, target);
    if (!a || !b) throw new Error('Missing fixture characters');
    createCharacterNode(a);
    createCharacterNode(b);
    const id = addCrossCharacterLink(doc, {
      sourceCharId: source,
      targetCharId: target,
      relationship: 'Rival',
      description: '',
      acceptedBy: [source, target],
    });
    // When
    await acceptCrossCharacterLink(doc, id, source);
    // Then
    expect(getCrossCharacterLinks(doc)[0].status).toBe('accepted');
    expect(getEdgesMap(doc).size).toBe(1);
    const updates = vi.fn();
    doc.on('update', updates);
    await acceptCrossCharacterLink(doc, id, source);
    expect(updates).not.toHaveBeenCalled();
  });

  it('creates graph edge during finalization if link was already accepted', async () => {
    // Create two characters in Yjs
    const char1Id = createCharacter(doc, 'player-1', 'Zara');
    const char2Id = createCharacter(doc, 'player-2', 'Milo');

    // Add cross-character link proposal and accept it fully
    const linkId = addCrossCharacterLink(doc, {
      sourceCharId: char1Id,
      targetCharId: char2Id,
      relationship: 'Rival',
      description: 'Competed for the same promotion.',
    });
    await acceptCrossCharacterLink(doc, linkId, char1Id);
    await acceptCrossCharacterLink(doc, linkId, char2Id);

    // No edges yet because characters are not finalized
    let edges = getEdgesMap(doc);
    expect(edges.size).toBe(0);

    // Finalize Zara
    const node1 = createCharacterNode(getCharacter(doc, char1Id)!);
    edges = getEdgesMap(doc);
    expect(edges.size).toBe(0); // Still no edge because Milo is not finalized

    // Finalize Milo
    const node2 = createCharacterNode(getCharacter(doc, char2Id)!);
    edges = getEdgesMap(doc);
    expect(edges.size).toBe(1); // Edge should be created now!

    let edge: Y.Map<unknown> = new Y.Map();
    edges.forEach((e) => {
      edge = e;
    });
    expect(edge.get('source_id')).toBe(node2.graphNodeId);
    expect(edge.get('target_id')).toBe(node1.graphNodeId);
    expect(edge.get('relation_label')).toBe('Rival');
  });
});

describe('concurrent dual-acceptance across synced docs', () => {
  it('collapses concurrent finalization edges for the same finalized node pair', async () => {
    // Given: both replicas know the same finalized graph identities.
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(docA);
    const source = createCharacter(docA, 'player-1', 'Zara');
    const target = createCharacter(docA, 'player-2', 'Milo');
    const a = getCharacter(docA, source);
    const b = getCharacter(docA, target);
    if (!a || !b) throw new Error('Missing fixture characters');
    const sourceNodeId = '11111111-1111-4111-8111-111111111111';
    const targetNodeId = '22222222-2222-4222-8222-222222222222';
    const uuid = vi.spyOn(crypto, 'randomUUID');
    uuid.mockReturnValueOnce(sourceNodeId);
    createCharacterNode(a);
    uuid.mockReturnValueOnce(targetNodeId);
    createCharacterNode(b);
    addCrossCharacterLink(docA, {
      sourceCharId: source,
      targetCharId: target,
      relationship: 'Rival',
      description: '',
      acceptedBy: [source, target],
    });
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    // When: each replica finalizes one party while disconnected.
    try {
      uuid.mockReturnValueOnce(sourceNodeId);
      createCharacterNode(a);
      vi.mocked(getYDoc).mockReturnValue(docB);
      uuid.mockReturnValueOnce(targetNodeId);
      createCharacterNode(b);
    } finally {
      uuid.mockRestore();
    }
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    // Then
    expect(getEdgesMap(docA).size).toBe(1);
    expect(getEdgesMap(docB).size).toBe(1);
    docA.destroy();
    docB.destroy();
  });

  async function concurrentAcceptance() {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    createSession(docA, 'campaign-123', 'gm-user-1');
    const source = createCharacter(docA, 'player-1', 'Zara');
    const target = createCharacter(docA, 'player-2', 'Milo');
    vi.mocked(getYDoc).mockReturnValue(docA);
    const sourceCharacter = getCharacter(docA, source);
    const targetCharacter = getCharacter(docA, target);
    if (!sourceCharacter || !targetCharacter) throw new Error('Missing fixture characters');
    createCharacterNode(sourceCharacter);
    createCharacterNode(targetCharacter);
    const linkId = addCrossCharacterLink(docA, {
      sourceCharId: source,
      targetCharId: target,
      relationship: 'Rival',
      description: '',
    });
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    await acceptCrossCharacterLink(docA, linkId, source);
    await acceptCrossCharacterLink(docB, linkId, target);
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);
    Y.applyUpdate(docA, updateB);
    Y.applyUpdate(docB, updateA);
    const { reconcileCrossCharacterLinkEdges } = await import('../lib/chargen/state');
    expect(typeof reconcileCrossCharacterLinkEdges).toBe('function');
    reconcileCrossCharacterLinkEdges(docA);
    reconcileCrossCharacterLinkEdges(docB);
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    return { docA, docB, linkId, source, target };
  }

  it('converges to accepted with one edge when players accept offline', async () => {
    // Given / When: isolated accepts followed by merge and explicit repair.
    const { docA, docB, source, target } = await concurrentAcceptance();
    // Then
    for (const doc of [docA, docB]) {
      expect(getCrossCharacterLinks(doc)[0].acceptedBy?.sort()).toEqual([source, target].sort());
      expect(getCrossCharacterLinks(doc)[0].status).toBe('accepted');
      expect(getEdgesMap(doc).size).toBe(1);
      doc.destroy();
    }
  });

  it('removes the accepted edge when GM rejects after convergence', async () => {
    // Given
    const { docA, docB, linkId } = await concurrentAcceptance();
    // When
    await resolveCrossCharacterLink(docA, linkId, false);
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    // Then
    for (const doc of [docA, docB]) {
      expect(getCrossCharacterLinks(doc)[0].status).toBe('rejected');
      expect(getEdgesMap(doc).size).toBe(0);
      doc.destroy();
    }
  });
});

describe('CrossCharacterProposalList Component', () => {
  const mockCharacters: ChargenCharacter[] = [
    {
      id: 'char-1',
      playerId: 'player-1',
      name: 'Zara',
      characteristics: { STR: 7, DEX: 8, END: 9, INT: 10, EDU: 6, SOC: 7 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'finalized',
      skills: {},
      benefits: [],
      credits: 0,
      age: 18,
      spawnedEntityIds: [],
    },
    {
      id: 'char-2',
      playerId: 'player-2',
      name: 'Milo',
      characteristics: { STR: 7, DEX: 8, END: 9, INT: 10, EDU: 6, SOC: 7 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'finalized',
      skills: {},
      benefits: [],
      credits: 0,
      age: 18,
      spawnedEntityIds: [],
    },
  ];

  beforeEach(() => {
    vi.mocked(useAllCharacters).mockReturnValue(mockCharacters);
  });

  it('renders empty state when no proposals involve current character', () => {
    vi.mocked(useCrossCharacterLinks).mockReturnValue([]);

    render(<CrossCharacterProposalList currentCharId="char-1" />);

    expect(screen.getByText('No proposed links involving your character')).toBeDefined();
  });

  it('renders proposals and handles Accept/Dismiss clicks', async () => {
    const mockProposals: CrossCharacterLinkProposal[] = [
      {
        id: 'link-1',
        sourceCharId: 'char-1',
        targetCharId: 'char-2',
        relationship: 'Rival',
        description: 'Competed for the same promotion.',
        status: 'pending',
        generatedAt: Date.now(),
        acceptedBy: [],
      },
    ];

    vi.mocked(useCrossCharacterLinks).mockReturnValue(mockProposals);

    const doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    createSession(doc, 'campaign-123', 'gm-user-1');
    const linkId = addCrossCharacterLink(doc, mockProposals[0]);
    mockProposals[0].id = linkId;

    render(<CrossCharacterProposalList currentCharId="char-1" />);

    expect(screen.getByText('Link with Milo')).toBeDefined();
    expect(screen.getByText('Rival')).toBeDefined();
    expect(screen.getByText('"Competed for the same promotion."')).toBeDefined();

    const acceptBtn = screen.getByText('Accept');
    const dismissBtn = screen.getByText('Dismiss');

    expect(acceptBtn).toBeDefined();
    expect(dismissBtn).toBeDefined();

    // Click Accept
    await act(async () => {
      fireEvent.click(acceptBtn);
    });
    const links = getCrossCharacterLinks(doc);
    expect(links[0].acceptedBy).toEqual(['char-1']);
  });
});
