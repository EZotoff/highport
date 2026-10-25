import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import { map } from '../src/services/chargen-command.js';
import { applyAuthorizedUpdate } from '../src/services/privilege-enforcement.js';

function fixture(): Y.Doc {
  const doc = new Y.Doc();
  const root = doc.getMap('chargen');
  const characters = new Y.Map<unknown>();
  root.set('characters', characters);
  for (const id of ['a', 'b']) {
    const character = new Y.Map<unknown>();
    characters.set(id, character);
    character.set('playerId', `owner-${id}`);
    character.set('name', id);
    character.set('terms', [{ eventDescription: { value: 'draft', status: 'draft' } }]);
  }
  const links = new Y.Map<unknown>();
  root.set('crossCharacterLinks', links);
  const link = new Y.Map<unknown>();
  links.set('link', link);
  link.set('sourceCharId', 'a');
  link.set('targetCharId', 'b');
  link.set('status', 'pending');
  link.set('acceptedBy', new Y.Map<unknown>());
  return doc;
}

function updateFor(doc: Y.Doc, mutate: (copy: Y.Doc) => void): Uint8Array {
  const copy = new Y.Doc();
  copy.getMap('chargen');
  Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc));
  const vector = Y.encodeStateVector(copy);
  mutate(copy);
  const update = Y.encodeStateAsUpdate(copy, vector);
  copy.destroy();
  return update;
}

const character = (doc: Y.Doc) => map(map(doc.getMap('chargen').get('characters')).get('a'));
const link = (doc: Y.Doc) => map(map(doc.getMap('chargen').get('crossCharacterLinks')).get('link'));

describe('privilege enforcement', () => {
  it.each(['delete', 'mutate', 'provenance', 'ownership'])(
    'rejects non-owner %s without changing the authoritative document',
    (action) => {
      // Given
      const doc = fixture();
      const before = doc.getMap('chargen').toJSON();
      const update = updateFor(doc, (copy) => {
        if (action === 'delete') map(copy.getMap('chargen').get('characters')).delete('a');
        if (action === 'mutate') character(copy).set('name', 'forged');
        if (action === 'ownership') character(copy).set('playerId', 'owner-b');
        if (action === 'provenance')
          character(copy).set('terms', [
            { eventDescription: { value: 'draft', status: 'accepted' } },
          ]);
      });
      // When / Then
      expect(() => applyAuthorizedUpdate(doc, update, { userId: 'owner-b' })).toThrow();
      expect(doc.getMap('chargen').toJSON()).toEqual(before);
      doc.destroy();
    },
  );

  it.each(['delete', 'mutate', 'provenance'])('allows owner %s', (action) => {
    // Given
    const doc = fixture();
    const update = updateFor(doc, (copy) => {
      if (action === 'delete') map(copy.getMap('chargen').get('characters')).delete('a');
      if (action === 'mutate') character(copy).set('name', 'new name');
      if (action === 'provenance')
        character(copy).set('terms', [
          { eventDescription: { value: 'draft', status: 'accepted' } },
        ]);
    });
    // When
    applyAuthorizedUpdate(doc, update, { userId: 'owner-a' });
    // Then
    if (action === 'delete')
      expect(map(doc.getMap('chargen').get('characters')).has('a')).toBe(false);
    if (action === 'mutate') expect(character(doc).get('name')).toBe('new name');
    if (action === 'provenance')
      expect(character(doc).get('terms')).toEqual([
        { eventDescription: { value: 'draft', status: 'accepted' } },
      ]);
    doc.destroy();
  });

  it('rejects acceptedBy forgery for the other side', () => {
    // Given
    const doc = fixture();
    const update = updateFor(doc, (copy) => map(link(copy).get('acceptedBy')).set('b', true));
    // When / Then
    expect(() => applyAuthorizedUpdate(doc, update, { userId: 'owner-a' })).toThrow();
    expect(map(link(doc).get('acceptedBy')).size).toBe(0);
    doc.destroy();
  });

  it('allows dual acceptance when each owner writes their own side', () => {
    // Given
    const doc = fixture();
    const first = updateFor(doc, (copy) => map(link(copy).get('acceptedBy')).set('a', true));
    applyAuthorizedUpdate(doc, first, { userId: 'owner-a' });
    const second = updateFor(doc, (copy) => {
      map(link(copy).get('acceptedBy')).set('b', true);
      link(copy).set('status', 'accepted');
    });
    // When
    applyAuthorizedUpdate(doc, second, { userId: 'owner-b' });
    // Then
    expect(map(link(doc).get('acceptedBy')).toJSON()).toEqual({ a: true, b: true });
    expect(link(doc).get('status')).toBe('accepted');
    doc.destroy();
  });

  it('rejects a GM-pending provenance resolution even from the character owner', () => {
    // Given
    const doc = fixture();
    character(doc).set('terms', [
      {
        eventDescription: {
          value: 'draft',
          status: 'draft',
          pendingReviewBy: 'gm',
          source: 'ai',
        },
      },
    ]);
    const update = updateFor(doc, (copy) =>
      character(copy).set('terms', [
        {
          eventDescription: {
            value: 'draft',
            status: 'accepted',
            pendingReviewBy: null,
            source: 'ai',
          },
        },
      ]),
    );
    // When / Then
    expect(() => applyAuthorizedUpdate(doc, update, { userId: 'owner-a' })).toThrow();
    expect(character(doc).get('terms')).toEqual([
      {
        eventDescription: {
          value: 'draft',
          status: 'draft',
          pendingReviewBy: 'gm',
          source: 'ai',
        },
      },
    ]);
    doc.destroy();
  });

  it('rejects a forged accepted link status without both votes', () => {
    // Given
    const doc = fixture();
    const update = updateFor(doc, (copy) => link(copy).set('status', 'accepted'));
    // When / Then
    expect(() => applyAuthorizedUpdate(doc, update, { userId: 'owner-a' })).toThrow();
    expect(link(doc).get('status')).toBe('pending');
    doc.destroy();
  });

  it('allows independent concurrent votes from the same base', () => {
    // Given
    const doc = fixture();
    const first = updateFor(doc, (copy) => map(link(copy).get('acceptedBy')).set('a', true));
    const second = updateFor(doc, (copy) => map(link(copy).get('acceptedBy')).set('b', true));
    // When
    applyAuthorizedUpdate(doc, first, { userId: 'owner-a' });
    applyAuthorizedUpdate(doc, second, { userId: 'owner-b' });
    // Then
    expect(map(link(doc).get('acceptedBy')).toJSON()).toEqual({ a: true, b: true });
    doc.destroy();
  });

  it('rejects deferred structs that would activate under a later actor', () => {
    // Given
    const doc = fixture();
    const copy = new Y.Doc();
    copy.getMap('chargen');
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc));
    character(copy).set('name', 'dependency');
    const vector = Y.encodeStateVector(copy);
    character(copy).set('name', 'forged');
    const update = Y.encodeStateAsUpdate(copy, vector);
    // When / Then
    expect(() => applyAuthorizedUpdate(doc, update, { userId: 'owner-b' })).toThrow();
    expect(doc.store.pendingStructs).toBeNull();
    copy.destroy();
    doc.destroy();
  });
});
