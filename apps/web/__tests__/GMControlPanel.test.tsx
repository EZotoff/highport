import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as Y from 'yjs';
import { GMControlPanel } from '../components/chargen/GMControlPanel';
import { useGMControls } from '../lib/chargen/useGMControls';
import {
  useAllCharacters,
  useCrossCharacterLinks as useYjsCrossCharacterLinks,
} from '../lib/chargen/hooks';
import { useCrossCharacterLinks as useNarrativeCrossCharacterLinks } from '../lib/chargen/useNarrative';
import { getYDoc } from '../lib/ydoc';
import {
  getCrossCharacterLinks,
  addCrossCharacterLink,
  resolveAIDraft,
  createCharacter,
  getCharactersMap,
  yMapToCharacter,
} from '../lib/chargen/state';
import type {
  ChargenCharacter,
  ChargenSessionConfig,
  AIProvenance,
  CareerTermResult,
} from '../lib/chargen/types';

// Mock the hooks
vi.mock('../lib/chargen/useGMControls', () => ({
  useGMControls: vi.fn(),
  ALL_CAREERS: [],
}));

vi.mock('../lib/chargen/hooks', () => ({
  useAllCharacters: vi.fn(),
  useCrossCharacterLinks: vi.fn(),
}));

vi.mock('../lib/chargen/useNarrative', () => ({
  useCrossCharacterLinks: vi.fn(),
}));

vi.mock('../lib/ydoc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/ydoc')>();
  return {
    ...actual,
    getYDoc: vi.fn(),
  };
});

describe('GMControlPanel - Cross-Character Proposals', () => {
  let doc: Y.Doc;
  const characters: ChargenCharacter[] = [
    {
      id: 'char-1',
      playerId: 'player-1',
      name: 'Zara',
      characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'mustering_out',
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
      characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'mustering_out',
      skills: {},
      benefits: [],
      credits: 0,
      age: 18,
      spawnedEntityIds: [],
    },
  ];
  const session: ChargenSessionConfig = {
    id: 'session-1',
    campaignId: 'campaign-1',
    createdAt: 1,
    createdBy: 'user-1',
    status: 'active',
    settings: {
      allowedCareers: [],
      aiVerbosity: 'inspiration',
      isLocked: false,
      gmApprovalMode: 'moderate',
      crossCharacterLinkMode: 'gm-mediated',
    },
  };
  const actions = {
    updateSettings: vi.fn(),
    toggleCareer: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    endSession: vi.fn(),
    exportAllCharacters: vi.fn(),
  };

  beforeEach(() => {
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    vi.mocked(useAllCharacters).mockReturnValue(characters);
    vi.mocked(useYjsCrossCharacterLinks).mockReturnValue([]);
    vi.mocked(useNarrativeCrossCharacterLinks).mockReturnValue({
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('should not render if user is not GM', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: null,
      settings: undefined,
      pendingRequests: [],
      actions,
    });

    const { container } = render(<GMControlPanel currentUserId="user-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render proposals section when GM and mode is gm-mediated', async () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session,
      settings: session.settings,
      pendingRequests: [],
      actions,
    });

    const mockRefresh = vi.fn();
    vi.mocked(useNarrativeCrossCharacterLinks).mockReturnValue({
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    // Add a cross-character link proposal directly to Yjs
    addCrossCharacterLink(doc, {
      sourceCharId: 'char-1',
      targetCharId: 'char-2',
      relationship: 'Rivals',
      description: 'Competed at the academy',
    });
    const yjsLinks = getCrossCharacterLinks(doc);
    vi.mocked(useYjsCrossCharacterLinks).mockReturnValue(yjsLinks);

    render(<GMControlPanel currentUserId="user-1" />);

    // Open the panel
    const headerButton = screen.getByRole('button', { name: /GM CONTROLS/i });
    fireEvent.click(headerButton);

    // Verify section heading is visible
    expect(screen.getByText('Cross-Character Proposals')).toBeDefined();

    // Verify proposal details are visible
    expect(screen.getByText('Zara ↔ Milo')).toBeDefined();
    expect(screen.getByText('Rivals')).toBeDefined();
    expect(screen.getByText('"Competed at the academy"')).toBeDefined();

    expect(screen.getByRole('button', { name: /Edit/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeDefined();
  });

  it('edits the description and creates a graph edge when the GM accepts', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session,
      settings: session.settings,
      pendingRequests: [],
      actions,
    });
    vi.mocked(useNarrativeCrossCharacterLinks).mockReturnValue({
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // Add a cross-character link proposal directly to Yjs
    addCrossCharacterLink(doc, {
      sourceCharId: 'char-1',
      targetCharId: 'char-2',
      relationship: 'Rivals',
      description: 'Competed at the academy',
    });
    const yjsLinks = getCrossCharacterLinks(doc);
    vi.mocked(useYjsCrossCharacterLinks).mockReturnValue(yjsLinks);

    const nodes = doc.getMap<Y.Map<unknown>>('nodes');
    const sourceNode = new Y.Map<unknown>();
    sourceNode.set('metadata', { chargenId: 'char-1' });
    nodes.set('node-1', sourceNode);
    const targetNode = new Y.Map<unknown>();
    targetNode.set('metadata', { chargenId: 'char-2' });
    nodes.set('node-2', targetNode);

    render(<GMControlPanel currentUserId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /GM CONTROLS/i }));
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /Relationship description/i }), {
      target: { value: 'Command rivals from the academy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));

    expect(getCrossCharacterLinks(doc)[0]).toMatchObject({
      status: 'accepted',
      description: 'Command rivals from the academy',
    });
    const edges = doc.getMap<Y.Map<unknown>>('edges');
    expect(edges.size).toBe(1);
    const edge = Array.from(edges.values())[0];
    expect(edge?.get('source_id')).toBe('node-1');
    expect(edge?.get('target_id')).toBe('node-2');
    expect(edge?.get('relation_label')).toBe('Rivals');
  });

  it('should not render proposals section when mode is player-to-player', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session: {
        ...session,
        settings: { ...session.settings, crossCharacterLinkMode: 'player-to-player' },
      },
      settings: { ...session.settings, crossCharacterLinkMode: 'player-to-player' },
      pendingRequests: [],
      actions,
    });

    render(<GMControlPanel currentUserId="user-1" />);

    // Open the panel
    const headerButton = screen.getByRole('button', { name: /GM CONTROLS/i });
    fireEvent.click(headerButton);

    expect(screen.queryByText('Cross-Character Proposals')).toBeNull();
  });
});

describe('GMControlPanel - AI Draft Review', () => {
  let doc: Y.Doc;

  const session: ChargenSessionConfig = {
    id: 'session-1',
    campaignId: 'campaign-1',
    createdAt: 1,
    createdBy: 'user-1',
    status: 'active',
    settings: {
      allowedCareers: [],
      aiVerbosity: 'inspiration',
      isLocked: false,
      gmApprovalMode: 'moderate',
      crossCharacterLinkMode: 'gm-mediated',
    },
  };

  const actions = {
    updateSettings: vi.fn(),
    toggleCareer: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    endSession: vi.fn(),
    exportAllCharacters: vi.fn(),
  };

  beforeEach(() => {
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    vi.mocked(useYjsCrossCharacterLinks).mockReturnValue([]);
    vi.mocked(useNarrativeCrossCharacterLinks).mockReturnValue({
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders pending AI draft and Accept clears pendingReviewBy', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session,
      settings: session.settings,
      pendingRequests: [],
      actions,
    });

    const charId = createCharacter(doc, 'player-draft', 'Drafty');
    const charMap = getCharactersMap(doc).get(charId)!;

    doc.transact(() => {
      const terms: CareerTermResult[] = [
        {
          termNumber: 1,
          careerId: 'scout',
          assignmentId: 'scout-courier',
          startAge: 18,
          survived: true,
          advanced: false,
          currentRank: 0,
          skillsGained: [],
          spawnedEntities: [],
          eventDescription: {
            value: 'A mysterious signal from a derelict vessel',
            source: 'ai',
            mode: 'inspiration',
            status: 'draft',
            pendingReviewBy: 'gm',
          } as AIProvenance<string>,
        },
      ];
      charMap.set('terms', JSON.parse(JSON.stringify(terms)));
    });

    const character = yMapToCharacter(charMap);
    vi.mocked(useAllCharacters).mockReturnValue([character]);

    render(<GMControlPanel currentUserId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /GM CONTROLS/i }));

    expect(screen.getByText('Pending AI Review')).toBeDefined();
    expect(screen.getByText('Drafty')).toBeDefined();
    expect(screen.getByText('"A mysterious signal from a derelict vessel"')).toBeDefined();
    expect(screen.getByText('Event')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));

    const updatedCharMap = getCharactersMap(doc).get(charId)!;
    const updatedTerms = updatedCharMap.get('terms') as CareerTermResult[];
    const updatedField = updatedTerms[0]?.eventDescription;
    expect(typeof updatedField).toBe('object');
    expect(updatedField).not.toBeNull();
    const prov = updatedField as AIProvenance<string>;
    expect(prov.pendingReviewBy).toBeNull();
    expect(prov.status).toBe('accepted');
    expect(prov.reviewLog).toBeDefined();
    expect(prov.reviewLog?.length).toBe(1);
    expect(prov.reviewLog?.[0]?.by).toBe('gm');
  });

  it('rejecting an AI draft sets status to rejected', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session,
      settings: session.settings,
      pendingRequests: [],
      actions,
    });

    const charId = createCharacter(doc, 'player-reject', 'Rejecto');
    const charMap = getCharactersMap(doc).get(charId)!;

    doc.transact(() => {
      const terms: CareerTermResult[] = [
        {
          termNumber: 1,
          careerId: 'scout',
          assignmentId: 'scout-courier',
          startAge: 18,
          survived: true,
          advanced: false,
          currentRank: 0,
          skillsGained: [],
          spawnedEntities: [],
          mishapDescription: {
            value: 'Failed survival roll',
            source: 'ai',
            mode: 'inspiration',
            status: 'draft',
            pendingReviewBy: 'gm',
          } as AIProvenance<string>,
        },
      ];
      charMap.set('terms', JSON.parse(JSON.stringify(terms)));
    });

    const character = yMapToCharacter(charMap);
    vi.mocked(useAllCharacters).mockReturnValue([character]);

    render(<GMControlPanel currentUserId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /GM CONTROLS/i }));

    expect(screen.getByText('Rejecto')).toBeDefined();
    expect(screen.getByText('Mishap')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Reject/i }));

    const updatedCharMap = getCharactersMap(doc).get(charId)!;
    const updatedTerms = updatedCharMap.get('terms') as CareerTermResult[];
    const updatedField = updatedTerms[0]?.mishapDescription;
    const prov = updatedField as AIProvenance<string>;
    expect(prov.pendingReviewBy).toBeNull();
    expect(prov.status).toBe('rejected');
  });

  it('resolveAIDraft returns false for non-existent character', () => {
    const result = resolveAIDraft(doc, 'nonexistent', 1, 'eventDescription', 'accept');
    expect(result).toBe(false);
  });

  it('resolveAIDraft returns false when no pending draft', () => {
    const charId = createCharacter(doc, 'player-clean', 'Clean');
    const result = resolveAIDraft(doc, charId, 1, 'eventDescription', 'accept');
    expect(result).toBe(false);
  });
  it('resolving a draft targets the correct term', () => {
    const charId = createCharacter(doc, 'player-target', 'Target');
    const charMap = getCharactersMap(doc).get(charId)!;

    doc.transact(() => {
      const terms: CareerTermResult[] = [
        {
          termNumber: 1,
          careerId: 'scout',
          assignmentId: 'scout-courier',
          startAge: 18,
          survived: true,
          advanced: false,
          currentRank: 0,
          skillsGained: [],
          spawnedEntities: [],
          eventDescription: {
            value: 'Term 1 event',
            source: 'ai',
            mode: 'inspiration',
            status: 'draft',
            pendingReviewBy: 'gm',
          } as AIProvenance<string>,
        },
        {
          termNumber: 2,
          careerId: 'army',
          assignmentId: 'army-soldier',
          startAge: 22,
          survived: true,
          advanced: false,
          currentRank: 0,
          skillsGained: [],
          spawnedEntities: [],
          mishapDescription: {
            value: 'Term 2 mishap',
            source: 'ai',
            mode: 'inspiration',
            status: 'draft',
            pendingReviewBy: 'gm',
          } as AIProvenance<string>,
        },
      ];
      charMap.set('terms', JSON.parse(JSON.stringify(terms)));
    });

    const result = resolveAIDraft(doc, charId, 2, 'mishapDescription', 'accept');
    expect(result).toBe(true);

    const updatedTerms = getCharactersMap(doc).get(charId)!.get('terms') as CareerTermResult[];
    const term1 = updatedTerms.find((t) => t.termNumber === 1);
    const term2 = updatedTerms.find((t) => t.termNumber === 2);

    expect((term1?.eventDescription as AIProvenance<string>).pendingReviewBy).toBe('gm');
    expect((term2?.mishapDescription as AIProvenance<string>).status).toBe('accepted');
    expect((term2?.mishapDescription as AIProvenance<string>).pendingReviewBy).toBeNull();
  });
});
