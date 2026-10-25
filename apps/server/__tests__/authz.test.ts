import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeDocument } from '../src/lib/authz.js';
import { ensureDocumentExists, fetchDocumentState } from '../src/ws/hocuspocus.js';

const mocks = vi.hoisted(() => ({
  members: vi.fn(),
  campaign: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
}));
vi.mock('../src/db/client.js', () => ({
  db: {
    select: () => ({ from: () => ({ where: mocks.members }) }),
    query: { campaigns: { findFirst: mocks.campaign } },
    insert: mocks.insert,
  },
}));

describe('document authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.mockReturnValue({ onConflictDoNothing: () => Promise.resolve() });
    mocks.insert.mockReturnValue({ values: mocks.values });
  });

  it('allows access when the user belongs to the campaign', async () => {
    // Given
    mocks.members.mockResolvedValue([{ role: 'player' }]);
    // When / Then
    await expect(authorizeDocument('campA:graph', 'member')).resolves.toBe('campA');
  });

  it('denies access when the user is not a member', async () => {
    // Given
    mocks.members.mockResolvedValue([]);
    // When / Then
    await expect(authorizeDocument('campA:graph', 'outsider')).rejects.toThrow(
      'Campaign access denied',
    );
  });

  it('denies another campaign when the signed user only belongs to campA', async () => {
    // Given
    mocks.members.mockResolvedValue([]);
    // When / Then
    await expect(authorizeDocument('otherCamp:graph', 'memberOfCampA')).rejects.toThrow(
      'Campaign access denied',
    );
  });

  it('auto-joins an unknown user to the local-play default campaign', async () => {
    // Given
    mocks.members.mockResolvedValue([]);
    // When
    const result = await authorizeDocument('default:chargen', 'newbie');
    // Then
    expect(result).toBe('default');
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith({
      campaignId: 'default',
      userId: 'newbie',
      role: 'player',
    });
  });

  it('does not re-insert membership on a second local-play authorization', async () => {
    // Given
    mocks.members.mockResolvedValueOnce([]).mockResolvedValueOnce([{ role: 'player' }]);
    // When
    await authorizeDocument('default:chargen', 'newbie');
    await authorizeDocument('default:chargen', 'newbie');
    // Then
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('still denies a non-member of a non-local-play campaign without inserting', async () => {
    // Given
    mocks.members.mockResolvedValue([]);
    // When / Then
    await expect(authorizeDocument('campA:chargen', 'outsider')).rejects.toThrow(
      'Campaign access denied',
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('does not insert a campaign or document when the campaign is missing', async () => {
    // Given
    mocks.campaign.mockResolvedValue(undefined);
    // When
    const result = await ensureDocumentExists('unknown:graph');
    // Then
    expect(result).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('returns null before loading updates when the campaign is missing', async () => {
    // Given
    mocks.campaign.mockResolvedValue(undefined);
    // When / Then
    await expect(fetchDocumentState('unknown:graph')).resolves.toBeNull();
  });
});
