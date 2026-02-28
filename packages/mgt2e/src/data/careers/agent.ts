import type { CareerDefinition } from '../../types/career.js';

export const AGENT: CareerDefinition = {
  id: 'agent',
  name: 'Agent',
  description: 'Members of a law enforcement agency or intelligence service.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'law-enforcement',
      name: 'Law Enforcement',
      description: 'You are a police officer or detective.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'investigate' },
        { roll: 2, skill: 'recon' },
        { roll: 3, skill: 'streetwise' },
        { roll: 4, skill: 'stealth' },
        { roll: 5, skill: 'melee' },
        { roll: 6, skill: 'advocate' },
      ],
    },
    {
      id: 'intelligence',
      name: 'Intelligence',
      description: 'You work as a spy or saboteur.',
      survival: { characteristic: 'INT', target: 7 },
      advancement: { characteristic: 'INT', target: 5 },
      skillTable: [
        { roll: 1, skill: 'investigate' },
        { roll: 2, skill: 'recon' },
        { roll: 3, skill: 'electronics', specialty: 'comms' },
        { roll: 4, skill: 'stealth' },
        { roll: 5, skill: 'persuade' },
        { roll: 6, skill: 'deception' },
      ],
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'You work for a corporation, protecting its interests.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'investigate' },
        { roll: 2, skill: 'electronics', specialty: 'computers' },
        { roll: 3, skill: 'stealth' },
        { roll: 4, skill: 'carouse' },
        { roll: 5, skill: 'deception' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: 'guncombat' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'melee' },
      { roll: 5, skill: '+1 INT' },
      { roll: 6, skill: 'athletics' },
    ],
    service: [
      { roll: 1, skill: 'streetwise' },
      { roll: 2, skill: 'drive' },
      { roll: 3, skill: 'investigate' },
      { roll: 4, skill: 'flyer' },
      { roll: 5, skill: 'recon' },
      { roll: 6, skill: 'guncombat' },
    ],
    advanced: [
      { roll: 1, skill: 'advocate' },
      { roll: 2, skill: 'language' },
      { roll: 3, skill: 'explosives' },
      { roll: 4, skill: 'medic' },
      { roll: 5, skill: 'vaccsuit' },
      { roll: 6, skill: 'electronics' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Agent' },
    { rank: 1, title: 'Agent', skill: 'deception', skillLevel: 1 },
    { rank: 2, title: 'Field Agent', skill: 'investigate', skillLevel: 1 },
    { rank: 3, title: 'Field Agent' },
    { rank: 4, title: 'Special Agent', skill: 'guncombat', skillLevel: 1 },
    { rank: 5, title: 'Assistant Director' },
    { rank: 6, title: 'Director' },
  ],

  cashBenefits: [1000, 2000, 5000, 7500, 10000, 25000, 50000],

  benefitTable: [
    { roll: 1, benefit: 'Scientific Equipment' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: 'Ship Share' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Combat Implant' },
    { roll: 6, benefit: '+1 SOC', orHighRank: 'TAS Membership' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'An investigation takes on a dangerous turn.',
      choices: [
        {
          id: 'investigation-continue',
          description: 'Continue and roll Investigate 8+ or suffer injury',
          effects: [{ type: 'special', target: 'roll', value: 'Investigate 8+' }],
        },
        {
          id: 'investigation-drop',
          description: 'Drop the case',
          effects: [],
        },
      ],
    },
    {
      roll: 4,
      description: 'You complete a mission for your superiors, and gain a bonus.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 5,
      description: 'You establish a network of contacts.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'informant_network' },
      ],
      effects: [{ type: 'special', target: 'contacts', value: 'd3' }],
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
      description: 'You go undercover to investigate an enemy.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'undercover_target' },
      ],
      choices: [
        {
          id: 'undercover-skill',
          description: 'Gain one of Deception, Stealth, Streetwise, or Electronics',
          effects: [
            { type: 'skill', target: 'deception|stealth|streetwise|electronics', value: 1 },
          ],
        },
      ],
    },
    {
      roll: 9,
      description: 'You go above and beyond the call of duty.',
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 10,
      description: 'You are given special training.',
      choices: [
        {
          id: 'special-training',
          description: 'Gain one of Gun Combat, Melee, or Drive',
          effects: [{ type: 'skill', target: 'guncombat|melee|drive', value: 1 }],
        },
      ],
    },
    {
      roll: 11,
      description: 'You are befriended by a senior agent.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'senior_agent_ally' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 12,
      description: 'You uncover a major conspiracy. You are automatically promoted.',
      spawns: [{ type: 'secret', required: true, template: 'major_conspiracy' }],
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description:
        'Severely injured in action. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'A criminal or other foe you have been investigating goes for you.',
      forced: true,
      injury: true,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'vengeful_criminal' },
      ],
    },
    {
      roll: 3,
      description: 'An investigation goes wrong, ruining your career. Roll Advocate 8+ to stay.',
      forced: false,
      injury: false,
      effects: [{ type: 'special', target: 'check', value: 'Advocate 8+' }],
    },
    {
      roll: 4,
      description: 'You learn something you should not have.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'dangerous_knowledge' },
        { type: 'npc', relationship: 'enemy', required: false, template: 'silencer' },
      ],
    },
    {
      roll: 5,
      description: 'Your work ends up disgracing your department.',
      forced: true,
      injury: false,
      effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
