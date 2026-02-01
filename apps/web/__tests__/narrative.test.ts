import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateEventDescription,
  generateNPCDetails,
  checkNarrativeAvailable,
  type VerbosityLevel,
  type EventDescriptionResult,
  type NPCDetails,
} from '../lib/chargen/narrative';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Narrative API', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEventDescription', () => {
    const baseParams = {
      eventText: 'You make a rival in the officer corps',
      career: 'navy',
      assignment: 'line_crew',
      term: 1,
      characterContext: {
        name: 'Zara',
        characteristics: { STR: 7, DEX: 9, END: 8, INT: 10, EDU: 7, SOC: 8 },
        priorEvents: ['Joined navy at 18'],
      },
      verbosity: 'structured' as VerbosityLevel,
    };

    it('should parse successful API response correctly', async () => {
      const mockResponse: EventDescriptionResult = {
        description: 'During a tense fleet exercise near the Spinward Marches...',
        suggestedEntities: [
          {
            type: 'npc',
            relationship: 'rival',
            suggestedName: 'Lt. Cmdr Vasquez',
            suggestedMotivation: 'Passed over for promotion',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateEventDescription(baseParams);

      expect(result).toEqual(mockResponse);
      expect(result.description).toContain('fleet exercise');
      expect(result.suggestedEntities).toHaveLength(1);
      expect(result.suggestedEntities[0].type).toBe('npc');
    });

    it('should convert camelCase to snake_case for API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'test', suggestedEntities: [] }),
      });

      await generateEventDescription(baseParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      // Verify snake_case conversion
      expect(callBody.event_text).toBe(baseParams.eventText);
      expect(callBody.character_context).toBeDefined();
      expect(callBody.character_context.prior_events).toEqual(['Joined navy at 18']);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'GEMINI_API_KEY not set' }),
      });

      await expect(generateEventDescription(baseParams)).rejects.toThrow('GEMINI_API_KEY not set');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(generateEventDescription(baseParams)).rejects.toThrow('Network error');
    });
  });

  describe('generateNPCDetails', () => {
    const baseParams = {
      npcType: 'rival',
      context: {
        eventText: 'You make a rival in the officer corps',
        career: 'navy',
        characterName: 'Zara',
      },
      existingFields: { name: 'Lt. Cmdr Vasquez' },
      verbosity: 'rich' as VerbosityLevel,
    };

    it('should parse successful NPC response correctly', async () => {
      const mockResponse: NPCDetails = {
        name: 'Lt. Cmdr Vasquez',
        personality: 'Cold, calculating, never forgets a slight',
        motivation: 'Believes Zara\'s family connections cost him his promotion',
        appearance: 'Tall, sharp features, immaculate uniform',
        quirks: ['Taps fingers when annoyed', 'Speaks in clipped sentences'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateNPCDetails(baseParams);

      expect(result.name).toBe('Lt. Cmdr Vasquez');
      expect(result.personality).toBeDefined();
      expect(result.motivation).toBeDefined();
      expect(result.quirks).toHaveLength(2);
    });

    it('should convert context to snake_case for API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Test' }),
      });

      await generateNPCDetails(baseParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(callBody.npc_type).toBe('rival');
      expect(callBody.context.event_text).toBe(baseParams.context.eventText);
      expect(callBody.context.character_name).toBe('Zara');
    });

    it('should include existing_fields in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Test' }),
      });

      await generateNPCDetails(baseParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.existing_fields).toEqual({ name: 'Lt. Cmdr Vasquez' });
    });
  });

  describe('checkNarrativeAvailable', () => {
    it('should return true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const result = await checkNarrativeAvailable();
      expect(result).toBe(true);
    });

    it('should return false when service returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await checkNarrativeAvailable();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkNarrativeAvailable();
      expect(result).toBe(false);
    });
  });

  describe('verbosity level validation', () => {
    it('should accept minimal verbosity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'Short desc.', suggestedEntities: [] }),
      });

      await generateEventDescription({
        eventText: 'Test',
        career: 'navy',
        assignment: 'line_crew',
        term: 1,
        characterContext: { name: 'Test', characteristics: {} },
        verbosity: 'minimal',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.verbosity).toBe('minimal');
    });

    it('should accept structured verbosity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'Medium desc with details.', suggestedEntities: [] }),
      });

      await generateEventDescription({
        eventText: 'Test',
        career: 'navy',
        assignment: 'line_crew',
        term: 1,
        characterContext: { name: 'Test', characteristics: {} },
        verbosity: 'structured',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.verbosity).toBe('structured');
    });

    it('should accept rich verbosity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'A long, detailed prose...', suggestedEntities: [] }),
      });

      await generateEventDescription({
        eventText: 'Test',
        career: 'navy',
        assignment: 'line_crew',
        term: 1,
        characterContext: { name: 'Test', characteristics: {} },
        verbosity: 'rich',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.verbosity).toBe('rich');
    });
  });
});
