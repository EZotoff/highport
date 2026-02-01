import { describe, it, expect } from 'vitest';
import { exportLifepathAsText, exportLifepathAsMarkdown, exportLifepathAsImage, downloadBlob, downloadText } from '../lifepath-export';
import type { ChargenCharacter } from '../types';

const mockCharacter: ChargenCharacter = {
  id: 'char-1',
  playerId: 'player-1',
  name: 'Commander Sarah Chen',
  age: 34,
  homeworld: 'Terra',
  characteristics: {
    STR: 7,
    DEX: 9,
    END: 8,
    INT: 10,
    EDU: 11,
    SOC: 6,
  },
  backgroundSkills: ['Admin', 'Drive'],
  terms: [
    {
      termNumber: 1,
      careerId: 'Navy',
      assignmentId: 'Line/Crew',
      startAge: 18,
      survived: true,
      advanced: true,
      currentRank: 1,
      eventDescription: 'Made a rival in the officer corps',
      skillsGained: [
        { skill: 'Vacc Suit', level: 1 },
        { skill: 'Mechanic', level: 1 },
      ],
      spawnedEntities: [
        {
          type: 'npc',
          graphNodeId: 'node-1',
          relationship: 'rival',
          name: 'Lt. Cmdr Vasquez',
          description: 'Ambitious officer',
        },
      ],
    },
    {
      termNumber: 2,
      careerId: 'Navy',
      assignmentId: 'Line/Crew',
      startAge: 22,
      survived: true,
      advanced: false,
      currentRank: 1,
      eventDescription: 'Saved the ship from disaster',
      skillsGained: [
        { skill: 'Pilot', level: 1 },
      ],
      spawnedEntities: [],
    },
  ],
  currentTermIndex: 1,
  status: 'finalized',
  skills: {
    'Pilot': 2,
    'Tactics': 2,
    'Vacc Suit': 1,
    'Mechanic': 1,
    'Leadership': 1,
  },
  benefits: ['2 Ship Shares', 'TL12 Blade'],
  credits: 35000,
  spawnedEntityIds: ['node-1'],
};

describe('lifepath-export', () => {
  describe('exportLifepathAsText', () => {
    it('should export character lifepath as plain text', () => {
      const result = exportLifepathAsText(mockCharacter);
      
      expect(result).toContain('LIFEPATH: Commander Sarah Chen');
      expect(result).toContain('Age: 34');
      expect(result).toContain('CAREER: Navy - 2 Terms');
      expect(result).toContain('Term 1 (Age 18-22)');
      expect(result).toContain('Made a rival in the officer corps');
      expect(result).toContain('Lt. Cmdr Vasquez (rival)');
      expect(result).toContain('Vacc Suit-1, Mechanic-1');
      expect(result).toContain('STR: 7  DEX: 9  END: 8');
      expect(result).toContain('Pilot-2, Tactics-2');
      expect(result).toContain('2 Ship Shares, TL12 Blade');
      expect(result).toContain('Cr35,000');
      expect(result).toContain('CONNECTIONS');
    });
  });

  describe('exportLifepathAsMarkdown', () => {
    it('should export character lifepath as markdown', () => {
      const result = exportLifepathAsMarkdown(mockCharacter);
      
      expect(result).toContain('# Lifepath: Commander Sarah Chen');
      expect(result).toContain('**Age:** 34');
      expect(result).toContain('## Career: Navy - 2 Terms');
      expect(result).toContain('### Term 1 (Age 18-22)');
      expect(result).toContain('- **Event:** Made a rival in the officer corps');
      expect(result).toContain('- *Spawned:* Lt. Cmdr Vasquez (rival)');
      expect(result).toContain('| STR | DEX | END | INT | EDU | SOC |');
      expect(result).toContain('| 7 | 9 | 8 | 10 | 11 | 6 |');
      expect(result).toContain('- Pilot-2');
      expect(result).toContain('## Connections');
      expect(result).toContain('| Name | Relationship | From |');
    });
  });

  describe('exportLifepathAsImage', () => {
    it('should throw error about missing dependency', async () => {
      const mockElement = document.createElement('div');
      
      await expect(exportLifepathAsImage(mockElement))
        .rejects
        .toThrow('Image export requires html-to-image library');
    });
  });

  describe('downloadText', () => {
    it('should be a function that accepts content and filename', () => {
      expect(typeof downloadText).toBe('function');
    });
  });

  describe('downloadBlob', () => {
    it('should be a function that accepts blob and filename', () => {
      expect(typeof downloadBlob).toBe('function');
    });
  });
});
