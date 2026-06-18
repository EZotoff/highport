import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { portraits } from '../db/schema.js';
import { generateId } from '@highport/shared/utils/id';
import type {
  PortraitRecord,
  PortraitSearchResult,
  PortraitSourcePolicy,
  PortraitTags,
} from '@highport/shared/types/portrait';
import { LocalPortraitStorage, type PortraitStorage } from '../storage/portrait-storage.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:18124';

export class PortraitUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortraitUnavailableError';
  }
}

export interface GeneratePortraitInput {
  campaignId: string;
  subjectNodeId?: string;
  tags: Partial<PortraitTags>;
  appearanceText?: string;
  promptDelta?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  aspectRatio?: string;
  protected?: boolean;
  sourcePolicy?: PortraitRecord['source_policy'];
  familyGroupId?: string;
  userId: string;
}

export interface SearchPortraitInput {
  campaignId: string;
  tags?: Partial<PortraitTags>;
  limit?: number;
  excludeProtected?: boolean;
}

export interface RemixPortraitInput {
  sourcePortraitId: string;
  campaignId: string;
  tagsPatch?: Partial<PortraitTags>;
  promptDelta: string;
  targetNodeId?: string;
  familyGroupId?: string;
  protected?: boolean;
  sourcePolicy?: PortraitRecord['source_policy'];
  userId: string;
}

export interface PortraitImageResult {
  data: Buffer;
  mimeType: string;
}

export interface PortraitServiceApi {
  generatePortrait(input: GeneratePortraitInput): Promise<PortraitRecord & { image_url: string }>;
  getPortraitImage(portraitId: string): Promise<PortraitImageResult | null>;
  attachPortrait(portraitId: string, subjectNodeId: string): Promise<void>;
  searchPortraits(input: SearchPortraitInput): Promise<PortraitSearchResult[]>;
  remixPortrait(input: RemixPortraitInput): Promise<PortraitRecord & { image_url: string }>;
}

export class PortraitService implements PortraitServiceApi {
  constructor(private storage: PortraitStorage = new LocalPortraitStorage()) {}

  async generatePortrait(
    input: GeneratePortraitInput,
  ): Promise<PortraitRecord & { image_url: string }> {
    const baseTags = ensureStoryTags(input.tags);
    const extractedTags = input.appearanceText
      ? await this.extractTags(input.appearanceText, baseTags)
      : null;
    const mergedTags = mergeTags(extractedTags, baseTags);

    const imageResponse = await this.generateImage({
      tags: mergedTags,
      appearanceText: input.appearanceText,
      promptDelta: input.promptDelta,
      referenceImageBase64: input.referenceImageBase64,
      referenceImageMimeType: input.referenceImageMimeType,
      aspectRatio: input.aspectRatio,
    });

    const portraitId = generateId('portrait');
    const imageBuffer = Buffer.from(imageResponse.imageBase64, 'base64');
    const storageResult = await this.storage.savePortrait(
      imageBuffer,
      imageResponse.mimeType,
      portraitId,
    );

    const promptFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(mergedTags))
      .digest('hex');

    await db.insert(portraits).values({
      id: portraitId,
      campaignId: input.campaignId,
      subjectNodeId: input.subjectNodeId,
      anchorPortraitId: input.subjectNodeId ? portraitId : null,
      sourcePortraitId: null,
      familyGroupId: input.familyGroupId,
      protected: input.protected ?? false,
      sourcePolicy: input.sourcePolicy ?? 'campaign',
      tags: mergedTags,
      prompt: imageResponse.promptUsed,
      promptFingerprint,
      modelId: imageResponse.modelId,
      storageKey: storageResult.storageKey,
      mimeType: imageResponse.mimeType,
      sizeBytes: storageResult.sizeBytes,
      createdByUserId: input.userId,
    });

    return {
      id: portraitId,
      campaign_id: input.campaignId,
      subject_node_id: input.subjectNodeId,
      anchor_portrait_id: input.subjectNodeId ? portraitId : undefined,
      source_portrait_id: undefined,
      family_group_id: input.familyGroupId,
      protected: input.protected ?? false,
      source_policy: input.sourcePolicy ?? 'campaign',
      tags: mergedTags,
      prompt: imageResponse.promptUsed,
      prompt_fingerprint: promptFingerprint,
      model_id: imageResponse.modelId,
      storage_key: storageResult.storageKey,
      mime_type: imageResponse.mimeType,
      size_bytes: storageResult.sizeBytes,
      created_by_user_id: input.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: buildPortraitImageUrl(portraitId),
    };
  }

  async getPortraitImage(portraitId: string): Promise<PortraitImageResult | null> {
    const record = await db.select().from(portraits).where(eq(portraits.id, portraitId));

    if (record.length === 0) return null;
    const portrait = record[0];
    const data = await this.storage.loadPortrait(portrait.storageKey);
    return { data, mimeType: portrait.mimeType };
  }

  async attachPortrait(portraitId: string, subjectNodeId: string): Promise<void> {
    await db.update(portraits).set({ subjectNodeId }).where(eq(portraits.id, portraitId));
  }

  async searchPortraits(input: SearchPortraitInput): Promise<PortraitSearchResult[]> {
    const conditions = [eq(portraits.campaignId, input.campaignId)];
    if (input.excludeProtected) {
      conditions.push(eq(portraits.protected, false));
    }

    const results = await db
      .select()
      .from(portraits)
      .where(and(...conditions));

    const targetTags = input.tags || {};
    const scored = results.map((portrait) => {
      const { score, breakdown } = calculateTagSimilarity(
        portrait.tags as PortraitTags,
        targetTags,
      );
      return {
        portrait: toPortraitRecord(portrait, buildPortraitImageUrl(portrait.id)),
        score,
        score_breakdown: breakdown,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const limit = input.limit ?? 20;
    return scored.slice(0, limit);
  }

  async remixPortrait(input: RemixPortraitInput): Promise<PortraitRecord & { image_url: string }> {
    const sourceRecords = await db
      .select()
      .from(portraits)
      .where(eq(portraits.id, input.sourcePortraitId));

    if (sourceRecords.length === 0) {
      throw new Error('Source portrait not found');
    }

    const source = sourceRecords[0];
    enforceRemixPolicy(source, input.targetNodeId, input.familyGroupId);

    const sourceImage = await this.storage.loadPortrait(source.storageKey);
    const referenceBase64 = sourceImage.toString('base64');

    const patchedTags = mergeTags(
      source.tags as PortraitTags,
      input.tagsPatch ? ensureStoryTags(input.tagsPatch) : (source.tags as PortraitTags),
    );

    const imageResponse = await this.generateImage({
      tags: patchedTags,
      appearanceText: undefined,
      promptDelta: input.promptDelta,
      referenceImageBase64: referenceBase64,
      referenceImageMimeType: source.mimeType,
    });

    const portraitId = generateId('portrait');
    const imageBuffer = Buffer.from(imageResponse.imageBase64, 'base64');
    const storageResult = await this.storage.savePortrait(
      imageBuffer,
      imageResponse.mimeType,
      portraitId,
    );

    const promptFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(patchedTags))
      .digest('hex');

    const anchorId = source.anchorPortraitId ?? source.id;

    await db.insert(portraits).values({
      id: portraitId,
      campaignId: input.campaignId,
      subjectNodeId: input.targetNodeId,
      anchorPortraitId: anchorId,
      sourcePortraitId: source.id,
      familyGroupId: input.familyGroupId ?? source.familyGroupId,
      protected: input.protected ?? source.protected,
      sourcePolicy: input.sourcePolicy ?? (source.sourcePolicy as PortraitRecord['source_policy']),
      tags: patchedTags,
      prompt: imageResponse.promptUsed,
      promptFingerprint,
      modelId: imageResponse.modelId,
      storageKey: storageResult.storageKey,
      mimeType: imageResponse.mimeType,
      sizeBytes: storageResult.sizeBytes,
      createdByUserId: input.userId,
    });

    return {
      id: portraitId,
      campaign_id: input.campaignId,
      subject_node_id: input.targetNodeId,
      anchor_portrait_id: anchorId,
      source_portrait_id: source.id,
      family_group_id: input.familyGroupId ?? source.familyGroupId ?? undefined,
      protected: input.protected ?? source.protected,
      source_policy: (input.sourcePolicy ?? source.sourcePolicy) as PortraitSourcePolicy,
      tags: patchedTags,
      prompt: imageResponse.promptUsed,
      prompt_fingerprint: promptFingerprint,
      model_id: imageResponse.modelId,
      storage_key: storageResult.storageKey,
      mime_type: imageResponse.mimeType,
      size_bytes: storageResult.sizeBytes,
      created_by_user_id: input.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: buildPortraitImageUrl(portraitId),
    };
  }

  private async extractTags(
    appearanceText: string,
    tags: PortraitTags,
  ): Promise<PortraitTags | null> {
    const response = await fetch(`${RAG_SERVICE_URL}/ai/portraits/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appearance_text: appearanceText,
        career: tags.career?.career_type || null,
        characteristics: null,
        entity_type: tags.story.entity_type,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.tags as PortraitTags;
  }

  private async generateImage(input: {
    tags: PortraitTags;
    appearanceText?: string;
    promptDelta?: string;
    referenceImageBase64?: string;
    referenceImageMimeType?: string;
    aspectRatio?: string;
  }): Promise<{ imageBase64: string; mimeType: string; promptUsed: string; modelId: string }> {
    let response: Response | undefined;
    try {
      response = await fetch(`${RAG_SERVICE_URL}/ai/portraits/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: input.tags,
          appearance_text: input.appearanceText,
          prompt_delta: input.promptDelta,
          reference_image_base64: input.referenceImageBase64,
          reference_image_mime_type: input.referenceImageMimeType,
          aspect_ratio: input.aspectRatio,
        }),
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new PortraitUnavailableError(
          `Portrait generation unavailable: network error (${error.message})`,
        );
      }
      throw error;
    }

    if (!response.ok) {
      if (response.status >= 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new PortraitUnavailableError(
          errorData.detail || `Portrait generation unavailable (${response.status})`,
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Portrait generation failed with ${response.status}`);
    }

    const data = await response.json();
    return {
      imageBase64: data.image_base64,
      mimeType: data.mime_type,
      promptUsed: data.prompt_used,
      modelId: data.model_id,
    };
  }
}

const defaultPortraitService = new PortraitService();

export function getPortraitService(): PortraitServiceApi {
  return defaultPortraitService;
}

export async function generatePortrait(
  input: GeneratePortraitInput,
): Promise<PortraitRecord & { image_url: string }> {
  return defaultPortraitService.generatePortrait(input);
}

export async function getPortraitImage(portraitId: string): Promise<PortraitImageResult | null> {
  return defaultPortraitService.getPortraitImage(portraitId);
}

export async function attachPortrait(portraitId: string, subjectNodeId: string): Promise<void> {
  return defaultPortraitService.attachPortrait(portraitId, subjectNodeId);
}

export async function searchPortraits(input: SearchPortraitInput): Promise<PortraitSearchResult[]> {
  return defaultPortraitService.searchPortraits(input);
}

export async function remixPortrait(
  input: RemixPortraitInput,
): Promise<PortraitRecord & { image_url: string }> {
  return defaultPortraitService.remixPortrait(input);
}

export function ensureStoryTags(tags: Partial<PortraitTags>): PortraitTags {
  if (!tags.story) {
    return {
      ...tags,
      story: { entity_type: 'npc' },
    } as PortraitTags;
  }
  return tags as PortraitTags;
}

export function mergeTags(extracted: PortraitTags | null, overrides: PortraitTags): PortraitTags {
  if (!extracted) return overrides;
  return deepMerge(
    extracted as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>,
  ) as unknown as PortraitTags;
}

export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const baseValue = (base[key] as Record<string, unknown>) || {};
      result[key] = deepMerge(baseValue, value as Record<string, unknown>);
    } else if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
}

function toPortraitRecord(record: typeof portraits.$inferSelect, imageUrl: string): PortraitRecord {
  return {
    id: record.id,
    campaign_id: record.campaignId,
    subject_node_id: record.subjectNodeId ?? undefined,
    anchor_portrait_id: record.anchorPortraitId ?? undefined,
    source_portrait_id: record.sourcePortraitId ?? undefined,
    family_group_id: record.familyGroupId ?? undefined,
    protected: record.protected,
    source_policy: record.sourcePolicy as PortraitSourcePolicy,
    tags: record.tags as PortraitTags,
    prompt: record.prompt ?? undefined,
    prompt_fingerprint: record.promptFingerprint ?? undefined,
    model_id: record.modelId ?? undefined,
    storage_key: record.storageKey,
    mime_type: record.mimeType,
    size_bytes: record.sizeBytes ?? undefined,
    width: record.width ?? undefined,
    height: record.height ?? undefined,
    created_by_user_id: record.createdByUserId,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    image_url: imageUrl,
  };
}

export function calculateTagSimilarity(
  portraitTags: PortraitTags,
  filterTags: Partial<PortraitTags>,
): { score: number; breakdown: Record<string, number> } {
  const weights = {
    demographics: 5,
    physical: 3,
    career: 3,
    traits: 2,
    background: 2,
    rendering: 1,
  };

  const breakdown: Record<string, number> = {};
  let totalWeight = 0;
  let matchedWeight = 0;

  (Object.keys(weights) as Array<keyof typeof weights>).forEach((category) => {
    const target = filterTags[category];
    if (!target) return;
    totalWeight += weights[category];
    const score = matchObject(
      portraitTags[category] as Record<string, unknown> | undefined,
      target as Record<string, unknown>,
    );
    breakdown[category] = score;
    matchedWeight += score * weights[category];
  });

  const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  return { score, breakdown };
}

export function matchObject(
  source: Record<string, unknown> | undefined,
  target: Record<string, unknown>,
): number {
  if (!source) return 0;
  const entries = Object.entries(target).filter(([, value]) => value !== undefined);
  if (entries.length == 0) return 0;
  let matches = 0;
  entries.forEach(([key, value]) => {
    const sourceValue = source[key];
    if (Array.isArray(value) && Array.isArray(sourceValue)) {
      const intersection = value.filter((item) => sourceValue.includes(item));
      if (intersection.length > 0) {
        matches += intersection.length / value.length;
      }
    } else if (sourceValue === value) {
      matches += 1;
    }
  });
  return matches / entries.length;
}

function buildPortraitImageUrl(portraitId: string): string {
  return `/api/portraits/${portraitId}/image`;
}

export function enforceRemixPolicy(
  source: typeof portraits.$inferSelect,
  targetNodeId?: string,
  targetFamilyGroupId?: string,
): void {
  if (!source.protected) return;

  if (source.sourcePolicy === 'subject_only') {
    if (!targetNodeId || (source.subjectNodeId && source.subjectNodeId !== targetNodeId)) {
      throw new Error('Protected portrait can only be remixed for the same subject');
    }
  }

  if (source.sourcePolicy === 'family_only') {
    if (source.familyGroupId && targetFamilyGroupId !== source.familyGroupId) {
      throw new Error('Protected portrait can only be remixed for family members');
    }
  }
}
