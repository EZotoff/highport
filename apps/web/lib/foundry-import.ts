import type { GraphNode } from '@planeshift/shared/types/graph';

/**
 * Foundry VTT Actor structure for Mongoose Traveller 2e system
 */
export interface FoundryActor {
  _id: string;
  name: string;
  type: string;
  system: {
    hits?: { value: number; max: number };
    characteristics?: Record<string, { value: number }>;
    finance?: { cash: number };
  };
}

/**
 * Result of matching Foundry actors to PlaneShift graph nodes
 */
export interface ImportResult {
  matched: Array<{
    actorId: string;
    actorName: string;
    nodeId: string;
    changes: Record<string, unknown>;
  }>;
  unmatched: Array<{
    actorId: string;
    actorName: string;
    reason: string;
  }>;
}

/**
 * Parse Foundry actor JSON, handling both array and single-actor formats
 */
export function parseFoundryActors(json: string): FoundryActor[] {
  const data = JSON.parse(json);
  return Array.isArray(data) ? data : [data];
}

/**
 * Map Foundry actor data to PlaneShift node metadata format
 */
export function mapActorToMetadata(actor: FoundryActor): Record<string, unknown> {
  return {
    hp: {
      current: actor.system.hits?.value,
      max: actor.system.hits?.max,
    },
    characteristics: Object.fromEntries(
      Object.entries(actor.system.characteristics || {}).map(([key, val]) => [
        key,
        val.value,
      ])
    ),
    credits: actor.system.finance?.cash,
  };
}

/**
 * Match Foundry actors to PlaneShift graph nodes by foundry_uuid or name
 */
export function matchActorsToNodes(
  actors: FoundryActor[],
  nodes: GraphNode[]
): ImportResult {
  const result: ImportResult = { matched: [], unmatched: [] };

  for (const actor of actors) {
    const node = nodes.find(
      (n) =>
        n.metadata?.foundry_uuid === `Actor.${actor._id}` ||
        n.label.toLowerCase() === actor.name.toLowerCase()
    );

    if (node) {
      result.matched.push({
        actorId: actor._id,
        actorName: actor.name,
        nodeId: node.id,
        changes: mapActorToMetadata(actor),
      });
    } else {
      result.unmatched.push({
        actorId: actor._id,
        actorName: actor.name,
        reason: 'No matching node found',
      });
    }
  }

  return result;
}
