import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  createSession,
  addCrossCharacterLink,
  getCrossCharacterLinks,
  acceptCrossCharacterLink,
  removeCrossCharacterLink,
  createCharacter,
  getCharacter,
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
  it('handles dual acceptance correctly', () => {
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
    acceptCrossCharacterLink(doc, linkId, 'char-1');
    links = getCrossCharacterLinks(doc);
    expect(links[0].status).toBe('pending');
    expect(links[0].acceptedBy).toEqual(['char-1']);

    // Player 1 accepts again (should be no-op)
    acceptCrossCharacterLink(doc, linkId, 'char-1');
    links = getCrossCharacterLinks(doc);
    expect(links[0].acceptedBy).toEqual(['char-1']);

    // Player 2 accepts -> status becomes accepted
    acceptCrossCharacterLink(doc, linkId, 'char-2');
    links = getCrossCharacterLinks(doc);
    expect(links[0].status).toBe('accepted');
    expect(links[0].acceptedBy).toEqual(['char-1', 'char-2']);
  });

  it('creates graph edge when both accepted and both characters are finalized', () => {
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
    acceptCrossCharacterLink(doc, linkId, char1Id);
    let edges = getEdgesMap(doc);
    expect(edges.size).toBe(0); // No edge yet

    // Player 2 accepts -> edge should be created
    acceptCrossCharacterLink(doc, linkId, char2Id);
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

  it('creates graph edge during finalization if link was already accepted', () => {
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
    acceptCrossCharacterLink(doc, linkId, char1Id);
    acceptCrossCharacterLink(doc, linkId, char2Id);

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

  it('renders proposals and handles Accept/Dismiss clicks', () => {
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
    fireEvent.click(acceptBtn);
    const links = getCrossCharacterLinks(doc);
    expect(links[0].acceptedBy).toEqual(['char-1']);
  });
});
