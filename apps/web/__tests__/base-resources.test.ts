import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  initBaseResources,
  addResource,
  updateResource,
  deleteResource,
  getResourcesMap,
  resourceFromMap,
  DEFAULT_RESOURCES,
} from '../lib/base-state';

describe('Base Resources Yjs Logic', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  it('should initialize default resources', () => {
    initBaseResources(doc);
    const resourcesMap = getResourcesMap(doc);
    expect(resourcesMap.size).toBe(5);

    const resources = Array.from(resourcesMap.values()).map((m: any) => resourceFromMap(m));

    expect(resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Credits', current: 0 }),
        expect.objectContaining({ name: 'Ship Fuel', current: 100 }),
      ]),
    );
  });

  it('should add a new resource', () => {
    initBaseResources(doc);
    const id = addResource(doc, 'Test Resource', 'kg', 50);
    const resourcesMap = getResourcesMap(doc);

    expect(resourcesMap.has(id)).toBe(true);
    const resource = resourceFromMap(resourcesMap.get(id) as any);
    expect(resource.name).toBe('Test Resource');
    expect(resource.unit).toBe('kg');
    expect(resource.max).toBe(50);
  });

  it('should update a resource and track history', () => {
    initBaseResources(doc);
    const resourcesMap = getResourcesMap(doc);
    const resources = Array.from(resourcesMap.values()).map((m: any) => resourceFromMap(m));
    const target = resources.find((r) => r.name === 'Credits');

    if (!target) throw new Error('Credits resource not found');

    const userId = 'user-123';
    updateResource(doc, target.id, { current: 500 }, userId);

    const updatedMap = resourcesMap.get(target.id) as any;
    const updatedResource = resourceFromMap(updatedMap);

    expect(updatedResource.current).toBe(500);
    expect(updatedResource.history).toHaveLength(1);
    expect(updatedResource.history[0]).toEqual(
      expect.objectContaining({
        value: 500,
        changedBy: userId,
      }),
    );
  });

  it('should delete a resource', () => {
    initBaseResources(doc);
    const id = addResource(doc, 'To Delete');

    deleteResource(doc, id);
    const resourcesMap = getResourcesMap(doc);
    expect(resourcesMap.has(id)).toBe(false);
  });

  it('should not initialize if already exists', () => {
    initBaseResources(doc);
    const resourcesMap = getResourcesMap(doc);
    const sizeBefore = resourcesMap.size;

    addResource(doc, 'New One');
    expect(resourcesMap.size).toBe(sizeBefore + 1);

    // Call init again, should not reset or duplicate
    initBaseResources(doc);
    expect(resourcesMap.size).toBe(sizeBefore + 1);
  });
});
