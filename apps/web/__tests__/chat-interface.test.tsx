import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../components/chat/ChatInterface';
import * as RagClient from '../lib/rag-client';
import { ToastProvider } from '../components/ui/ToastContext';

// Mock the rag-client
vi.mock('../lib/rag-client', () => ({
  streamQuery: vi.fn(),
}));

// Mock Identity
vi.mock('../lib/identity', () => ({
  getOrCreateUser: () => ({ userId: 'test-user', name: 'Test User', isGM: false }),
  getActiveCharacter: () => ({ characterId: 'char-1', name: 'Test Char' }),
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input and placeholder', () => {
    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );
    expect(screen.getByPlaceholderText('Ask a question...')).toBeDefined();
    expect(screen.getByText('Ask about the universe...')).toBeDefined();
  });

  it('sends query and displays response', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);
    mockStreamQuery.mockImplementation(async (_query, onChunk, onDone) => {
      onChunk('Hello');
      onChunk(' world');
      onDone();
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Hello RAG' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Hello RAG')).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeDefined();
    });
  });

  it('handles empty results', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);
    mockStreamQuery.mockImplementation(async (_query, onChunk, onDone) => {
      onChunk('You do not recall any information.');
      onDone();
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Unknown' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('You do not recall any information.')).toBeDefined();
    });
  });

  it('handles errors gracefully', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);
    mockStreamQuery.mockImplementation(async (_query, _onChunk, _onDone, onError) => {
      onError(new Error('Network error'));
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Error trigger' } });
    fireEvent.submit(input.closest('form')!);

    // Should not show a message bubble for assistant if it failed immediately with no content
    // But we expect a toast (which we can't easily assert without mocking toast context deeply or checking DOM for toast)
    // However, the assistant message should be removed if empty
    await waitFor(() => {
      const messages = screen.queryAllByText('Error trigger');
      expect(messages.length).toBe(1); // User message
    });
  });
});
