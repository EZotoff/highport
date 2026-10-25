import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import BackgroundStep from '../components/chargen/steps/BackgroundStep';
import { getAllCharacters, getSession } from '../lib/chargen/state';

const auth = vi.hoisted(() => ({ userId: 'authenticated-user', status: 'authenticated' }));
let doc: Y.Doc;
vi.mock('../lib/ydoc', () => ({ getYDoc: () => doc }));
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: auth.userId ? { user: { id: auth.userId } } : null,
    status: auth.status,
  }),
}));

describe('chargen write identity', () => {
  afterEach(() => localStorage.clear());

  it('records authenticated ownership when a NextAuth session exists', () => {
    // Given
    localStorage.setItem('highport_user', JSON.stringify({ userId: 'local-mock' }));
    doc = new Y.Doc();
    render(<BackgroundStep characterId={null} onCharacterCreated={vi.fn()} />);
    // When
    fireEvent.click(screen.getByRole('button', { name: 'Create New Character' }));
    // Then
    expect(getSession(doc)?.createdBy).toBe('authenticated-user');
    expect(getAllCharacters(doc)[0]?.playerId).toBe('authenticated-user');
    expect(getAllCharacters(doc)[0]?.playerId).not.toBe('local-mock');
    doc.destroy();
  });
});
