import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { campaignMembers } from '../db/schema.js';

export type CampaignRole = 'gm' | 'player';

export class AuthorizationError extends Error {
  readonly statusCode = 403;
  constructor() {
    super('Campaign access denied');
    this.name = 'AuthorizationError';
  }
}

export async function getMembership(
  campaignId: string,
  userId: string,
): Promise<{ readonly role: CampaignRole } | null> {
  const [member] = await db
    .select({ role: campaignMembers.role })
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)));
  return member ?? null;
}

export async function requireCampaignRole(
  campaignId: string,
  userId: string,
  roles: readonly CampaignRole[],
): Promise<void> {
  const member = await getMembership(campaignId, userId);
  if (!member || !roles.includes(member.role)) throw new AuthorizationError();
}

export function parseDocumentName(documentName: string): {
  readonly campaignId: string;
  readonly docType: string;
} {
  const parts = documentName.split(':');
  if (parts.length === 1 && documentName)
    return { campaignId: 'campaign_default', docType: documentName };
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AuthorizationError();
  return { campaignId: parts[0], docType: parts[1] };
}

const LOCAL_PLAY_CAMPAIGNS: ReadonlySet<string> = new Set(['default', 'campaign_default']);

export async function authorizeDocument(documentName: string, userId: string): Promise<string> {
  const { campaignId } = parseDocumentName(documentName);
  const member = await getMembership(campaignId, userId);
  if (member) return campaignId;
  if (!LOCAL_PLAY_CAMPAIGNS.has(campaignId)) throw new AuthorizationError();
  await db
    .insert(campaignMembers)
    .values({ campaignId, userId, role: 'player' })
    .onConflictDoNothing();
  return campaignId;
}
