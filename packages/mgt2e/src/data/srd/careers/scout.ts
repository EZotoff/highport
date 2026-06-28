import type { CareerDefinition } from '../../../types/career.js';

export const SCOUT_CAREER: CareerDefinition = {
  id: 'scout',
  name: 'Scout',
  description:
    'Exploratory service personnel who carry messages, chart worlds, and push into unmapped regions. Scouts freely choose whether to remain after each term, and mishaps do not automatically end service.',

  qualification: {
    characteristic: 'INT',
    target: 5,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'courier',
      name: 'Courier',
      description:
        'A messenger entrusted with priority data and valuable consignments across interstellar distances.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 9 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'flyer' },
        { roll: 3, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 4, skill: 'engineer' },
        { roll: 5, skill: 'athletics' },
        { roll: 6, skill: 'astrogation' },
      ],
    },
    {
      id: 'survey',
      name: 'Survey',
      description:
        'A field assessor visiting frontier worlds and reporting their value, hazards, and needs.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'INT', target: 8 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'persuade' },
        { roll: 3, skill: 'pilot' },
        { roll: 4, skill: 'navigation' },
        { roll: 5, skill: 'diplomat' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
    {
      id: 'exploration',
      name: 'Exploration',
      description:
        'An advance scout sent beyond reliable charts into unknown systems and untouched worlds.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'pilot' },
        { roll: 3, skill: 'engineer' },
        { roll: 4, skill: 'science' },
        { roll: 5, skill: 'stealth' },
        { roll: 6, skill: 'recon' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: '+1 INT' },
      { roll: 5, skill: '+1 EDU' },
      { roll: 6, skill: 'jackofalltrades' },
    ],
    service: [
      { roll: 1, skill: 'pilot' },
      { roll: 2, skill: 'survival' },
      { roll: 3, skill: 'mechanic' },
      { roll: 4, skill: 'astrogation' },
      { roll: 5, skill: 'vaccsuit' },
      { roll: 6, skill: 'guncombat' },
    ],
    advanced: [
      { roll: 1, skill: 'medic' },
      { roll: 2, skill: 'language' },
      { roll: 3, skill: 'seafarer' },
      { roll: 4, skill: 'explosives' },
      { roll: 5, skill: 'science' },
      { roll: 6, skill: 'jackofalltrades' },
    ],
  },

  ranks: [
    { rank: 0, title: '—' },
    { rank: 1, title: 'Scout', skill: 'vaccsuit', skillLevel: 1 },
    { rank: 2, title: '—' },
    { rank: 3, title: 'Senior Scout', skill: 'pilot', skillLevel: 1 },
    { rank: 4, title: '—' },
    { rank: 5, title: '—' },
    { rank: 6, title: '—' },
  ],

  cashBenefits: [20000, 20000, 30000, 30000, 50000, 50000, 50000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Weapon' },
    { roll: 6, benefit: 'Scout Ship' },
    { roll: 7, benefit: 'Scout Ship' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A severe incident occurs; resolve a Mishap roll, but you may continue in the Scouts.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'Enemy craft catch your ship in a dangerous encounter.',
      choices: [
        {
          id: 'ambush-escape',
          description: 'Run for safety.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value:
                'Pilot 8+; fail: ship destroyed and no Scout reenlistment after this term; success: Electronics (sensors) 1',
            },
          ],
        },
        {
          id: 'ambush-negotiate',
          description: 'Try to bargain with the attackers.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value:
                'Persuade 10+; fail: ship destroyed and no Scout reenlistment after this term; success: Electronics (sensors) 1',
            },
          ],
        },
      ],
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'scout_ambusher' }],
    },
    {
      roll: 4,
      description: 'You examine an unfamiliar inhabited or biological world.',
      effects: [
        {
          type: 'skill',
          target: 'animals:riding|animals:training|survival|recon|science',
          value: 1,
        },
      ],
    },
    {
      roll: 5,
      description: 'Notable service to the Scouts improves your mustering-out prospects.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'Years of independent jumps sharpen shipboard and route-finding skills.',
      effects: [
        {
          type: 'skill',
          target: 'astrogation|electronics|navigation|pilot:smallCraft|mechanic',
          value: 1,
        },
      ],
    },
    {
      roll: 7,
      description: 'Resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Contact with an alien people creates a chance to gather valuable intelligence.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Electronics 8+ or Deception 8+; success: Imperial Ally and DM+2 to next advancement; fail: mishap without forced exit',
        },
      ],
    },
    {
      roll: 9,
      description: 'Your vessel arrives early enough to aid disaster survivors.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Medic 8+ or Engineer 8+; success: Contact and DM+2 to next advancement; fail: Enemy',
        },
      ],
    },
    {
      roll: 10,
      description:
        'Extended service near the edge of charted routes tests your frontier instincts.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Survival 8+ or Pilot 8+; success: alien Contact and any skill +1; fail: mishap without forced exit',
        },
      ],
    },
    {
      roll: 11,
      description: 'You carry a high-priority Imperial message.',
      choices: [
        {
          id: 'imperial-message-diplomat',
          description: 'Build diplomatic skill from the mission.',
          effects: [{ type: 'skill', target: 'diplomat', value: 1 }],
        },
        {
          id: 'imperial-message-advancement',
          description: 'Let the mission support your next promotion attempt.',
          effects: [{ type: 'special', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'You find a valuable place, object, or datum for Imperial use.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  flavorTemplates: {
    '3': [
      'Hostile craft appear where the charts promised quiet space, turning the scout ship into a lonely target.',
    ],
    '4': [
      'The survey takes you below the orbital map, into living terrain where every sample and settlement changes the picture.',
    ],
    '10': [
      'Long jumps beyond familiar routes test your judgment, supplies, and instinct for when the frontier is watching back.',
    ],
  },

  mishaps: [
    {
      roll: 1,
      description: 'A grave injury occurs.',
      injury: true,
      forced: false,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'Scout service leaves lasting mental scars.',
      injury: false,
      forced: false,
      effects: [{ type: 'characteristic', target: 'INT|SOC', value: -1 }],
    },
    {
      roll: 3,
      description: 'Ship damage strands you on a long return journey to a scout base.',
      injury: false,
      forced: false,
      effects: [
        { type: 'special', target: 'contacts', value: '1D' },
        { type: 'special', target: 'enemies', value: 'D3' },
      ],
    },
    {
      roll: 4,
      description: 'A mistake sparks tension between the Imperium and a minor culture or world.',
      injury: false,
      forced: false,
      effects: [{ type: 'skill', target: 'diplomat', value: 1 }],
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'diplomatic_rival' },
      ],
    },
    {
      roll: 5,
      description:
        'You lose time and memory before your drifting ship is recovered near friendly territory.',
      injury: false,
      forced: false,
    },
    {
      roll: 6,
      description: 'You are injured during scout service.',
      injury: true,
      forced: false,
    },
  ],
};
