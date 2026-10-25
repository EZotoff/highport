import * as Y from 'yjs';
import { record } from './chargen-command.js';

export class PrivilegedWriteError extends Error {
  readonly code = 4403;
  readonly reason = 'Privileged write rejected';

  constructor(readonly path: string) {
    super('Privileged write rejected');
  }
}

type UpdateActor = {
  readonly userId: string;
  readonly origin?: unknown;
};

function object(value: unknown): Record<string, unknown> {
  return record(value) ? value : {};
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireWrite(allowed: boolean, path: string): void {
  if (!allowed) throw new PrivilegedWriteError(path);
}

type ReviewScope = { readonly path: string; readonly ownerReview: boolean };

function protectReview(before: unknown, after: unknown, scope: ReviewScope): void {
  if (equal(before, after)) return;
  const { path, ownerReview } = scope;
  const left = object(before);
  const right = object(after);
  if (
    left['pendingReviewBy'] === 'gm' ||
    (!ownerReview &&
      ('value' in left ||
        left['source'] === 'ai' ||
        path.endsWith('.provenance') ||
        path.endsWith('.AIProvenance')))
  ) {
    for (const key of ['status', 'pendingReviewBy', 'reviewedBy', 'reviewLog'])
      requireWrite(equal(left[key], right[key]), `${path}.${key}`);
  }
  if (before === undefined && right['source'] === 'ai')
    requireWrite(right['status'] === 'draft', path);
  if (Array.isArray(before) || Array.isArray(after)) {
    const a: readonly unknown[] = Array.isArray(before) ? before : [];
    const b: readonly unknown[] = Array.isArray(after) ? after : [];
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      protectReview(a[i], b[i], { path: `${path}.${i}`, ownerReview });
    return;
  }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
    protectReview(left[key], right[key], { path: `${path}.${key}`, ownerReview });
}

function authorizeChargen(before: unknown, after: unknown, userId: string): void {
  const left = object(before);
  const right = object(after);
  const oldCharacters = object(left['characters']);
  const characters = object(right['characters']);
  for (const id of new Set([...Object.keys(oldCharacters), ...Object.keys(characters)])) {
    const previous = oldCharacters[id];
    const next = characters[id];
    if (equal(previous, next)) continue;
    const owner = object(previous)['playerId'] ?? object(next)['playerId'];
    requireWrite(owner === userId, `chargen.characters.${id}`);
    if (next !== undefined) {
      requireWrite(object(next)['playerId'] === owner, `chargen.characters.${id}.playerId`);
      protectReview(previous, next, { path: `chargen.characters.${id}`, ownerReview: true });
    }
  }
  const oldLinks = object(left['crossCharacterLinks']);
  const links = object(right['crossCharacterLinks']);
  for (const id of new Set([...Object.keys(oldLinks), ...Object.keys(links)])) {
    const previous = object(oldLinks[id]);
    const next = object(links[id]);
    if (equal(previous, next)) continue;
    const path = `chargen.crossCharacterLinks.${id}`;
    for (const key of ['sourceCharId', 'targetCharId', 'resolution']) {
      if (oldLinks[id] !== undefined || key === 'resolution')
        requireWrite(equal(previous[key], next[key]), `${path}.${key}`);
    }
    const oldVotes = object(previous['acceptedBy']);
    const votes = object(next['acceptedBy']);
    for (const party of new Set([...Object.keys(oldVotes), ...Object.keys(votes)])) {
      if (equal(oldVotes[party], votes[party])) continue;
      requireWrite(
        (party === next['sourceCharId'] || party === next['targetCharId']) &&
          object(oldCharacters[party] ?? characters[party])['playerId'] === userId &&
          votes[party] === true,
        `${path}.acceptedBy.${party}`,
      );
    }
    if (!equal(previous['status'], next['status'])) {
      const source = next['sourceCharId'];
      const target = next['targetCharId'];
      const resolution = object(previous['resolution']);
      const status =
        resolution['by'] === 'gm'
          ? resolution['status']
          : typeof source === 'string' &&
              typeof target === 'string' &&
              votes[source] === true &&
              votes[target] === true
            ? 'accepted'
            : 'pending';
      requireWrite(next['status'] === status, `${path}.status`);
    }
  }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (key !== 'characters' && key !== 'crossCharacterLinks')
      protectReview(left[key], right[key], { path: `chargen.${key}`, ownerReview: false });
  }
}

export function applyAuthorizedUpdate(
  document: Y.Doc,
  update: Uint8Array,
  actor: UpdateActor,
): void {
  const candidate = new Y.Doc();
  candidate.getMap('chargen');
  try {
    Y.applyUpdate(candidate, Y.encodeStateAsUpdate(document));
    const before: unknown = candidate.getMap('chargen').toJSON();
    Y.applyUpdate(candidate, update);
    // Deferred structs/deletes could otherwise become effective under a later actor's update.
    requireWrite(
      candidate.store.pendingStructs === null && candidate.store.pendingDs === null,
      'update.dependencies',
    );
    authorizeChargen(before, candidate.getMap('chargen').toJSON(), actor.userId);
    // No await: authorization and commit must be atomic across concurrent connections.
    Y.applyUpdate(document, update, actor.origin);
  } finally {
    candidate.destroy();
  }
}
