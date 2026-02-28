import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ScopeEditor } from '../components/rag/ScopeEditor';

vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Users: () => <span data-testid="users-icon" />,
  Globe: () => <span data-testid="globe-icon" />,
  X: () => <span data-testid="x-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

describe('ScopeEditor', () => {
  const mockOnUpdate = vi.fn();
  const defaultProps = {
    documentId: 'doc_123',
    initialScope: ['public'],
    onUpdate: mockOnUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
  });

  it('renders with initial scope selected', () => {
    render(<ScopeEditor {...defaultProps} />);

    const publicButton = screen.getByText('Public').closest('button');
    expect(publicButton).toBeDefined();
    expect(publicButton?.className).toContain('amber');
  });

  it('toggles preset scope on click', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const gmButton = screen.getByText('GM Only').closest('button');
    await user.click(gmButton!);

    expect(gmButton?.className).toContain('amber');
  });

  it('adds secret tag on button click', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const input = screen.getByPlaceholderText('ancient-ruins');
    await user.type(input, 'lost-city');

    const addButton = screen.getByText('Add').closest('button');
    await user.click(addButton!);

    expect(screen.getByText('secret:lost-city')).toBeDefined();
  });

  it('adds secret tag on Enter key', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const input = screen.getByPlaceholderText('ancient-ruins');
    await user.type(input, 'hidden-base{enter}');

    expect(screen.getByText('secret:hidden-base')).toBeDefined();
  });

  it('normalizes secret tag input', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const input = screen.getByPlaceholderText('ancient-ruins');
    await user.type(input, 'Ancient  Artifact!!{enter}');

    expect(screen.getByText('secret:ancient-artifact-')).toBeDefined();
  });

  it('removes secret tag when X is clicked', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} initialScope={['public', 'secret:test-tag']} />);

    expect(screen.getByText('secret:test-tag')).toBeDefined();

    const removeButtons = screen.getAllByTestId('x-icon');
    const removeButton = removeButtons[0].closest('button');
    await user.click(removeButton!);

    expect(screen.queryByText('secret:test-tag')).toBeNull();
  });

  it('calls API and onUpdate when saving', async () => {
    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const gmButton = screen.getByText('GM Only').closest('button');
    await user.click(gmButton!);

    const saveButton = screen.getByText('Save Changes').closest('button');
    await user.click(saveButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/doc_123/scope',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.any(String),
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('shows error when save fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })),
    );

    const user = userEvent.setup();
    render(<ScopeEditor {...defaultProps} />);

    const gmButton = screen.getByText('GM Only').closest('button');
    await user.click(gmButton!);

    const saveButton = screen.getByText('Save Changes').closest('button');
    await user.click(saveButton!);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeDefined();
    });
  });

  it('disables save button when no changes', () => {
    render(<ScopeEditor {...defaultProps} />);

    const saveButton = screen.getByText('Save Changes').closest('button');
    expect(saveButton?.hasAttribute('disabled')).toBe(true);
  });

  it('shows tag count', () => {
    render(<ScopeEditor {...defaultProps} initialScope={['public', 'gm', 'secret:test']} />);

    expect(screen.getByText('3 tags selected')).toBeDefined();
  });
});
