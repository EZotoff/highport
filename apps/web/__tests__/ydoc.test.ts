import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import type { GraphNode, GraphEdge } from '@highport/shared/types/graph';
import {
  createYDoc,
  getNodesMap,
  getEdgesMap,
} from '../lib/ydoc';
import {
  yMapToNode,
  yMapToEdge,
  addNode,
  updateNodePosition,
  deleteNode,
  addEdge,
  deleteEdge,
} from '../lib/yjs-helpers';

describe('Yjs Document Structure', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = createYDoc();
  });

  describe('createYDoc', () => {
    it('should create a Y.Doc with nodes and edges maps', () => {
      const nodes = getNodesMap(doc);
      const edges = getEdgesMap(doc);
      expect(nodes).toBeInstanceOf(Y.Map);
      expect(edges).toBeInstanceOf(Y.Map);
    });
  });

  describe('nodeToYMap / yMapToNode roundtrip', () => {
    it('should convert a node to Y.Map and back without data loss', () => {
      const timestamp = Date.now();
      const node: GraphNode = {
        id: 'node_abc123',
        type: 'traveller',
        label: 'Captain Jameson',
        position: { x: 100, y: 200 },
        metadata: {
          description: 'A seasoned starship captain',
          tags: ['captain', 'veteran'],
        },
        locked: false,
        hidden: false,
        created_at: timestamp,
        created_by: 'user_xyz789',
      };

      addNode(doc, node);
      const nodes = getNodesMap(doc);
      const storedYMap = nodes.get('node_abc123') as Y.Map<unknown>;
      expect(storedYMap).toBeInstanceOf(Y.Map);

      const recovered = yMapToNode(storedYMap);
      expect(recovered).toEqual(node);
    });

    it('should handle custom node types', () => {
      const timestamp = Date.now();
      const node: GraphNode = {
        id: 'node_custom1',
        type: 'custom:starbase',
        label: 'Orbital Station Alpha',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: true,
        hidden: true,
        created_at: timestamp,
        created_by: 'user_gm',
      };

      addNode(doc, node);
      const nodes = getNodesMap(doc);
      const storedYMap = nodes.get('node_custom1') as Y.Map<unknown>;
      const recovered = yMapToNode(storedYMap);
      expect(recovered.type).toBe('custom:starbase');
    });
  });

  describe('edgeToYMap / yMapToEdge roundtrip', () => {
    it('should convert an edge to Y.Map and back without data loss', () => {
      const edge: GraphEdge = {
        id: 'edge_def456',
        source_id: 'node_abc123',
        target_id: 'node_xyz789',
        relation_label: 'Ally',
        type: 'bi-directional',
        weight: 3,
        style: 'solid',
        color: '#00FF00',
        hidden: false,
      };

      addEdge(doc, edge);
      const edges = getEdgesMap(doc);
      const storedYMap = edges.get('edge_def456') as Y.Map<unknown>;
      expect(storedYMap).toBeInstanceOf(Y.Map);

      const recovered = yMapToEdge(storedYMap);
      expect(recovered).toEqual(edge);
    });
  });
});

describe('Yjs Operations', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = createYDoc();
  });

  describe('addNode', () => {
    it('should add a node to the nodes map', () => {
      const node: GraphNode = {
        id: 'node_test1',
        type: 'npc',
        label: 'Merchant Vex',
        position: { x: 50, y: 75 },
        metadata: { description: 'A shady merchant' },
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };

      addNode(doc, node);

      const nodes = getNodesMap(doc);
      expect(nodes.has('node_test1')).toBe(true);

      const storedYMap = nodes.get('node_test1') as Y.Map<unknown>;
      expect(storedYMap).toBeInstanceOf(Y.Map);

      const recovered = yMapToNode(storedYMap);
      expect(recovered.label).toBe('Merchant Vex');
    });
  });

  describe('updateNodePosition', () => {
    it('should update a node position', () => {
      const node: GraphNode = {
        id: 'node_pos1',
        type: 'world',
        label: 'Terra Nova',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };

      addNode(doc, node);
      updateNodePosition(doc, 'node_pos1', { x: 500, y: 300 });

      const nodes = getNodesMap(doc);
      const storedYMap = nodes.get('node_pos1') as Y.Map<unknown>;
      const recovered = yMapToNode(storedYMap);

      expect(recovered.position).toEqual({ x: 500, y: 300 });
    });
  });

  describe('deleteNode', () => {
    it('should delete a node from the nodes map', () => {
      const node: GraphNode = {
        id: 'node_del1',
        type: 'faction',
        label: 'Pirates Guild',
        position: { x: 10, y: 20 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };

      addNode(doc, node);
      expect(getNodesMap(doc).has('node_del1')).toBe(true);

      deleteNode(doc, 'node_del1');
      expect(getNodesMap(doc).has('node_del1')).toBe(false);
    });

    it('should delete connected edges when a node is deleted', () => {
      // Create two nodes
      const nodeA: GraphNode = {
        id: 'node_a',
        type: 'traveller',
        label: 'Node A',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };
      const nodeB: GraphNode = {
        id: 'node_b',
        type: 'npc',
        label: 'Node B',
        position: { x: 100, y: 100 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };
      const nodeC: GraphNode = {
        id: 'node_c',
        type: 'location',
        label: 'Node C',
        position: { x: 200, y: 200 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };

      addNode(doc, nodeA);
      addNode(doc, nodeB);
      addNode(doc, nodeC);

      // Create edges: A->B, B->C
      const edgeAB: GraphEdge = {
        id: 'edge_ab',
        source_id: 'node_a',
        target_id: 'node_b',
        relation_label: 'Knows',
        type: 'directional',
        weight: 1,
        style: 'solid',
        color: '#FFFFFF',
        hidden: false,
      };
      const edgeBC: GraphEdge = {
        id: 'edge_bc',
        source_id: 'node_b',
        target_id: 'node_c',
        relation_label: 'Works at',
        type: 'directional',
        weight: 2,
        style: 'dashed',
        color: '#FF0000',
        hidden: false,
      };

      addEdge(doc, edgeAB);
      addEdge(doc, edgeBC);

      expect(getEdgesMap(doc).has('edge_ab')).toBe(true);
      expect(getEdgesMap(doc).has('edge_bc')).toBe(true);

      // Delete node B - should remove both edges
      deleteNode(doc, 'node_b');

      expect(getNodesMap(doc).has('node_b')).toBe(false);
      expect(getEdgesMap(doc).has('edge_ab')).toBe(false);
      expect(getEdgesMap(doc).has('edge_bc')).toBe(false);

      // Node A and C should still exist
      expect(getNodesMap(doc).has('node_a')).toBe(true);
      expect(getNodesMap(doc).has('node_c')).toBe(true);
    });
  });

  describe('addEdge / deleteEdge', () => {
    it('should add and remove edges', () => {
      const edge: GraphEdge = {
        id: 'edge_test1',
        source_id: 'node_src',
        target_id: 'node_tgt',
        relation_label: 'Enemy',
        type: 'directional',
        weight: 5,
        style: 'dotted',
        color: '#FF0000',
        hidden: true,
      };

      addEdge(doc, edge);
      expect(getEdgesMap(doc).has('edge_test1')).toBe(true);

      const storedYMap = getEdgesMap(doc).get('edge_test1') as Y.Map<unknown>;
      const recovered = yMapToEdge(storedYMap);
      expect(recovered.relation_label).toBe('Enemy');
      expect(recovered.weight).toBe(5);

      deleteEdge(doc, 'edge_test1');
      expect(getEdgesMap(doc).has('edge_test1')).toBe(false);
    });
  });

  describe('transact', () => {
    it('should wrap multiple operations in a single transaction', () => {
      const node1: GraphNode = {
        id: 'node_tx1',
        type: 'event',
        label: 'Event 1',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };
      const node2: GraphNode = {
        id: 'node_tx2',
        type: 'clue',
        label: 'Clue 1',
        position: { x: 100, y: 100 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user_test',
      };

      // Track update events
      let updateCount = 0;
      doc.on('update', () => {
        updateCount++;
      });

      // Add both nodes in a single transaction
      doc.transact(() => {
        addNode(doc, node1);
        addNode(doc, node2);
      });

      expect(getNodesMap(doc).has('node_tx1')).toBe(true);
      expect(getNodesMap(doc).has('node_tx2')).toBe(true);
      // Should have been one transaction, resulting in one update
      expect(updateCount).toBe(1);
    });
  });
});
