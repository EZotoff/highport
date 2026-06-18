import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../components/chat/ChatInterface';
import * as RagClient from '../lib/rag-client';
import { RagUnavailableError } from '../lib/rag-client';
import { ToastProvider } from '../components/ui/ToastContext';

// Mock the rag-client — override streamQuery but use real RagUnavailableError
vi.mock('../lib/rag-client', async () => {
  const actual = await vi.importActual<typeof import('../lib/rag-client')>('../lib/rag-client');
  return {
    ...actual,
    streamQuery: vi.fn(),
  };
});

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

  it('renders inline RagUnavailableNotice when RAG service is unreachable', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);
    mockStreamQuery.mockImplementation(async (_query, _onChunk, _onDone, onError) => {
      onError(new RagUnavailableError('RAG service unreachable'));
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Where is the spaceport?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/AI features are optional/)).toBeDefined();
    });

    const link = screen.getByRole('link', { name: /docs\/rag-setup\.md/ });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe(
      'https://github.com/EZotoff/highport/blob/master/docs/rag-setup.md',
    );

    expect(screen.getByText('Where is the spaceport?')).toBeDefined();

    const errorToast = document.querySelector('.bg-red-900\\/80');
    expect(errorToast).toBeNull();
  });

  it('replaces RagUnavailableNotice when user sends another query', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);

    mockStreamQuery.mockImplementationOnce(async (_query, _onChunk, _onDone, onError) => {
      onError(new RagUnavailableError('RAG service unreachable'));
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Query one' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/AI features are optional/)).toBeDefined();
    });

    mockStreamQuery.mockImplementationOnce(async (_query, onChunk, onDone) => {
      onChunk('Here is the answer');
      onDone();
    });

    fireEvent.change(input, { target: { value: 'Query two' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Here is the answer')).toBeDefined();
    });

    expect(screen.queryByText(/AI features are optional/)).toBeNull();

    expect(screen.getByText('Query one')).toBeDefined();
    expect(screen.getByText('Query two')).toBeDefined();
  });

  it('shows error toast for non-RagUnavailable errors (4xx)', async () => {
    const mockStreamQuery = vi.mocked(RagClient.streamQuery);
    mockStreamQuery.mockImplementation(async (_query, _onChunk, _onDone, onError) => {
      onError(new Error('Query failed: 400'));
    });

    render(
      <ToastProvider>
        <ChatInterface />
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Bad request' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Failed to get response')).toBeDefined();
    });

    expect(screen.queryByText(/AI features are optional/)).toBeNull();

    expect(screen.getByText('Bad request')).toBeDefined();
  });
});
