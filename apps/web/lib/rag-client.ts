import { getOrCreateUser, getActiveCharacter } from './identity';

const RAG_URL = process.env.NEXT_PUBLIC_RAG_URL || 'http://localhost:8000';

export async function streamQuery(
  query: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<void> {
  const user = getOrCreateUser();
  const char = getActiveCharacter();

  try {
    const response = await fetch(`${RAG_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.userId,
        'X-User-Name': user.name,
        'X-Is-GM': String(user.isGM),
        'X-Character-Id': char?.characterId ?? '',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
    }

    if (!response.body) {
        throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const payload = line.slice(6);
        if (payload === '[DONE]') {
          onDone();
          return;
        }
        try {
            const data = JSON.parse(payload);
            if (data.text) {
                onChunk(data.text);
            }
            if (data.error) {
                onError(new Error(data.error));
                return;
            }
        } catch (e) {
            console.error("Failed to parse SSE payload:", payload, e);
        }
      }
    }
    onDone();
  } catch (error) {
    onError(error as Error);
  }
}
