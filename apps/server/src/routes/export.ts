import { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import { fetchDocumentState } from '../ws/hocuspocus.js';

interface FoundryActorExport {
  _id: string;
  name: string;
  type: string;
  system: {
    hits?: { value?: number; max?: number };
    characteristics?: Record<string, { value: number }>;
    finance?: { cash?: number };
  };
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  metadata: {
    description?: string;
    foundry_uuid?: string;
    tags?: string[];
    hp?: { current?: number; max?: number };
    characteristics?: Record<string, number>;
    credits?: number;
    [key: string]: unknown;
  };
  locked: boolean;
  hidden: boolean;
  created_at: number;
  created_by: string;
}

interface FoundryActor {
  _id: string;
  name: string;
  type: string;
  system: {
    hits?: { value: number; max: number };
    characteristics?: Record<string, { value: number }>;
    finance?: { cash: number };
  };
}

interface ImportRequestBody {
  actors: FoundryActor[];
  campaignId?: string;
}

interface ImportResult {
  matched: Array<{ name: string; nodeId: string }>;
  unmatched: Array<{ name: string }>;
  updated: number;
}

interface ImportChange {
  nodeId: string;
  actorName: string;
  metadata: Record<string, unknown>;
}

interface ImportResponse extends ImportResult {
  changes?: ImportChange[];
}

const DEFAULT_CAMPAIGN_ID = 'campaign_default';
const DOC_TYPE = 'graph';

function extractNodesFromYDoc(state: Uint8Array): GraphNode[] {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  
  const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<unknown>>;
  const nodes: GraphNode[] = [];
  
  nodesMap.forEach((ymap) => {
    nodes.push({
      id: ymap.get('id') as string,
      type: ymap.get('type') as string,
      label: ymap.get('label') as string,
      position: ymap.get('position') as { x: number; y: number },
      metadata: ymap.get('metadata') as GraphNode['metadata'],
      locked: ymap.get('locked') as boolean,
      hidden: ymap.get('hidden') as boolean,
      created_at: ymap.get('created_at') as number,
      created_by: ymap.get('created_by') as string,
    });
  });
  
  return nodes;
}

function nodeToFoundryActor(node: GraphNode): FoundryActorExport {
  const metadata = node.metadata;
  const hp = metadata?.hp;
  const characteristics = metadata?.characteristics;
  const credits = metadata?.credits;

  return {
    _id: metadata?.foundry_uuid?.replace('Actor.', '') || node.id,
    name: node.label,
    type: 'traveller',
    system: {
      hits: hp ? { value: hp.current, max: hp.max } : undefined,
      characteristics: characteristics
        ? Object.fromEntries(
            Object.entries(characteristics).map(([key, val]) => [key, { value: val }])
          )
        : undefined,
      finance: credits !== undefined ? { cash: credits } : undefined,
    },
  };
}

function mapActorToMetadata(actor: FoundryActor): Record<string, unknown> {
  return {
    hp: {
      current: actor.system.hits?.value,
      max: actor.system.hits?.max,
    },
    characteristics: actor.system.characteristics
      ? Object.fromEntries(
          Object.entries(actor.system.characteristics).map(([key, val]) => [key, val.value])
        )
      : undefined,
    credits: actor.system.finance?.cash,
  };
}

function matchActorsToNodes(
  actors: FoundryActor[],
  nodes: GraphNode[]
): ImportResult {
  const matched: ImportResult['matched'] = [];
  const unmatched: ImportResult['unmatched'] = [];

  for (const actor of actors) {
    const node = nodes.find(
      (n) =>
        n.metadata?.foundry_uuid === `Actor.${actor._id}` ||
        n.label.toLowerCase() === actor.name.toLowerCase()
    );

    if (node) {
      matched.push({ name: actor.name, nodeId: node.id });
    } else {
      unmatched.push({ name: actor.name });
    }
  }

  return { matched, unmatched, updated: matched.length };
}

export async function registerExportRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Querystring: { campaignId?: string };
  }>('/api/export/actors', async (req, reply) => {
    const campaignId = req.query.campaignId || DEFAULT_CAMPAIGN_ID;
    const docId = `${campaignId}:${DOC_TYPE}`;

    try {
      const state = await fetchDocumentState(docId);
      
      if (!state) {
        return { actors: [], count: 0 };
      }

      const nodes = extractNodesFromYDoc(state);
      const actorNodes = nodes.filter((n) => n.type === 'traveller' || n.type === 'npc');
      const actors = actorNodes.map(nodeToFoundryActor);

      return { actors, count: actors.length };
    } catch (error) {
      fastify.log.error(error, 'Failed to export actors');
      reply.code(500);
      return { error: 'Failed to export actors' };
    }
  });

  fastify.get<{
    Querystring: { campaignId?: string };
  }>('/api/export/json', async (req, reply) => {
    const campaignId = req.query.campaignId || DEFAULT_CAMPAIGN_ID;
    const docId = `${campaignId}:${DOC_TYPE}`;

    try {
      const state = await fetchDocumentState(docId);
      
      if (!state) {
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', 'attachment; filename="planeshift-export.json"');
        return { actors: [] };
      }

      const nodes = extractNodesFromYDoc(state);
      const actorNodes = nodes.filter((n) => n.type === 'traveller' || n.type === 'npc');
      const actors = actorNodes.map(nodeToFoundryActor);

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', 'attachment; filename="planeshift-export.json"');
      return { actors };
    } catch (error) {
      fastify.log.error(error, 'Failed to export JSON');
      reply.code(500);
      return { error: 'Failed to export' };
    }
  });

  fastify.post<{
    Body: ImportRequestBody;
  }>('/api/import/actors', async (req, reply) => {
    const { actors, campaignId = DEFAULT_CAMPAIGN_ID } = req.body;
    const docId = `${campaignId}:${DOC_TYPE}`;

    if (!actors || !Array.isArray(actors)) {
      reply.code(400);
      return { error: 'Invalid request: actors array required' };
    }

    try {
      const state = await fetchDocumentState(docId);
      
      if (!state) {
        const response: ImportResponse = {
          matched: [],
          unmatched: actors.map((a) => ({ name: a.name })),
          updated: 0,
        };
        return response;
      }

      const nodes = extractNodesFromYDoc(state);
      const result = matchActorsToNodes(actors, nodes);

      const response: ImportResponse = {
        matched: result.matched,
        unmatched: result.unmatched,
        updated: result.updated,
        changes: actors
          .filter((actor) =>
            result.matched.some((m) => m.name === actor.name)
          )
          .map((actor) => {
            const match = result.matched.find((m) => m.name === actor.name);
            return {
              nodeId: match!.nodeId,
              actorName: actor.name,
              metadata: mapActorToMetadata(actor),
            };
          }),
      };

      return response;
    } catch (error) {
      fastify.log.error(error, 'Failed to process import');
      reply.code(500);
      return { error: 'Failed to process import' };
    }
  });
}

export { extractNodesFromYDoc, nodeToFoundryActor, mapActorToMetadata, matchActorsToNodes };
