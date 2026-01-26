import BaseNode from './BaseNode';
import { NodeTypes } from '@xyflow/react';

export const nodeTypes: NodeTypes = {
  traveller: BaseNode,
  npc: BaseNode,
  spacecraft: BaseNode,
  world: BaseNode,
  faction: BaseNode,
  location: BaseNode,
  event: BaseNode,
  clue: BaseNode,
  sector: BaseNode,
  custom: BaseNode,
};
