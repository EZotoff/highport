import { render, screen } from '@testing-library/react';
import { ConflictQueue } from '../components/conflicts/ConflictQueue';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

global.fetch = vi.fn();

describe('ConflictQueue', () => {
  it('shows loading state initially', () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ conflicts: [] }),
    });
    render(<ConflictQueue />);
    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  it('shows empty message when no conflicts', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ conflicts: [] }),
    });
    render(<ConflictQueue />);
    expect(await screen.findByText(/no pending conflicts/i)).toBeDefined();
  });
});
