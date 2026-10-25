import * as Y from 'yjs';
import { AuthorizationError } from '../lib/authz.js';

export class CommandError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function map(value: unknown): Y.Map<unknown> {
  if (!(value instanceof Y.Map)) throw new CommandError(404, 'Chargen resource not found');
  return value;
}

export function sessionFor(doc: Y.Doc, sessionId: string): Y.Map<unknown> {
  const session = map(doc.getMap('chargen').get('session'));
  if (session.get('id') !== sessionId) throw new CommandError(404, 'Chargen session not found');
  return session;
}

export function characterFor(doc: Y.Doc, id: string): Y.Map<unknown> {
  return map(map(doc.getMap('chargen').get('characters')).get(id));
}

export type DraftResolution = {
  readonly characterId: string;
  readonly termNumber: number;
  readonly fieldPath: 'eventDescription' | 'mishapDescription';
  readonly decision: 'accepted' | 'rejected' | 'edited';
  readonly edits?: string;
};

export function resolveDraft(doc: Y.Doc, resolution: DraftResolution, userId: string): void {
  const character = characterFor(doc, resolution.characterId);
  const terms: unknown = character.get('terms');
  if (!Array.isArray(terms)) throw new CommandError(404, 'Draft not found');
  let found = false;
  const updated = terms.map((term: unknown) => {
    if (!record(term) || term['termNumber'] !== resolution.termNumber) return term;
    const field = term[resolution.fieldPath];
    if (!record(field) || field['pendingReviewBy'] !== 'gm') return term;
    found = true;
    const log: unknown = field['reviewLog'];
    return {
      ...term,
      [resolution.fieldPath]: {
        ...field,
        status: resolution.decision,
        pendingReviewBy: null,
        reviewedBy: userId,
        ...(resolution.decision === 'edited' ? { value: resolution.edits, source: 'gm' } : {}),
        reviewLog: [
          ...(Array.isArray(log) ? log : []),
          {
            at: Date.now(),
            by: userId,
            from: field['status'],
            to: resolution.decision,
            ...(resolution.edits === undefined ? {} : { edit: resolution.edits }),
          },
        ],
      },
    };
  });
  if (!found) throw new CommandError(404, 'Draft not found');
  character.set('terms', updated);
}

export function acceptLink(doc: Y.Doc, linkId: string, userId: string): void {
  const link = map(map(doc.getMap('chargen').get('crossCharacterLinks')).get(linkId));
  const source = link.get('sourceCharId');
  const target = link.get('targetCharId');
  if (typeof source !== 'string' || typeof target !== 'string')
    throw new CommandError(404, 'Link not found');
  const parties = [source, target].filter((id) => characterFor(doc, id).get('playerId') === userId);
  if (parties.length === 0) throw new AuthorizationError();
  const acceptedBy = map(link.get('acceptedBy'));
  for (const id of parties) acceptedBy.set(id, true);
  link.set('by', userId);
  const both = acceptedBy.has(source) && acceptedBy.has(target);
  link.set('status', both ? 'accepted' : 'pending');
  if (!both) return;
  createLinkEdge(doc, linkId, link);
}

export function createLinkEdge(doc: Y.Doc, linkId: string, link: Y.Map<unknown>): void {
  const source = link.get('sourceCharId');
  const target = link.get('targetCharId');
  const nodes = doc.getMap<Y.Map<unknown>>('nodes');
  let sourceNode: string | undefined;
  let targetNode: string | undefined;
  nodes.forEach((node, id) => {
    const metadata: unknown = node.get('metadata');
    if (!record(metadata)) return;
    if (metadata['chargenId'] === source) sourceNode = id;
    if (metadata['chargenId'] === target) targetNode = id;
  });
  if (!sourceNode || !targetNode) return;
  const edges = doc.getMap<Y.Map<unknown>>('edges');
  const id = `chargen-link-${linkId}`;
  if (edges.has(id)) return;
  const edge = new Y.Map<unknown>();
  edges.set(id, edge);
  for (const [key, value] of Object.entries({
    id,
    source_id: sourceNode,
    target_id: targetNode,
    relation_label: link.get('relationship'),
    type: 'directional',
    weight: 1,
    style: 'solid',
    color: '#71717a',
    hidden: false,
  }))
    edge.set(key, value);
}
