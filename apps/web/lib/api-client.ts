import { getSession } from 'next-auth/react';

/** Server identity comes only from the signed session, never caller-supplied headers. */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const session = await getSession();
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value);
  });
  for (const header of [...headers.keys()])
    if (/^x-(user-id|is-gm|character-id)$/i.test(header)) headers.delete(header);
  headers.delete('Authorization');
  if (session?.apiToken) headers.set('Authorization', `Bearer ${session.apiToken}`);
  return fetch(input, { ...init, headers });
}
