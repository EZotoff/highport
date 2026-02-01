import type { CareerDefinition } from '../../types/career.js';

export const NOBLE: CareerDefinition = {
  id: 'noble',
  name: 'Noble',
  description: 'Members of the aristocracy or ruling class.',
  
  qualification: {
    characteristic: 'SOC',
    target: 10,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'administrator',
      name: 'Administrator',
      description: 'You work in the government bureaucracy.',
      survival: { characteristic: 'INT', target: 4 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'advocate' },
        { roll: 3, skill: 'broker' },
        { roll: 4, skill: 'diplomat' },
        { roll: 5, skill: 'leadership' },
        { roll: 6, skill: 'persuade' },
      ],
    },
    {
      id: 'diplomat',
      name: 'Diplomat',
      description: 'You represent your world or organization.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'SOC', target: 7 },
      skillTable: [
        { roll: 1, skill: 'advocate' },
        { roll: 2, skill: 'carouse' },
        { roll: 3, skill: 'electronics', specialty: 'comms' },
        { roll: 4, skill: 'steward' },
        { roll: 5, skill: 'diplomat' },
        { roll: 6, skill: 'deception' },
      ],
    },
    {
      id: 'dilettante',
      name: 'Dilettante',
      description: 'You are a wastrel or playboy.',
      survival: { characteristic: 'SOC', target: 3 },
      advancement: { characteristic: 'INT', target: 8 },
      skillTable: [
        { roll: 1, skill: 'carouse' },
        { roll: 2, skill: 'deception' },
        { roll: 3, skill: 'flyer' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'gambler' },
        { roll: 6, skill: 'jackofalltrades' },
      ],
    },
  ],
  
  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'guncombat' },
      { roll: 6, skill: 'melee' },
    ],
    service: [
      { roll: 1, skill: 'admin' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'electronics' },
      { roll: 4, skill: 'diplomat' },
      { roll: 5, skill: 'investigate' },
      { roll: 6, skill: 'persuade' },
    ],
    advanced: [
      { roll: 1, skill: 'admin' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'language' },
      { roll: 4, skill: 'leadership' },
      { roll: 5, skill: 'diplomat' },
      { roll: 6, skill: 'art' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Wastrel' },
    { rank: 1, title: 'Wastrel' },
    { rank: 2, title: 'Ingrate', skill: 'carouse', skillLevel: 1 },
    { rank: 3, title: 'Ingrate' },
    { rank: 4, title: 'Noble', skill: '+1 SOC' },
    { rank: 5, title: 'Noble' },
    { rank: 6, title: 'Noble' },
  ],
  
  cashBenefits: [10000, 10000, 50000, 50000, 100000, 100000, 200000],
  
  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: '+1 EDU' },
    { roll: 3, benefit: 'Ship Share' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: 'TAS Membership' },
    { roll: 6, benefit: 'Yacht', orHighRank: 'Personal Starship' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are challenged to a duel.',
      choices: [
        {
          id: 'duel-accept',
          description: 'Accept and roll Melee or Gun Combat 8+',
          effects: [{ type: 'special', target: 'roll', value: 'Melee or Gun Combat 8+' }],
        },
        {
          id: 'duel-refuse',
          description: 'Refuse and lose 1 SOC',
          effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
        },
      ],
    },
    {
      roll: 4,
      description: 'Political intrigue draws you in.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'political_rival' },
      ],
      choices: [
        {
          id: 'intrigue-skill',
          description: 'Gain one of Advocate, Diplomat, Persuade, or Deception',
          effects: [{ type: 'skill', target: 'advocate|diplomat|persuade|deception', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You inherit a gift from a relative.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'Your reign is acclaimed by all.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You make a useful political connection.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'political_contact' },
      ],
      effects: [{ type: 'skill', target: 'admin|carouse|diplomat', value: 1 }],
    },
    {
      roll: 9,
      description: 'Your efforts benefit your world or organization.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 10,
      description: 'You make a deal with a powerful faction.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'faction_leader' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 11,
      description: 'Your position grants you access to considerable resources.',
      effects: [{ type: 'benefit', target: 'extra_roll', value: 1 }],
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
      description: 'A family scandal forces you from your position.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'family_scandal' },
      ],
      effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
    },
    {
      roll: 3,
      description: 'You are implicated in a political scandal.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'political_enemy' },
      ],
    },
    {
      roll: 4,
      description: 'Your family loses its position and wealth.',
      forced: true,
      injury: false,
      effects: [{ type: 'special', target: 'benefit', value: 'lose_all' }],
    },
    {
      roll: 5,
      description: 'An assassin or other enemy targets you.',
      forced: true,
      injury: true,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'assassin' },
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
