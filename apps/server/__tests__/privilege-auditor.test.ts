import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import { auditUpdate, initializeAudit } from '../src/services/privilege-auditor.js';

describe('privilege audit', () => {
  it.each(['client', 'server-command'])('audits privileged changes with origin %s', (origin) => {
    // Given
    const doc = new Y.Doc();
    const characters = new Y.Map<unknown>();
    doc.getMap('chargen').set('characters', characters);
    const char = new Y.Map<unknown>();
    characters.set('char', char);
    char.set('terms', [{ eventDescription: { value: 'draft', status: 'draft' } }]);
    initializeAudit(doc);
    let paths: string[] = [];
    doc.on('update', (update: Uint8Array) => {
      paths = auditUpdate(doc, update, origin);
    });
    // When
    char.set('terms', [{ eventDescription: { value: 'forged', status: 'accepted' } }]);
    // Then
    expect(paths).toEqual(
      origin === 'server-command' ? [] : ['chargen.characters.char.terms.0.eventDescription'],
    );
    doc.destroy();
  });

  it('detects deletion when a client removes another character', () => {
    // Given
    const doc = new Y.Doc();
    const characters = new Y.Map<unknown>();
    doc.getMap('chargen').set('characters', characters);
    characters.set('victim', new Y.Map());
    initializeAudit(doc);
    let paths: string[] = [];
    doc.on('update', (update: Uint8Array) => {
      paths = auditUpdate(doc, update, 'client');
    });
    // When
    characters.delete('victim');
    // Then
    expect(paths).toEqual(['chargen.characters.victim']);
    doc.destroy();
  });
});
