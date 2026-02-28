import type { CareerDefinition } from '../../types/career.js';

export const CITIZEN: CareerDefinition = {
  id: 'citizen',
  name: 'Citizen',
  description: 'Ordinary members of society, from workers to corporate executives.',

  qualification: {
    characteristic: 'EDU',
    target: 5,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'You work for a corporation.',
      survival: { characteristic: 'SOC', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'advocate' },
        { roll: 2, skill: 'admin' },
        { roll: 3, skill: 'broker' },
        { roll: 4, skill: 'electronics', specialty: 'computers' },
        { roll: 5, skill: 'diplomat' },
        { roll: 6, skill: 'leadership' },
      ],
    },
    {
      id: 'worker',
      name: 'Worker',
      description: 'You are a blue-collar worker.',
      survival: { characteristic: 'END', target: 4 },
      advancement: { characteristic: 'EDU', target: 8 },
      skillTable: [
        { roll: 1, skill: 'drive' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'electronics', specialty: 'remoteOps' },
        { roll: 4, skill: 'profession' },
        { roll: 5, skill: 'profession' },
        { roll: 6, skill: 'science' },
      ],
    },
    {
      id: 'colonist',
      name: 'Colonist',
      description: 'You work on a frontier colony.',
      survival: { characteristic: 'INT', target: 7 },
      advancement: { characteristic: 'END', target: 5 },
      skillTable: [
        { roll: 1, skill: 'animals' },
        { roll: 2, skill: 'athletics' },
        { roll: 3, skill: 'jackofalltrades' },
        { roll: 4, skill: 'drive' },
        { roll: 5, skill: 'survival' },
        { roll: 6, skill: 'recon' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 EDU' },
      { roll: 2, skill: '+1 INT' },
      { roll: 3, skill: 'carouse' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'drive' },
      { roll: 6, skill: 'jackofalltrades' },
    ],
    service: [
      { roll: 1, skill: 'drive' },
      { roll: 2, skill: 'flyer' },
      { roll: 3, skill: 'streetwise' },
      { roll: 4, skill: 'melee' },
      { roll: 5, skill: 'steward' },
      { roll: 6, skill: 'profession' },
    ],
    advanced: [
      { roll: 1, skill: 'art' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'diplomat' },
      { roll: 4, skill: 'language' },
      { roll: 5, skill: 'electronics', specialty: 'computers' },
      { roll: 6, skill: 'medic' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Citizen' },
    { rank: 1, title: 'Citizen' },
    { rank: 2, title: 'Citizen', skill: 'admin', skillLevel: 1 },
    { rank: 3, title: 'Citizen' },
    { rank: 4, title: 'Manager', skill: 'advocate', skillLevel: 1 },
    { rank: 5, title: 'Manager' },
    { rank: 6, title: 'Director' },
  ],

  cashBenefits: [2000, 5000, 10000, 10000, 20000, 50000, 100000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Gun' },
    { roll: 5, benefit: '+1 SOC' },
    { roll: 6, benefit: 'TAS Membership', orHighRank: 'Yacht' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'Hard times cause you to lose your job.',
      effects: [
        { type: 'special', target: 'check', value: 'lose benefit roll' },
        { type: 'skill', target: 'streetwise', value: 1 },
      ],
    },
    {
      roll: 4,
      description: 'You learn something you should not have.',
      spawns: [{ type: 'secret', required: true, template: 'corporate_secret' }],
      choices: [
        {
          id: 'secret-keep',
          description: 'Keep the secret and gain an Enemy',
          effects: [{ type: 'special', target: 'enemy', value: 1 }],
        },
        {
          id: 'secret-share',
          description: 'Share the secret and gain an Ally',
          effects: [{ type: 'special', target: 'ally', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You are rewarded for your diligence or hard work.',
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
      description: 'You befriend a useful ally in one of the corporations.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'corporate_contact' },
      ],
      choices: [
        {
          id: 'corporate-skill',
          description: 'Gain one of Admin, Advocate, Diplomat, or Investigate',
          effects: [{ type: 'skill', target: 'admin|advocate|diplomat|investigate', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description: 'Your business or colony is thriving.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 10,
      description: 'You are promoted.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 11,
      description: 'You befriend a senior manager or director.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'senior_manager' }],
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
      description: 'You are harassed or assaulted by a coworker.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'harasser' }],
    },
    {
      roll: 3,
      description: 'Hard times force you to take on a second job.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'streetwise|profession', value: 1 }],
    },
    {
      roll: 4,
      description: 'Your business or colony fails.',
      forced: true,
      injury: false,
      effects: [{ type: 'special', target: 'benefit', value: 'lose_one' }],
    },
    {
      roll: 5,
      description: 'A revolution or war forces you from your home.',
      forced: true,
      injury: false,
      spawns: [{ type: 'location', required: false, template: 'refugee_origin' }],
      effects: [{ type: 'skill', target: 'survival|guncombat', value: 1 }],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
