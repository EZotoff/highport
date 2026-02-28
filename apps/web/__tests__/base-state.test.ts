import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  initBaseResources,
  updateResource,
  addResource,
  resourceFromMap,
  getResourcesMap,
  deleteResource,
} from '../lib/base-state';
import { createYDoc } from '../lib/ydoc';

describe('Base State Logic', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = createYDoc();
  });

  it('initializes default resources', () => {
    initBaseResources(doc);
    const resourcesMap = getResourcesMap(doc);
    expect(resourcesMap.size).toBe(5);

    const resources = Array.from(resourcesMap.values());
    const credits = resources.find(
      (r) => (r as Y.Map<unknown>).get('name') === 'Credits',
    ) as Y.Map<unknown>;

    expect(credits).toBeDefined();
    expect(credits.get('current')).toBe(0);
  });

  it('updates resource value and adds history', () => {
    const id = addResource(doc, 'Test');
    updateResource(doc, id, { current: 5000 }, 'user-123');

    const resourcesMap = getResourcesMap(doc);
    const resourceMap = resourcesMap.get(id) as Y.Map<unknown>;
    expect(resourceMap.get('current')).toBe(5000);

    const history = (resourceMap.get('history') as Y.Array<any>).toArray();
    expect(history.length).toBe(1);
    expect(history[0].value).toBe(5000);
    expect(history[0].changedBy).toBe('user-123');
  });

  it('adds a custom resource', () => {
    const id = addResource(doc, 'My Custom Resource', 'kg', 100);
    const resourcesMap = getResourcesMap(doc);

    const resourceMap = resourcesMap.get(id) as Y.Map<unknown>;
    expect(resourceMap.get('name')).toBe('My Custom Resource');
    expect(resourceMap.get('current')).toBe(0);
    expect(resourceMap.get('max')).toBe(100);
    expect(resourceMap.get('unit')).toBe('kg');
  });

  it('converts Y.Map to Resource object', () => {
    const id = addResource(doc, 'Test', 'u');
    updateResource(doc, id, { current: 10 }, 'user1');

    const resourcesMap = getResourcesMap(doc);
    const ymap = resourcesMap.get(id) as Y.Map<unknown>;

    const resource = resourceFromMap(ymap);
    expect(resource.name).toBe('Test');
    expect(resource.current).toBe(10);
    expect(resource.unit).toBe('u');
    expect(resource.history.length).toBe(1);
  });

  it('deletes a resource', () => {
    const id = addResource(doc, 'ToDelete');
    deleteResource(doc, id);

    const resourcesMap = getResourcesMap(doc);
    expect(resourcesMap.has(id)).toBe(false);
  });
});
