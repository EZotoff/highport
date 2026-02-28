import JSZip from 'jszip';
import type { GraphNode } from '@highport/shared/types/graph';

export interface FoundryActorExport {
  _id: string;
  name: string;
  type: string;
  system: {
    hits?: { value?: number; max?: number };
    characteristics?: Record<string, { value: number }>;
    finance?: { cash?: number };
  };
}

export function generateFoundryActorJson(node: GraphNode): FoundryActorExport {
  const metadata = node.metadata as Record<string, unknown>;
  const hp = metadata?.hp as { current?: number; max?: number } | undefined;
  const characteristics = metadata?.characteristics as Record<string, number> | undefined;
  const credits = metadata?.credits as number | undefined;

  return {
    _id: node.metadata?.foundry_uuid?.replace('Actor.', '') || node.id,
    name: node.label,
    type: 'traveller',
    system: {
      hits: {
        value: hp?.current,
        max: hp?.max,
      },
      characteristics: characteristics
        ? Object.fromEntries(
            Object.entries(characteristics).map(([key, val]) => [key, { value: val }]),
          )
        : undefined,
      finance: {
        cash: credits,
      },
    },
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

export async function exportNodesToZip(nodes: GraphNode[]): Promise<Blob> {
  const zip = new JSZip();

  for (const node of nodes) {
    if (node.type === 'traveller') {
      const json = generateFoundryActorJson(node);
      zip.file(`actors/${sanitizeFilename(node.label)}.json`, JSON.stringify(json, null, 2));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
