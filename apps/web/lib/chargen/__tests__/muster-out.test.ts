import { describe, expect, it } from 'vitest';
import { applyForcedMusterOut } from '../muster-out';
import { unwrapAIField } from '../types';
import type { AIProvenance, CareerTermResult } from '../types';

describe('applyForcedMusterOut', () => {
  const term: CareerTermResult = {
    termNumber: 1,
    careerId: 'army',
    assignmentId: 'infantry',
    startAge: 18,
    survived: false,
    advanced: false,
    currentRank: 0,
    skillsGained: [],
    spawnedEntities: [],
  };
  const opts = {
    generatedMishapDesc: 'old ai text',
    verbosity: 'brief',
    gmApprovalMode: 'moderate',
  } as const;

  it('preserves GM edits when local generated text is stale', () => {
    // Given
    const provenance: AIProvenance<string> = {
      value: 'gm text',
      source: 'gm',
      mode: 'brief',
      status: 'edited',
      pendingReviewBy: null,
      reviewLog: [{ at: 1, by: 'gm', from: 'draft', to: 'edited', edit: 'gm text' }],
    };
    // When
    const result = applyForcedMusterOut([{ ...term, mishapDescription: provenance }], opts);
    // Then
    expect(result[0].mishapDescription).toBe(provenance);
  });

  it('keeps rejected text unavailable when local generated text is stale', () => {
    // Given
    const provenance: AIProvenance<string> = {
      value: 'rejected text',
      source: 'ai',
      mode: 'brief',
      status: 'rejected',
      pendingReviewBy: null,
    };
    // When
    const result = applyForcedMusterOut([{ ...term, mishapDescription: provenance }], opts);
    // Then
    expect(result[0].mishapDescription).toBe(provenance);
    expect(unwrapAIField(result[0].mishapDescription)).toBeUndefined();
  });

  it.each(['moderate', 'strict', 'lenient'] as const)(
    'creates provenance when missing in %s mode',
    (gmApprovalMode) => {
      // Given / When
      const result = applyForcedMusterOut([term], { ...opts, gmApprovalMode });
      // Then
      expect(result[0].mishapDescription).toMatchObject({
        value: opts.generatedMishapDesc,
        source: 'ai',
        status: gmApprovalMode === 'lenient' ? 'accepted' : 'draft',
        pendingReviewBy: gmApprovalMode === 'lenient' ? null : 'gm',
      });
    },
  );

  it('leaves the term unchanged when neither mishap nor description is supplied', () => {
    // Given / When
    const result = applyForcedMusterOut([term], { verbosity: 'brief', gmApprovalMode: 'moderate' });
    // Then
    expect(result).toEqual([term]);
  });
});
