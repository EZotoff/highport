import * as Y from 'yjs';
import { record } from './chargen-command.js';

const mirrors = new WeakMap<Y.Doc, Y.Doc>();

export function initializeAudit(document: Y.Doc): void {
  const mirror = new Y.Doc();
  mirror.getMap('chargen');
  Y.applyUpdate(mirror, Y.encodeStateAsUpdate(document));
  mirrors.set(document, mirror);
  document.on('destroy', () => mirror.destroy());
}

function changedPaths(before: unknown, after: unknown, path = 'chargen'): string[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    path.includes('acceptedBy') ||
    path.endsWith('.provenance') ||
    path.endsWith('.AIProvenance') ||
    (record(before) && 'value' in before && 'status' in before) ||
    (record(after) && 'value' in after && 'status' in after)
  )
    return [path];
  if (path.startsWith('chargen.characters.') && path.split('.').length === 3 && after === undefined)
    return [path];
  if (Array.isArray(before) || Array.isArray(after)) {
    const left: readonly unknown[] = Array.isArray(before) ? before : [];
    const right: readonly unknown[] = Array.isArray(after) ? after : [];
    return Array.from({ length: Math.max(left.length, right.length) }, (_, i) =>
      changedPaths(left[i], right[i], `${path}.${i}`),
    ).flat();
  }
  const left = record(before) ? before : {};
  const right = record(after) ? after : {};
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) =>
    changedPaths(left[key], right[key], `${path}.${key}`),
  );
}

export function auditUpdate(document: Y.Doc, update: Uint8Array, origin: unknown): string[] {
  const mirror = mirrors.get(document);
  if (!mirror) return [];
  const before: unknown = mirror.getMap('chargen').toJSON();
  Y.applyUpdate(mirror, update);
  const after: unknown = mirror.getMap('chargen').toJSON();
  return origin === 'server-command' ? [] : changedPaths(before, after);
}
