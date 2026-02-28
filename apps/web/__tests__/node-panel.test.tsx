import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as Y from 'yjs';
import { NodePanel } from '../components/graph/NodePanel';
import { addFaction, updateFactionField } from '../lib/reputation-state';
import * as YDocModule from '../lib/ydoc';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock getYDoc
vi.mock('../lib/ydoc', () => ({
  getYDoc: vi.fn(),
}));

describe('NodePanel', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
    // Initialize reputation map
    doc.getMap('reputationState');
    vi.mocked(YDocModule.getYDoc).mockReturnValue(doc);
  });

  it('should return null if no nodeId is provided', () => {
    const { container } = render(<NodePanel nodeId={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render faction details when linked node is selected', async () => {
    // Setup data
    const factionId = addFaction(doc, 'Test Faction');
    updateFactionField(doc, factionId, 'factionNodeId', 'node-123');
    updateFactionField(doc, factionId, 'standing', 50);
    updateFactionField(doc, factionId, 'heat', 20);

    render(<NodePanel nodeId="node-123" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Test Faction')).toBeDefined();
    });

    expect(screen.getByText('50')).toBeDefined(); // Standing
    expect(screen.getByText('Warm')).toBeDefined(); // Tier (calculated from 50)
    expect(screen.getByText('20/100')).toBeDefined(); // Heat
  });

  it('should render nothing if node is not linked to any faction', async () => {
    // Setup data but don't link it
    addFaction(doc, 'Unlinked Faction');

    const { container } = render(<NodePanel nodeId="node-999" onClose={() => {}} />);

    // Should be null initially and stay null
    expect(container.firstChild).toBeNull();
  });
});
