import type { CareerDefinition } from '../../types/career.js';

export const MERCHANT: CareerDefinition = {
  id: 'merchant',
  name: 'Merchant',
  description: 'Members of a commercial enterprise, trading goods between worlds.',
  
  qualification: {
    characteristic: 'INT',
    target: 4,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'merchant-marine',
      name: 'Merchant Marine',
      description: 'You work on a commercial freighter.',
      survival: { characteristic: 'EDU', target: 5 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'pilot' },
        { roll: 2, skill: 'vaccsuit' },
        { roll: 3, skill: 'athletics' },
        { roll: 4, skill: 'mechanic' },
        { roll: 5, skill: 'engineer' },
        { roll: 6, skill: 'electronics' },
      ],
    },
    {
      id: 'free-trader',
      name: 'Free Trader',
      description: 'You are part of a starship crew trading freely between worlds.',
      survival: { characteristic: 'DEX', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 2, skill: 'vaccsuit' },
        { roll: 3, skill: 'melee' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'guncombat' },
        { roll: 6, skill: 'persuade' },
      ],
    },
    {
      id: 'broker',
      name: 'Broker',
      description: 'You arrange deals and negotiate contracts.',
      survival: { characteristic: 'EDU', target: 5 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'advocate' },
        { roll: 3, skill: 'broker' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'electronics', specialty: 'computers' },
        { roll: 6, skill: 'persuade' },
      ],
    },
  ],
  
  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: '+1 INT' },
      { roll: 5, skill: 'language' },
      { roll: 6, skill: 'streetwise' },
    ],
    service: [
      { roll: 1, skill: 'drive' },
      { roll: 2, skill: 'vaccsuit' },
      { roll: 3, skill: 'broker' },
      { roll: 4, skill: 'steward' },
      { roll: 5, skill: 'electronics' },
      { roll: 6, skill: 'persuade' },
    ],
    advanced: [
      { roll: 1, skill: 'engineer' },
      { roll: 2, skill: 'astrogation' },
      { roll: 3, skill: 'electronics', specialty: 'computers' },
      { roll: 4, skill: 'pilot' },
      { roll: 5, skill: 'admin' },
      { roll: 6, skill: 'advocate' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Crewman' },
    { rank: 1, title: 'Senior Crewman', skill: 'mechanic', skillLevel: 1 },
    { rank: 2, title: '4th Officer' },
    { rank: 3, title: '3rd Officer' },
    { rank: 4, title: '2nd Officer', skill: 'pilot', skillLevel: 1 },
    { rank: 5, title: '1st Officer', skill: '+1 SOC' },
    { rank: 6, title: 'Captain' },
  ],
  
  cashBenefits: [1000, 5000, 10000, 20000, 20000, 40000, 40000],
  
  benefitTable: [
    { roll: 1, benefit: '+1 INT' },
    { roll: 2, benefit: '+1 EDU' },
    { roll: 3, benefit: 'Ship Share' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Free Trader' },
    { roll: 6, benefit: 'Free Trader' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'Your ship or company has financial troubles.',
      effects: [{ type: 'special', target: 'check', value: 'lose one benefit roll or leave' }],
    },
    {
      roll: 4,
      description: 'You are given advanced training in a specialist field.',
      effects: [{ type: 'special', target: 'training', value: 'EDU 8+ for skill' }],
    },
    {
      roll: 5,
      description: 'You are approached by a pirate or smuggler.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'criminal_contact' },
      ],
      choices: [
        {
          id: 'smuggler-accept',
          description: 'Accept: gain Cr1000 x terms served',
          effects: [{ type: 'special', target: 'cash', value: 'terms_x_1000' }],
        },
        {
          id: 'smuggler-refuse',
          description: 'Refuse: gain an Enemy',
          effects: [{ type: 'special', target: 'enemy', value: 'smuggler' }],
        },
      ],
    },
    {
      roll: 6,
      description: 'You make a contact in a foreign culture.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'foreign_merchant' },
      ],
      choices: [
        {
          id: 'foreign-skill',
          description: 'Gain one of Language, Steward, Diplomat, or Carouse',
          effects: [{ type: 'skill', target: 'language|steward|diplomat|carouse', value: 1 }],
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
      description: 'You pick up useful skills during your time in the merchants.',
      choices: [
        {
          id: 'useful-skill',
          description: 'Gain one of Streetwise, Electronics, Persuade, or Steward',
          effects: [{ type: 'skill', target: 'streetwise|electronics|persuade|steward', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description: 'A sudden war, Loss of trade, or other crisis means your ship needs to make a jump with a problem.',
      effects: [
        { type: 'special', target: 'roll', value: 'Engineer, Mechanic, or Pilot 8+' },
      ],
    },
    {
      roll: 10,
      description: 'You have a chance to risk your fortune on a single deal.',
      choices: [
        {
          id: 'gamble',
          description: 'Gamble: Roll Broker or Gambler 8+ for extra benefit roll',
          effects: [{ type: 'special', target: 'roll', value: 'Broker or Gambler 8+' }],
        },
        {
          id: 'safe',
          description: 'Play it safe: no effect',
          effects: [],
        },
      ],
    },
    {
      roll: 11,
      description: 'You are befriended by a corporate leader or wealthy noble.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'wealthy_patron' },
      ],
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
      description: 'Severely injured in action. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'You are bankrupted by a failed deal.',
      forced: true,
      injury: false,
      effects: [{ type: 'special', target: 'benefit', value: 'lose_all' }],
    },
    {
      roll: 3,
      description: 'A sudden war destroys your trade routes. Gain Gun Combat or Pilot.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'guncombat|pilot', value: 1 }],
    },
    {
      roll: 4,
      description: 'Your ship is captured by pirates or smugglers.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: false, template: 'pirate_enemy' },
      ],
    },
    {
      roll: 5,
      description: 'You are implicated in illegal activity.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'illegal_activity' },
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
