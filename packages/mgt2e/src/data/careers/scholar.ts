import type { CareerDefinition } from '../../types/career.js';

export const SCHOLAR: CareerDefinition = {
  id: 'scholar',
  name: 'Scholar',
  description: 'Academics, researchers, and scientists.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'field-researcher',
      name: 'Field Researcher',
      description: 'You study specimens and gather data in the field.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'sensors' },
        { roll: 2, skill: 'persuade' },
        { roll: 3, skill: 'pilot' },
        { roll: 4, skill: 'science' },
        { roll: 5, skill: 'science' },
        { roll: 6, skill: 'survival' },
      ],
    },
    {
      id: 'scientist',
      name: 'Scientist',
      description: 'You work in a laboratory or research center.',
      survival: { characteristic: 'EDU', target: 4 },
      advancement: { characteristic: 'INT', target: 8 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'engineer' },
        { roll: 3, skill: 'science' },
        { roll: 4, skill: 'science' },
        { roll: 5, skill: 'electronics', specialty: 'computers' },
        { roll: 6, skill: 'science' },
      ],
    },
    {
      id: 'physician',
      name: 'Physician',
      description: 'You are a doctor or medical researcher.',
      survival: { characteristic: 'EDU', target: 4 },
      advancement: { characteristic: 'EDU', target: 8 },
      skillTable: [
        { roll: 1, skill: 'medic' },
        { roll: 2, skill: 'electronics' },
        { roll: 3, skill: 'investigate' },
        { roll: 4, skill: 'medic' },
        { roll: 5, skill: 'persuade' },
        { roll: 6, skill: 'science' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 INT' },
      { roll: 2, skill: '+1 EDU' },
      { roll: 3, skill: '+1 SOC' },
      { roll: 4, skill: '+1 DEX' },
      { roll: 5, skill: '+1 END' },
      { roll: 6, skill: 'language' },
    ],
    service: [
      { roll: 1, skill: 'drive' },
      { roll: 2, skill: 'electronics' },
      { roll: 3, skill: 'diplomat' },
      { roll: 4, skill: 'medic' },
      { roll: 5, skill: 'investigate' },
      { roll: 6, skill: 'science' },
    ],
    advanced: [
      { roll: 1, skill: 'art' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'electronics', specialty: 'computers' },
      { roll: 4, skill: 'medic' },
      { roll: 5, skill: 'science' },
      { roll: 6, skill: 'science' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Scholar' },
    { rank: 1, title: 'Scholar', skill: 'science', skillLevel: 1 },
    { rank: 2, title: 'Scholar' },
    { rank: 3, title: 'Scholar', skill: '+1 INT' },
    { rank: 4, title: 'Scholar' },
    { rank: 5, title: 'Scholar' },
    { rank: 6, title: 'Scholar' },
  ],

  cashBenefits: [5000, 10000, 20000, 30000, 40000, 60000, 100000],

  benefitTable: [
    { roll: 1, benefit: 'Scientific Equipment' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: 'TAS Membership' },
    { roll: 6, benefit: 'Ship Share', orHighRank: 'Lab Ship' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'A disaster or loss of funding forces a Loss of your research project.',
      effects: [{ type: 'special', target: 'check', value: 'lose benefit roll or leave' }],
    },
    {
      roll: 4,
      description: 'You are assigned to work on a secret project.',
      spawns: [{ type: 'secret', required: true, template: 'secret_research' }],
      choices: [
        {
          id: 'secret-project',
          description: 'Gain Science but also a Rival',
          effects: [
            { type: 'skill', target: 'science', value: 1 },
            { type: 'special', target: 'rival', value: 1 },
          ],
        },
      ],
    },
    {
      roll: 5,
      description: 'You win a prestigious prize for your work.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'You are given advanced training in a specialist field.',
      effects: [{ type: 'special', target: 'training', value: 'EDU 8+ for skill' }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You make a breakthrough in your field.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 9,
      description: 'You become entangled in a bureaucratic or political situation.',
      spawns: [{ type: 'npc', relationship: 'rival', required: false, template: 'bureaucrat' }],
      choices: [
        {
          id: 'bureaucracy',
          description: 'Gain Admin, Advocate, Diplomat, or Persuade',
          effects: [{ type: 'skill', target: 'admin|advocate|diplomat|persuade', value: 1 }],
        },
      ],
    },
    {
      roll: 10,
      description: 'You work alongside a noted expert in your field.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'expert_colleague' },
      ],
      effects: [{ type: 'skill', target: 'science', value: 1 }],
    },
    {
      roll: 11,
      description: 'You are befriended by a patron in your field.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'academic_patron' }],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 12,
      description: 'You make a major discovery. You are automatically promoted.',
      spawns: [{ type: 'secret', required: false, template: 'major_discovery' }],
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description: 'Severely injured. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'A lab accident exposes you to dangerous materials.',
      forced: true,
      injury: true,
    },
    {
      roll: 3,
      description: 'Your work is sabotaged by rivals.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'saboteur' }],
      effects: [{ type: 'skill', target: 'investigate|deception', value: 1 }],
    },
    {
      roll: 4,
      description: 'A rival researcher steals your work and publishes it first.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'plagiarist' }],
    },
    {
      roll: 5,
      description: 'Your research is considered too controversial.',
      forced: true,
      injury: false,
      spawns: [{ type: 'secret', required: true, template: 'controversial_research' }],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
