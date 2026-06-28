import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortraitTags } from '@highport/shared/types/portrait';
import type { PortraitStorage, PortraitStorageResult } from '../src/storage/portrait-storage.js';

type PortraitRow = {
  id: string;
  campaignId: string;
  subjectNodeId: string | null;
  anchorPortraitId: string | null;
  sourcePortraitId: string | null;
  familyGroupId: string | null;
  protected: boolean;
  sourcePolicy: 'subject_only' | 'family_only' | 'campaign' | 'public';
  tags: PortraitTags;
  prompt: string | null;
  promptFingerprint: string | null;
  modelId: string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockCondition =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'and'; conditions: MockCondition[] };

const columnToField: Record<string, keyof PortraitRow> = {
  id: 'id',
  campaign_id: 'campaignId',
  subject_node_id: 'subjectNodeId',
  anchor_portrait_id: 'anchorPortraitId',
  source_portrait_id: 'sourcePortraitId',
  family_group_id: 'familyGroupId',
  protected: 'protected',
  source_policy: 'sourcePolicy',
};

function matchesCondition(row: PortraitRow, condition: MockCondition | undefined): boolean {
  if (!condition) return true;

  if (condition.type === 'eq') {
    const field = columnToField[condition.column];
    if (!field) return false;
    return row[field] === condition.value;
  }

  return condition.conditions.every((nested) => matchesCondition(row, nested));
}

function normalizeRow(input: Record<string, unknown>): PortraitRow {
  const now = new Date();
  return {
    id: input.id as string,
    campaignId: input.campaignId as string,
    subjectNodeId: (input.subjectNodeId as string | undefined) ?? null,
    anchorPortraitId: (input.anchorPortraitId as string | undefined) ?? null,
    sourcePortraitId: (input.sourcePortraitId as string | undefined) ?? null,
    familyGroupId: (input.familyGroupId as string | undefined) ?? null,
    protected: (input.protected as boolean | undefined) ?? false,
    sourcePolicy: (input.sourcePolicy as PortraitRow['sourcePolicy'] | undefined) ?? 'campaign',
    tags: input.tags as PortraitTags,
    prompt: (input.prompt as string | undefined) ?? null,
    promptFingerprint: (input.promptFingerprint as string | undefined) ?? null,
    modelId: (input.modelId as string | undefined) ?? null,
    storageKey: input.storageKey as string,
    mimeType: input.mimeType as string,
    sizeBytes: (input.sizeBytes as number | undefined) ?? null,
    width: (input.width as number | undefined) ?? null,
    height: (input.height as number | undefined) ?? null,
    createdByUserId: input.createdByUserId as string,
    createdAt: (input.createdAt as Date | undefined) ?? now,
    updatedAt: (input.updatedAt as Date | undefined) ?? now,
  };
}

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: (column: { name: string }, value: unknown): MockCondition => ({
      type: 'eq',
      column: column.name,
      value,
    }),
    and: (...conditions: MockCondition[]): MockCondition => ({ type: 'and', conditions }),
  };
});

vi.mock('../src/db/client.js', () => {
  const rows: PortraitRow[] = [];

  const db = {
    insert: vi.fn(() => ({
      values: vi.fn(async (value: Record<string, unknown>) => {
        rows.push(normalizeRow(value));
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async (condition: MockCondition | undefined) => {
          return rows.filter((row) => matchesCondition(row, condition)).map((row) => ({ ...row }));
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((patch: Partial<PortraitRow>) => ({
        where: vi.fn(async (condition: MockCondition | undefined) => {
          rows
            .filter((row) => matchesCondition(row, condition))
            .forEach((row) => {
              Object.assign(row, patch, { updatedAt: new Date() });
            });
        }),
      })),
    })),
  };

  return {
    db,
    __resetPortraitRows: () => {
      rows.splice(0, rows.length);
    },
    __getPortraitRows: () => rows,
  };
});

class InMemoryPortraitStorage implements PortraitStorage {
  private readonly store = new Map<string, { data: Buffer; mimeType: string }>();

  async savePortrait(
    data: Buffer,
    mimeType: string,
    portraitId: string,
  ): Promise<PortraitStorageResult> {
    const extension =
      mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
    const storageKey = `${portraitId}.${extension}`;
    this.store.set(storageKey, { data, mimeType });
    return { storageKey, sizeBytes: data.length };
  }

  async loadPortrait(storageKey: string): Promise<Buffer> {
    const entry = this.store.get(storageKey);
    if (!entry) {
      throw new Error(`Missing portrait in storage: ${storageKey}`);
    }
    return entry.data;
  }

  has(storageKey: string): boolean {
    return this.store.has(storageKey);
  }
}

type FetchCall = { url: string; body: Record<string, unknown> };

function createFetchMock() {
  const calls: FetchCall[] = [];
  const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    calls.push({ url, body });

    if (url.endsWith('/ai/portraits/tags')) {
      return new Response(
        JSON.stringify({
          tags: {
            story: { entity_type: 'npc' },
            demographics: { gender: 'male' },
            career: { career_type: 'merchant' },
          },
          confidence: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.endsWith('/ai/portraits/image')) {
      return new Response(
        JSON.stringify({
          image_base64: Buffer.from('generated-image').toString('base64'),
          mime_type: 'image/png',
          prompt_used: 'test prompt',
          model_id: 'gemini-2.0-flash',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'unknown endpoint' }), { status: 404 });
  });

  return { mockFetch, calls };
}

const baseTags: PortraitTags = {
  story: { entity_type: 'npc' },
  demographics: { gender: 'female', age_range: 'adult' },
};

describe.skip('PortraitService integration', () => {
  // Deferred to roadmap — see ROADMAP.md
  let storage: InMemoryPortraitStorage;
  let service: import('../src/services/portrait-service.js').PortraitService;
  let fetchCalls: FetchCall[];
  let resetRows: () => void;
  let getRows: () => PortraitRow[];

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();

    const dbModule = (await import('../src/db/client.js')) as unknown as {
      __resetPortraitRows: () => void;
      __getPortraitRows: () => PortraitRow[];
    };
    resetRows = dbModule.__resetPortraitRows;
    getRows = dbModule.__getPortraitRows;
    resetRows();

    const { mockFetch, calls } = createFetchMock();
    fetchCalls = calls;
    vi.stubGlobal('fetch', mockFetch);

    const { PortraitService } = await import('../src/services/portrait-service.js');
    storage = new InMemoryPortraitStorage();
    service = new PortraitService(storage);
  });

  it('generates portrait with appearance text and stores generated record + bytes', async () => {
    const result = await service.generatePortrait({
      campaignId: 'camp-1',
      subjectNodeId: 'node-1',
      tags: baseTags,
      appearanceText: 'A weathered merchant with silver eyes',
      userId: 'user-1',
    });

    const rows = getRows();
    expect(result.id).toMatch(/^portrait_/);
    expect(fetchCalls.map((call) => call.url)).toEqual([
      'http://localhost:18124/ai/portraits/tags',
      'http://localhost:18124/ai/portraits/image',
    ]);
    expect(fetchCalls[0].body.appearance_text).toBe('A weathered merchant with silver eyes');
    expect(rows).toHaveLength(1);
    expect(rows[0].campaignId).toBe('camp-1');
    expect(rows[0].subjectNodeId).toBe('node-1');
    expect(rows[0].anchorPortraitId).toBe(result.id);
    expect(storage.has(rows[0].storageKey)).toBe(true);
  });

  it('generates portrait without appearance text and skips tag extraction endpoint', async () => {
    await service.generatePortrait({
      campaignId: 'camp-1',
      tags: baseTags,
      userId: 'user-1',
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('http://localhost:18124/ai/portraits/image');
  });

  it('generates portrait with protected flag and persists protected=true', async () => {
    const generated = await service.generatePortrait({
      campaignId: 'camp-2',
      tags: baseTags,
      protected: true,
      sourcePolicy: 'subject_only',
      userId: 'user-2',
    });

    const rows = getRows();
    expect(generated.protected).toBe(true);
    expect(generated.source_policy).toBe('subject_only');
    expect(rows[0].protected).toBe(true);
    expect(rows[0].sourcePolicy).toBe('subject_only');
  });

  it('returns portrait image bytes and mime type from storage', async () => {
    const generated = await service.generatePortrait({
      campaignId: 'camp-1',
      tags: baseTags,
      userId: 'user-1',
    });

    const image = await service.getPortraitImage(generated.id);

    expect(image).not.toBeNull();
    expect(image?.mimeType).toBe('image/png');
    expect(image?.data.toString()).toBe('generated-image');
  });

  it('returns null for non-existent portrait image', async () => {
    const image = await service.getPortraitImage('portrait_missing');
    expect(image).toBeNull();
  });

  it('searches portraits by weighted tag similarity and sorts by score', async () => {
    await service.generatePortrait({
      campaignId: 'camp-search',
      tags: { story: { entity_type: 'npc' }, demographics: { gender: 'male', age_range: 'adult' } },
      userId: 'user-1',
    });
    await service.generatePortrait({
      campaignId: 'camp-search',
      tags: {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female', age_range: 'adult' },
      },
      userId: 'user-1',
    });

    const results = await service.searchPortraits({
      campaignId: 'camp-search',
      tags: { demographics: { gender: 'male', age_range: 'adult' } },
      limit: 10,
    });

    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].portrait.tags.demographics?.gender).toBe('male');
  });

  it('search excludes protected portraits when excludeProtected=true', async () => {
    await service.generatePortrait({
      campaignId: 'camp-filter',
      tags: baseTags,
      protected: false,
      userId: 'user-1',
    });
    await service.generatePortrait({
      campaignId: 'camp-filter',
      tags: baseTags,
      protected: true,
      userId: 'user-1',
    });

    const results = await service.searchPortraits({
      campaignId: 'camp-filter',
      tags: {},
      excludeProtected: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0].portrait.protected).toBe(false);
  });

  it('attaches portrait to node by updating subjectNodeId', async () => {
    const generated = await service.generatePortrait({
      campaignId: 'camp-attach',
      tags: baseTags,
      userId: 'user-1',
    });

    await service.attachPortrait(generated.id, 'node-attached');

    const rows = getRows();
    expect(rows[0].subjectNodeId).toBe('node-attached');
  });

  it('remixes portrait and tracks lineage + reference image payload', async () => {
    const source = await service.generatePortrait({
      campaignId: 'camp-remix',
      subjectNodeId: 'node-source',
      tags: {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female', age_range: 'adult' },
        career: { career_type: 'merchant' },
      },
      userId: 'user-source',
    });

    const remixed = await service.remixPortrait({
      sourcePortraitId: source.id,
      campaignId: 'camp-remix',
      tagsPatch: { demographics: { age_range: 'elder' } },
      promptDelta: 'make it older and sterner',
      targetNodeId: 'node-remix',
      userId: 'user-remix',
    });

    const rows = getRows();
    const remixRow = rows.find((row) => row.id === remixed.id);
    const imageCall = fetchCalls[fetchCalls.length - 1];

    expect(remixRow).toBeDefined();
    expect(remixRow?.sourcePortraitId).toBe(source.id);
    expect(remixRow?.anchorPortraitId).toBe(source.id);
    expect(remixRow?.tags.demographics?.age_range).toBe('elder');
    expect(remixed.source_portrait_id).toBe(source.id);
    expect(remixed.anchor_portrait_id).toBe(source.id);
    expect(imageCall.body.reference_image_base64).toBe(
      Buffer.from('generated-image').toString('base64'),
    );
    expect(imageCall.body.reference_image_mime_type).toBe('image/png');
  });

  it('blocks remix when protected subject_only source targets a different node', async () => {
    const source = await service.generatePortrait({
      campaignId: 'camp-policy',
      subjectNodeId: 'node-allowed',
      tags: baseTags,
      protected: true,
      sourcePolicy: 'subject_only',
      userId: 'user-1',
    });

    await expect(
      service.remixPortrait({
        sourcePortraitId: source.id,
        campaignId: 'camp-policy',
        promptDelta: 'change clothing',
        targetNodeId: 'node-blocked',
        userId: 'user-2',
      }),
    ).rejects.toThrow('Protected portrait can only be remixed for the same subject');
  });

  it('runs full generate -> store -> search -> attach pipeline', async () => {
    const generated = await service.generatePortrait({
      campaignId: 'camp-pipeline',
      tags: {
        story: { entity_type: 'npc' },
        demographics: { gender: 'male' },
        traits: { demeanor: 'calm' },
      },
      appearanceText: 'Tall calm navigator',
      userId: 'user-pipeline',
    });

    const stored = await service.getPortraitImage(generated.id);
    const searched = await service.searchPortraits({
      campaignId: 'camp-pipeline',
      tags: { demographics: { gender: 'male' } },
      limit: 1,
    });
    await service.attachPortrait(generated.id, 'node-pipeline');

    const rows = getRows();
    expect(stored?.data.toString()).toBe('generated-image');
    expect(searched[0].portrait.id).toBe(generated.id);
    expect(rows[0].subjectNodeId).toBe('node-pipeline');
  });
});
