import { useState } from 'react';
import type { PortraitRecord, PortraitSourcePolicy, PortraitTags } from '@highport/shared/types/portrait';
import { getOrCreateUser } from '../identity';
import { getYDoc } from '../ydoc';
import { updateNodeMetadata } from '../yjs-helpers';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3012';

export interface GeneratePortraitParams {
  campaignId: string;
  subjectNodeId?: string;
  tags: Partial<PortraitTags>;
  appearanceText?: string;
  promptDelta?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  aspectRatio?: string;
  protected?: boolean;
  sourcePolicy?: PortraitSourcePolicy;
  familyGroupId?: string;
}

export interface RemixPortraitParams {
  portraitId: string;
  campaignId: string;
  promptDelta: string;
  tagsPatch?: Partial<PortraitTags>;
  targetNodeId?: string;
  familyGroupId?: string;
  protected?: boolean;
  sourcePolicy?: PortraitSourcePolicy;
}

export function usePortraitGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (params: GeneratePortraitParams): Promise<PortraitRecord> => {
    setIsLoading(true);
    setError(null);
    const user = getOrCreateUser();

    try {
      const response = await fetch(`${SERVER_URL}/api/portraits/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.userId,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Portrait generation failed (${response.status})`);
      }

      const portrait = (await response.json()) as PortraitRecord;
      return {
        ...portrait,
        image_url: normalizeImageUrl(portrait.image_url),
      };
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Unknown error');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  };

  const remix = async (params: RemixPortraitParams): Promise<PortraitRecord> => {
    setIsLoading(true);
    setError(null);
    const user = getOrCreateUser();

    try {
      const response = await fetch(
        `${SERVER_URL}/api/portraits/${params.portraitId}/remix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.userId,
          },
          body: JSON.stringify({
            campaignId: params.campaignId,
            promptDelta: params.promptDelta,
            tagsPatch: params.tagsPatch,
            targetNodeId: params.targetNodeId,
            familyGroupId: params.familyGroupId,
            protected: params.protected,
            sourcePolicy: params.sourcePolicy,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Portrait remix failed (${response.status})`);
      }

      const portrait = (await response.json()) as PortraitRecord;
      return {
        ...portrait,
        image_url: normalizeImageUrl(portrait.image_url),
      };
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Unknown error');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  };

  return { generate, remix, isLoading, error };
}

export function attachPortraitToNode(nodeId: string, portrait: PortraitRecord): void {
  const doc = getYDoc();
  updateNodeMetadata(doc, nodeId, {
    portrait_id: portrait.id,
    image_url: normalizeImageUrl(portrait.image_url),
  });
}

export async function attachPortraitRecord(nodeId: string, portraitId: string): Promise<void> {
  const user = getOrCreateUser();
  const response = await fetch(`${SERVER_URL}/api/nodes/${nodeId}/portrait`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.userId,
    },
    body: JSON.stringify({ portraitId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Portrait attach failed (${response.status})`);
  }
}

function normalizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SERVER_URL}${imageUrl}`;
}
