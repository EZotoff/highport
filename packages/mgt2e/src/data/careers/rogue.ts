import type { CareerDefinition } from '../../types/career.js';

export const ROGUE: CareerDefinition = {
  id: 'rogue',
  name: 'Rogue',
  description: 'Criminals, thieves, and other unsavory types.',

  qualification: {
    characteristic: 'DEX',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'thief',
      name: 'Thief',
      description: 'You steal from the rich and give to... yourself.',
      survival: { characteristic: 'INT', target: 6 },
      advancement: { characteristic: 'DEX', target: 6 },
      skillTable: [
        { roll: 1, skill: 'stealth' },
        { roll: 2, skill: 'electronics' },
        { roll: 3, skill: 'recon' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'deception' },
        { roll: 6, skill: 'athletics' },
      ],
    },
    {
      id: 'enforcer',
      name: 'Enforcer',
      description: 'You are the muscle for a criminal organization.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'STR', target: 6 },
      skillTable: [
        { roll: 1, skill: 'guncombat' },
        { roll: 2, skill: 'melee' },
        { roll: 3, skill: 'streetwise' },
        { roll: 4, skill: 'persuade' },
        { roll: 5, skill: 'athletics' },
        { roll: 6, skill: 'drive' },
      ],
    },
    {
      id: 'pirate',
      name: 'Pirate',
      description: 'You prey on merchant ships.',
      survival: { characteristic: 'DEX', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'pilot' },
        { roll: 2, skill: 'astrogation' },
        { roll: 3, skill: 'gunner' },
        { roll: 4, skill: 'engineer' },
        { roll: 5, skill: 'vaccsuit' },
        { roll: 6, skill: 'melee' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: 'carouse' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'melee' },
      { roll: 6, skill: 'guncombat' },
    ],
    service: [
      { roll: 1, skill: 'deception' },
      { roll: 2, skill: 'recon' },
      { roll: 3, skill: 'athletics' },
      { roll: 4, skill: 'guncombat' },
      { roll: 5, skill: 'stealth' },
      { roll: 6, skill: 'streetwise' },
    ],
    advanced: [
      { roll: 1, skill: 'electronics' },
      { roll: 2, skill: 'navigation' },
      { roll: 3, skill: 'medic' },
      { roll: 4, skill: 'investigate' },
      { roll: 5, skill: 'broker' },
      { roll: 6, skill: 'advocate' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Lackey' },
    { rank: 1, title: 'Henchman', skill: 'stealth', skillLevel: 1 },
    { rank: 2, title: 'Corporal', skill: 'streetwise', skillLevel: 1 },
    { rank: 3, title: 'Sergeant' },
    { rank: 4, title: 'Lieutenant' },
    { rank: 5, title: 'Leader' },
    { rank: 6, title: 'Captain' },
  ],

  cashBenefits: [0, 0, 10000, 10000, 50000, 100000, 100000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: 'Weapon' },
    { roll: 3, benefit: '+1 INT' },
    { roll: 4, benefit: 'Armour' },
    { roll: 5, benefit: '+1 DEX' },
    { roll: 6, benefit: 'Ship Share', orHighRank: 'Corsair' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are arrested and charged.',
      effects: [{ type: 'special', target: 'roll', value: 'Advocate or Streetwise 8+ to escape' }],
    },
    {
      roll: 4,
      description: 'You are involved in a feud with a rival criminal organization.',
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'rival_gang' }],
      effects: [{ type: 'skill', target: 'stealth|guncombat|melee', value: 1 }],
    },
    {
      roll: 5,
      description: 'You are involved in a dangerous job.',
      choices: [
        {
          id: 'dangerous-job',
          description: 'Roll Stealth or Gun Combat 8+ for extra benefit roll',
          effects: [{ type: 'special', target: 'roll', value: 'Stealth or Gun Combat 8+' }],
        },
      ],
    },
    {
      roll: 6,
      description: 'You have the opportunity to backstab a fellow criminal.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'fellow_criminal' },
      ],
      choices: [
        {
          id: 'backstab-accept',
          description: 'Backstab: gain +4 DM to advancement but gain Enemy',
          effects: [
            { type: 'special', target: 'advancement', value: 'dm+4' },
            { type: 'special', target: 'enemy', value: 1 },
          ],
        },
        {
          id: 'backstab-refuse',
          description: 'Refuse: gain an Ally',
          effects: [{ type: 'special', target: 'ally', value: 1 }],
        },
      ],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You pick up useful skills during your criminal career.',
      choices: [
        {
          id: 'crime-skills',
          description: 'Gain one of Streetwise, Stealth, Melee, or Gun Combat',
          effects: [{ type: 'skill', target: 'streetwise|stealth|melee|guncombat', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description:
        'You have the opportunity to establish yourself as a fence or other criminal contact.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'criminal_contact' },
      ],
      effects: [{ type: 'skill', target: 'broker', value: 1 }],
    },
    {
      roll: 10,
      description: 'You are approached by a patron for a major job.',
      spawns: [{ type: 'npc', relationship: 'contact', required: true, template: 'crime_patron' }],
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 11,
      description: 'You are taken on as a trusted lieutenant by a crime boss.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'crime_boss' }],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 12,
      description: 'You are automatically promoted.',
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
      description: 'Arrested. You must spend your next term in prison.',
      forced: true,
      injury: false,
      effects: [{ type: 'special', target: 'prison', value: 'next_term' }],
    },
    {
      roll: 3,
      description: 'Betrayed by a fellow rogue.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'betrayer' }],
    },
    {
      roll: 4,
      description: 'A job goes wrong, and you are forced to flee.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'deception|streetwise', value: 1 }],
    },
    {
      roll: 5,
      description: 'A police investigation targets you.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: false, template: 'police_investigator' },
      ],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
