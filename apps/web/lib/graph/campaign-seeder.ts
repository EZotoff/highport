import * as Y from 'yjs';
import type { GraphNode, GraphEdge, NodeType } from '@highport/shared/types/graph';
import { generateNodeId, generateEdgeId } from '@highport/shared/utils/id';
import { addNode, addEdge } from '../yjs-helpers';
import { getNodesMap } from '../ydoc';

/** Inline type — CampaignData is not yet exported from @highport/mgt2e */
interface CampaignSeedNode {
  label: string;
  type: NodeType;
  metadata: GraphNode['metadata'];
  locked?: boolean;
  hidden?: boolean;
}
interface CampaignSeedEdge {
  sourceLabel: string;
  targetLabel: string;
  relation_label: string;
  type: GraphEdge['type'];
  weight?: number;
  style?: GraphEdge['style'];
  color?: string;
}
interface CampaignData {
  id: string;
  nodes: CampaignSeedNode[];
  edges: CampaignSeedEdge[];
}

function calculateNodePositions(nodeCount: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const centerX = 400;
  const centerY = 300;
  const spacing = 180;

  if (nodeCount === 1) {
    positions.push({ x: centerX, y: centerY });
  } else {
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const offsetX = ((cols - 1) * spacing) / 2;
    const rows = Math.ceil(nodeCount / cols);
    const offsetY = ((rows - 1) * spacing) / 2;

    for (let i = 0; i < nodeCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({
        x: centerX + col * spacing - offsetX,
        y: centerY + row * spacing - offsetY,
      });
    }
  }

  return positions;
}

export function seedCampaign(
  doc: Y.Doc,
  campaignData: CampaignData,
  userId: string,
): { nodesCreated: number; edgesCreated: number } {
  const positions = calculateNodePositions(campaignData.nodes.length);
  const labelToId = new Map<string, string>();

  doc.transact(() => {
    campaignData.nodes.forEach((seedNode, index) => {
      const id = generateNodeId();
      labelToId.set(seedNode.label, id);

      const existingTags = seedNode.metadata.tags || [];
      const tags = [...new Set([...existingTags, 'seeded', `campaign:${campaignData.id}`])];

      const graphNode: GraphNode = {
        id,
        type: seedNode.type,
        label: seedNode.label,
        position: positions[index] || { x: 400, y: 300 },
        metadata: {
          ...seedNode.metadata,
          tags,
        },
        locked: seedNode.locked ?? false,
        hidden: seedNode.hidden ?? false,
        created_at: Date.now(),
        created_by: userId,
      };

      addNode(doc, graphNode);
    });

    campaignData.edges.forEach((seedEdge) => {
      const sourceId = labelToId.get(seedEdge.sourceLabel);
      const targetId = labelToId.get(seedEdge.targetLabel);

      if (!sourceId || !targetId) {
        console.warn(
          `Edge "${seedEdge.relation_label}" references missing node: ${seedEdge.sourceLabel} -> ${seedEdge.targetLabel}`,
        );
        return;
      }

      const edge: GraphEdge = {
        id: generateEdgeId(),
        source_id: sourceId,
        target_id: targetId,
        relation_label: seedEdge.relation_label,
        type: seedEdge.type,
        weight: seedEdge.weight ?? 1,
        style: seedEdge.style ?? 'solid',
        color: seedEdge.color ?? '#b1b1b7',
        hidden: false,
      };

      addEdge(doc, edge);
    });
  }, 'campaign-seed');

  return {
    nodesCreated: campaignData.nodes.length,
    edgesCreated: campaignData.edges.length,
  };
}

export function isGraphEmpty(doc: Y.Doc): boolean {
  const nodesMap = getNodesMap(doc);
  return nodesMap.size === 0;
}
