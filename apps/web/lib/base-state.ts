import * as Y from 'yjs';
import { generateId } from '@planeshift/shared/utils/id';

export interface ResourceChange {
  value: number;
  changedBy: string;
  changedAt: number;
}

export interface Resource {
  id: string;
  name: string;
  current: number;
  max: number | null;
  unit: string;
  history: ResourceChange[];
}

export const DEFAULT_RESOURCES: Omit<Resource, 'id' | 'history'>[] = [
  { name: 'Credits', current: 0, max: null, unit: 'Cr' },
  { name: 'Ship Fuel', current: 100, max: 100, unit: 'tons' },
  { name: 'Cargo Space', current: 0, max: 50, unit: 'tons' },
  { name: 'Maintenance', current: 0, max: null, unit: 'Cr/month' },
  { name: 'Life Support', current: 30, max: 30, unit: 'days' },
];

export function getBaseStateMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('baseState');
}

export function getResourcesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const baseState = getBaseStateMap(doc);
  if (!baseState.has('resources')) {
    baseState.set('resources', new Y.Map());
  }
  return baseState.get('resources') as Y.Map<Y.Map<unknown>>;
}

export function initBaseResources(doc: Y.Doc): void {
  const resourcesMap = getResourcesMap(doc);
  
  if (resourcesMap.size === 0) {
    doc.transact(() => {
      DEFAULT_RESOURCES.forEach(def => {
        const id = generateId('resource');
        const resourceMap = new Y.Map();
        resourceMap.set('id', id);
        resourceMap.set('name', def.name);
        resourceMap.set('current', def.current);
        resourceMap.set('max', def.max);
        resourceMap.set('unit', def.unit);
        resourceMap.set('history', new Y.Array());
        
        resourcesMap.set(id, resourceMap);
      });
    });
  }
}

export function addResource(doc: Y.Doc, name: string, unit: string = '', max: number | null = null): string {
  const resourcesMap = getResourcesMap(doc);
  const id = generateId('resource');
  
  doc.transact(() => {
    const resourceMap = new Y.Map();
    resourceMap.set('id', id);
    resourceMap.set('name', name);
    resourceMap.set('current', 0);
    resourceMap.set('max', max);
    resourceMap.set('unit', unit);
    resourceMap.set('history', new Y.Array());
    
    resourcesMap.set(id, resourceMap);
  });
  
  return id;
}

export function updateResource(
  doc: Y.Doc, 
  resourceId: string, 
  updates: Partial<Omit<Resource, 'id' | 'history'>>, 
  userId: string
): void {
  const resourcesMap = getResourcesMap(doc);
  const resourceMap = resourcesMap.get(resourceId);
  
  if (!resourceMap) return;
  
  doc.transact(() => {
    if (updates.current !== undefined) {
      const currentVal = resourceMap.get('current') as number;
      if (currentVal !== updates.current) {
        const history = resourceMap.get('history') as Y.Array<ResourceChange>;
        if (history) {
          history.push([{
            value: updates.current,
            changedBy: userId,
            changedAt: Date.now()
          }]);
        }
      }
      resourceMap.set('current', updates.current);
    }
    
    if (updates.name !== undefined) resourceMap.set('name', updates.name);
    if (updates.max !== undefined) resourceMap.set('max', updates.max);
    if (updates.unit !== undefined) resourceMap.set('unit', updates.unit);
  });
}

export function deleteResource(doc: Y.Doc, resourceId: string): void {
  const resourcesMap = getResourcesMap(doc);
  if (resourcesMap.has(resourceId)) {
    resourcesMap.delete(resourceId);
  }
}

export function resourceFromMap(map: Y.Map<unknown>): Resource {
  return {
    id: map.get('id') as string,
    name: map.get('name') as string,
    current: map.get('current') as number,
    max: map.get('max') as number | null,
    unit: map.get('unit') as string,
    history: (map.get('history') as Y.Array<ResourceChange>)?.toArray() || [],
  };
}
