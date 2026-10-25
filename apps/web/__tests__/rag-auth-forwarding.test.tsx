import { afterEach, expect, it, vi } from 'vitest';
import { getSession } from 'next-auth/react';
import { render, waitFor } from '@testing-library/react';
import {
  generateEventDescription,
  generateMishapDescription,
  generateNPCDetails,
} from '../lib/chargen/narrative';
import ConnectionSuggestions from '../components/chargen/ConnectionSuggestions';

afterEach(() => {
  vi.restoreAllMocks();
});

const characterContext = { name: 'Zara', characteristics: {} };
const calls = [
  {
    name: 'event-description',
    run: () =>
      generateEventDescription({
        eventText: 'event',
        career: 'navy',
        assignment: 'line',
        term: 1,
        characterContext,
        verbosity: 'brief',
      }),
  },
  {
    name: 'mishap-description',
    run: () =>
      generateMishapDescription({
        mishapText: 'mishap',
        career: 'navy',
        term: 1,
        characterContext,
        verbosity: 'brief',
      }),
  },
  {
    name: 'npc-details',
    run: () =>
      generateNPCDetails({
        npcType: 'ally',
        context: { eventText: 'event', career: 'navy', characterName: 'Zara' },
        verbosity: 'brief',
      }),
  },
];

it.each(calls)('forwards the signed API token for $name', async ({ name, run }) => {
  // Given a signed session and the real apiFetch implementation.
  vi.mocked(getSession).mockResolvedValue({ expires: '2099-01-01', apiToken: 'signed-api-token' });
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  // When narrative generation is requested.
  await run();
  // Then the outgoing request authenticates with the session token, not identity headers.
  expect(request.mock.calls[0]?.[0]).toMatch(new RegExp(`/narrative/${name}$`));
  const headers = new Headers(request.mock.calls[0]?.[1]?.headers);
  expect(headers.get('Authorization')).toBe('Bearer signed-api-token');
  expect(headers.has('X-User-Id')).toBe(false);
  expect(headers.has('X-Is-GM')).toBe(false);
});

it('authenticates automatic connection suggestions with the signed API token', async () => {
  // Given a character with enough entities for automatic suggestions.
  vi.mocked(getSession).mockResolvedValue({ expires: '2099-01-01', apiToken: 'signed-api-token' });
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{"suggestions":[]}'));
  // When the suggestions component requests narrative data.
  const view = render(
    <ConnectionSuggestions
      entities={[
        { type: 'npc', graphNodeId: 'npc-1', name: 'Ally' },
        { type: 'npc', graphNodeId: 'npc-2', name: 'Rival' },
      ]}
      characterName="Zara"
      characterId="char-1"
      careerHistory={['navy']}
      dismissedSuggestions={[]}
      onAccept={() => undefined}
    />,
  );
  // Then the RAG request carries the verified-session credential.
  await waitFor(() => expect(request).toHaveBeenCalledOnce());
  expect(new Headers(request.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer signed-api-token',
  );
  view.unmount();
});
