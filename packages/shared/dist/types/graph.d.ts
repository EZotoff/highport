/**
 * Node type enumeration for graph entities
 * Follows Traveller 2e conventions with PlaneShift extensions
 */
export type NodeType = 'traveller' | 'npc' | 'spacecraft' | 'world' | 'faction' | 'location' | 'event' | 'clue' | 'sector' | `custom:${string}`;
/**
 * Graph node representing an entity in the campaign
 */
export interface GraphNode {
    id: string;
    type: NodeType;
    label: string;
    position: {
        x: number;
        y: number;
    };
    metadata: {
        description?: string;
        foundry_uuid?: string;
        tags?: string[];
        image_url?: string;
        portrait_id?: string;
        [key: string]: unknown;
    };
    locked: boolean;
    hidden: boolean;
    created_at: number;
    created_by: string;
}
/**
 * Graph edge representing a relationship between entities
 */
export interface GraphEdge {
    id: string;
    source_id: string;
    target_id: string;
    relation_label: string;
    type: 'directional' | 'bi-directional' | 'undirected';
    weight: number;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
    hidden: boolean;
}
//# sourceMappingURL=graph.d.ts.map