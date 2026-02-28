import { describe, expect, it } from 'vitest';
import type { PortraitTags } from '@highport/shared/types/portrait';
import {
  calculateTagSimilarity,
  deepMerge,
  enforceRemixPolicy,
  ensureStoryTags,
  mergeTags,
} from '../src/services/portrait-service.js';

function makeSource(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    protected: false,
    sourcePolicy: 'campaign',
    subjectNodeId: null,
    familyGroupId: null,
    ...overrides,
  };
}

describe('portrait service utility functions', () => {
  describe('calculateTagSimilarity', () => {
    it('scores full demographics exact match at 1.0 with high-weight category', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: {
          gender: 'female',
          age_range: 'adult',
        },
      };

      const result = calculateTagSimilarity(portraitTags, {
        demographics: {
          gender: 'female',
          age_range: 'adult',
        },
      });

      expect(result.breakdown.demographics).toBe(1);
      expect(result.score).toBe(1);
    });

    it('scores partial demographics match when one field mismatches', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: {
          gender: 'male',
          age_range: 'adult',
        },
      };

      const result = calculateTagSimilarity(portraitTags, {
        demographics: {
          gender: 'male',
          age_range: 'elder',
        },
      });

      expect(result.breakdown.demographics).toBe(0.5);
      expect(result.score).toBe(0.5);
    });

    it('scores career category using career weight path', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        career: { career_type: 'scout' },
      };

      const result = calculateTagSimilarity(portraitTags, {
        career: { career_type: 'scout' },
      });

      expect(result.breakdown.career).toBe(1);
      expect(result.score).toBe(1);
    });

    it('scores traits category matches', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        traits: { demeanor: 'calm', vibe: 'professional' },
      };

      const result = calculateTagSimilarity(portraitTags, {
        traits: { demeanor: 'calm', vibe: 'professional' },
      });

      expect(result.breakdown.traits).toBe(1);
      expect(result.score).toBe(1);
    });

    it('computes weighted average across multiple categories', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female', age_range: 'adult' },
        career: { career_type: 'merchant' },
        traits: { demeanor: 'stern' },
      };

      const result = calculateTagSimilarity(portraitTags, {
        demographics: { gender: 'female', age_range: 'elder' },
        career: { career_type: 'merchant' },
        traits: { demeanor: 'friendly' },
      });

      expect(result.breakdown.demographics).toBe(0.5);
      expect(result.breakdown.career).toBe(1);
      expect(result.breakdown.traits).toBe(0);
      expect(result.score).toBeCloseTo(0.55);
    });

    it('returns zero score when filter tags are empty', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female' },
      };

      const result = calculateTagSimilarity(portraitTags, {});

      expect(result.score).toBe(0);
      expect(result.breakdown).toEqual({});
    });

    it('returns zero category scores when portrait tags are missing requested categories', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
      };

      const result = calculateTagSimilarity(portraitTags, {
        demographics: { gender: 'male' },
        career: { career_type: 'navy' },
      });

      expect(result.breakdown.demographics).toBe(0);
      expect(result.breakdown.career).toBe(0);
      expect(result.score).toBe(0);
    });

    it('supports partial array matches in physical distinguishing features', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        physical: {
          distinguishing_features: ['scar', 'beard'],
        },
      };

      const result = calculateTagSimilarity(portraitTags, {
        physical: {
          distinguishing_features: ['scar', 'tattoo'],
        },
      });

      expect(result.breakdown.physical).toBe(0.5);
      expect(result.score).toBe(0.5);
    });

    it('returns one when all targeted categories fully match', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female' },
        physical: { build: 'athletic' },
        career: { career_type: 'agent' },
        traits: { demeanor: 'calm' },
        background: { social_class: 'middle' },
        rendering: { style: 'cinematic' },
      };

      const filterTags: Partial<PortraitTags> = {
        demographics: { gender: 'female' },
        physical: { build: 'athletic' },
        career: { career_type: 'agent' },
        traits: { demeanor: 'calm' },
        background: { social_class: 'middle' },
        rendering: { style: 'cinematic' },
      };

      const result = calculateTagSimilarity(portraitTags, filterTags);
      expect(result.score).toBe(1);
    });

    it('returns zero when no targeted fields match', () => {
      const portraitTags: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: { gender: 'female', age_range: 'adult' },
        career: { career_type: 'merchant' },
      };

      const result = calculateTagSimilarity(portraitTags, {
        demographics: { gender: 'male', age_range: 'elder' },
        career: { career_type: 'navy' },
      });

      expect(result.score).toBe(0);
      expect(result.breakdown.demographics).toBe(0);
      expect(result.breakdown.career).toBe(0);
    });
  });

  describe('enforceRemixPolicy', () => {
    it('allows remix for non-protected portraits', () => {
      const source = makeSource({ protected: false, sourcePolicy: 'subject_only' });
      expect(() => enforceRemixPolicy(source as never, 'node-2', 'fam-2')).not.toThrow();
    });

    it('allows subject_only remix when target node matches source subject', () => {
      const source = makeSource({
        protected: true,
        sourcePolicy: 'subject_only',
        subjectNodeId: 'node-1',
      });

      expect(() => enforceRemixPolicy(source as never, 'node-1')).not.toThrow();
    });

    it('throws for subject_only remix when target node differs', () => {
      const source = makeSource({
        protected: true,
        sourcePolicy: 'subject_only',
        subjectNodeId: 'node-1',
      });

      expect(() => enforceRemixPolicy(source as never, 'node-2')).toThrow(
        'Protected portrait can only be remixed for the same subject',
      );
    });

    it('allows family_only remix when family group matches', () => {
      const source = makeSource({
        protected: true,
        sourcePolicy: 'family_only',
        familyGroupId: 'family-a',
      });

      expect(() => enforceRemixPolicy(source as never, undefined, 'family-a')).not.toThrow();
    });

    it('throws for family_only remix when family group differs', () => {
      const source = makeSource({
        protected: true,
        sourcePolicy: 'family_only',
        familyGroupId: 'family-a',
      });

      expect(() => enforceRemixPolicy(source as never, undefined, 'family-b')).toThrow(
        'Protected portrait can only be remixed for family members',
      );
    });

    it('allows campaign policy remix for protected portraits', () => {
      const source = makeSource({
        protected: true,
        sourcePolicy: 'campaign',
        subjectNodeId: 'node-1',
        familyGroupId: 'family-a',
      });

      expect(() => enforceRemixPolicy(source as never, 'node-2', 'family-b')).not.toThrow();
    });
  });

  describe('ensureStoryTags', () => {
    it("adds default story entity type when story is missing", () => {
      const result = ensureStoryTags({ demographics: { gender: 'female' } });

      expect(result.story).toEqual({ entity_type: 'npc' });
      expect(result.demographics).toEqual({ gender: 'female' });
    });

    it('returns tags unchanged when story exists', () => {
      const tags: Partial<PortraitTags> = {
        story: { entity_type: 'traveller' },
        demographics: { age_range: 'adult' },
      };

      const result = ensureStoryTags(tags);
      expect(result).toBe(tags);
    });
  });

  describe('mergeTags and deepMerge', () => {
    it('returns overrides when extracted tags are null', () => {
      const overrides: PortraitTags = {
        story: { entity_type: 'npc' },
        demographics: { gender: 'male' },
      };

      const result = mergeTags(null, overrides);
      expect(result).toBe(overrides);
    });

    it('deepMerge preserves nested base properties while applying overrides', () => {
      const merged = deepMerge(
        {
          demographics: { gender: 'female', age_range: 'adult', hair_color: 'black' },
          traits: { demeanor: 'calm' },
        },
        {
          demographics: { age_range: 'elder' },
          traits: { vibe: 'mysterious' },
        },
      );

      expect(merged).toEqual({
        demographics: { gender: 'female', age_range: 'elder', hair_color: 'black' },
        traits: { demeanor: 'calm', vibe: 'mysterious' },
      });
    });

    it('mergeTags overrides individual nested fields while keeping other extracted values', () => {
      const extracted: PortraitTags = {
        story: { entity_type: 'npc', relationship_type: 'ally' },
        career: { career_type: 'merchant', rank_level: 'low', career_style: 'civilian' },
      };

      const overrides: PortraitTags = {
        story: { entity_type: 'npc' },
        career: { rank_level: 'high' },
      };

      const result = mergeTags(extracted, overrides);
      expect(result.career).toEqual({
        career_type: 'merchant',
        rank_level: 'high',
        career_style: 'civilian',
      });
      expect(result.story).toEqual({ entity_type: 'npc', relationship_type: 'ally' });
    });
  });
});
