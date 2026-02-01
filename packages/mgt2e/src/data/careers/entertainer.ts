import type { CareerDefinition } from '../../types/career.js';

export const ENTERTAINER: CareerDefinition = {
  id: 'entertainer',
  name: 'Entertainer',
  description: 'Artists, performers, and celebrities who entertain the masses.',
  
  qualification: {
    characteristic: 'INT',
    target: 5,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'artist',
      name: 'Artist',
      description: 'You are a creative artist.',
      survival: { characteristic: 'SOC', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'art' },
        { roll: 2, skill: 'carouse' },
        { roll: 3, skill: 'electronics', specialty: 'computers' },
        { roll: 4, skill: 'gambler' },
        { roll: 5, skill: 'persuade' },
        { roll: 6, skill: 'profession' },
      ],
    },
    {
      id: 'journalist',
      name: 'Journalist',
      description: 'You report on current events and investigate stories.',
      survival: { characteristic: 'EDU', target: 7 },
      advancement: { characteristic: 'INT', target: 5 },
      skillTable: [
        { roll: 1, skill: 'art', specialty: 'write' },
        { roll: 2, skill: 'electronics', specialty: 'comms' },
        { roll: 3, skill: 'investigate' },
        { roll: 4, skill: 'recon' },
        { roll: 5, skill: 'streetwise' },
        { roll: 6, skill: 'persuade' },
      ],
    },
    {
      id: 'performer',
      name: 'Performer',
      description: 'You are a live performer.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'DEX', target: 7 },
      skillTable: [
        { roll: 1, skill: 'art', specialty: 'performer' },
        { roll: 2, skill: 'athletics' },
        { roll: 3, skill: 'carouse' },
        { roll: 4, skill: 'deception' },
        { roll: 5, skill: 'stealth' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
  ],
  
  skillTables: {
    personal: [
      { roll: 1, skill: '+1 DEX' },
      { roll: 2, skill: '+1 INT' },
      { roll: 3, skill: '+1 EDU' },
      { roll: 4, skill: '+1 SOC' },
      { roll: 5, skill: 'carouse' },
      { roll: 6, skill: 'melee' },
    ],
    service: [
      { roll: 1, skill: 'art' },
      { roll: 2, skill: 'carouse' },
      { roll: 3, skill: 'deception' },
      { roll: 4, skill: 'persuade' },
      { roll: 5, skill: 'steward' },
      { roll: 6, skill: 'streetwise' },
    ],
    advanced: [
      { roll: 1, skill: 'advocate' },
      { roll: 2, skill: 'broker' },
      { roll: 3, skill: 'deception' },
      { roll: 4, skill: 'science' },
      { roll: 5, skill: 'streetwise' },
      { roll: 6, skill: 'art' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Entertainer' },
    { rank: 1, title: 'Entertainer', skill: 'art', skillLevel: 1 },
    { rank: 2, title: 'Entertainer' },
    { rank: 3, title: 'Entertainer', skill: '+1 SOC' },
    { rank: 4, title: 'Entertainer' },
    { rank: 5, title: 'Famous Entertainer', skill: '+1 SOC' },
    { rank: 6, title: 'Famous Entertainer' },
  ],
  
  cashBenefits: [0, 0, 10000, 10000, 40000, 40000, 80000],
  
  benefitTable: [
    { roll: 1, benefit: 'Contact' },
    { roll: 2, benefit: '+1 SOC' },
    { roll: 3, benefit: 'Contact' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: '+1 INT' },
    { roll: 6, benefit: 'Ship Share', orHighRank: 'Yacht' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are invited to take part in a controversial project.',
      choices: [
        {
          id: 'controversial-accept',
          description: 'Accept and gain a Contact but also a Rival',
          effects: [
            { type: 'special', target: 'contact', value: 1 },
            { type: 'special', target: 'rival', value: 1 },
          ],
        },
        {
          id: 'controversial-refuse',
          description: 'Refuse',
          effects: [],
        },
      ],
    },
    {
      roll: 4,
      description: 'You join a group of traveling entertainers.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'traveling_troupe' },
      ],
      choices: [
        {
          id: 'traveling-skill',
          description: 'Gain one of Steward, Persuade, or Deception',
          effects: [{ type: 'skill', target: 'steward|persuade|deception', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You are given advanced training in a specialist field.',
      effects: [{ type: 'special', target: 'training', value: 'EDU 8+ for skill' }],
    },
    {
      roll: 6,
      description: 'You are approached by a patron.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'wealthy_patron' },
      ],
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You gain a celebrity friend or lover.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'celebrity_friend' },
      ],
      effects: [{ type: 'special', target: 'fame', value: '+1' }],
    },
    {
      roll: 9,
      description: 'Your work is well received and you are given DM+1 to Advancement this term.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+1' }],
    },
    {
      roll: 10,
      description: 'You are caught in a scandal or your work is criticised.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'critic' },
      ],
      choices: [
        {
          id: 'scandal-respond',
          description: 'Respond with Carouse, Persuade, or Art 8+',
          effects: [{ type: 'special', target: 'roll', value: 'Carouse, Persuade, or Art 8+' }],
        },
      ],
    },
    {
      roll: 11,
      description: 'You are approached by a powerful patron.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'powerful_patron' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 12,
      description: 'You win a major prize or accolade. You are automatically promoted.',
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
      description: 'You expose or offend someone powerful.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'offended_powerful' },
      ],
    },
    {
      roll: 3,
      description: 'You have no idea what happened to you – Loss of memory.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'lost_memory' },
      ],
    },
    {
      roll: 4,
      description: 'You are forced out because of your opinions or actions.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'carouse|deception', value: 1 }],
    },
    {
      roll: 5,
      description: 'Public scandal or personal problems force you from your career.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: false, template: 'public_scandal' },
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
