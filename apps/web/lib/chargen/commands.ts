import * as Y from 'yjs';
import { getSession } from 'next-auth/react';
import { apiFetch } from '../api-client';

export const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

export class ChargenCommandError extends Error {
  constructor(readonly status: number) {
    super(`Chargen command failed (${status})`);
  }
}

export async function chargenCommand(doc: Y.Doc, path: string, body?: unknown): Promise<boolean> {
  const identity = await getSession();
  if (!identity && LOCAL_MODE) return false;
  if (!identity?.apiToken) throw new ChargenCommandError(401);
  const session = doc.getMap('chargen').get('session');
  if (!(session instanceof Y.Map)) throw new ChargenCommandError(404);
  const campaignId: unknown = session.get('campaignId');
  const sessionId: unknown = session.get('id');
  if (typeof campaignId !== 'string' || typeof sessionId !== 'string')
    throw new ChargenCommandError(404);
  const response = await apiFetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18122'}/api/chargen/${encodeURIComponent(campaignId)}/${encodeURIComponent(sessionId)}/${path}`,
    {
      method: body === undefined ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  if (!response.ok) throw new ChargenCommandError(response.status);
  return true;
}
