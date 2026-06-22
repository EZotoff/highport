import type { CareerDefinition } from '../../../types/career.js';

export const MARINE_CAREER: CareerDefinition = {
  id: 'marine',
  name: 'Marine',
  description:
    'Shipborne assault troops who handle boarding actions, base defence, starport security, and hard planetary assaults.',

  qualification: {
    characteristic: 'END',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'support',
      name: 'Support',
      description:
        'Technical, supply, and battlefield medical personnel keeping marine operations moving.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'drive|flyer' },
        { roll: 4, skill: 'medic' },
        { roll: 5, skill: 'heavyweapons' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
    {
      id: 'starMarine',
      name: 'Star Marine',
      description:
        'Vacuum-capable troops drilled for boarding, ship seizures, and close fighting in hull corridors.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'vaccsuit' },
        { roll: 2, skill: 'athletics' },
        { roll: 3, skill: 'gunner' },
        { roll: 4, skill: 'melee', specialty: 'blade' },
        { roll: 5, skill: 'electronics' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
    {
      id: 'groundAssault',
      name: 'Ground Assault',
      description: 'Drop troops launched from orbit to seize objectives on hostile worlds.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'EDU', target: 5 },
      skillTable: [
        { roll: 1, skill: 'vaccsuit' },
        { roll: 2, skill: 'heavyweapons' },
        { roll: 3, skill: 'recon' },
        { roll: 4, skill: 'melee', specialty: 'blade' },
        { roll: 5, skill: 'tactics', specialty: 'military' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'melee', specialty: 'unarmed' },
      { roll: 6, skill: 'melee', specialty: 'blade' },
    ],
    service: [
      { roll: 1, skill: 'athletics' },
      { roll: 2, skill: 'vaccsuit' },
      { roll: 3, skill: 'tactics' },
      { roll: 4, skill: 'heavyweapons' },
      { roll: 5, skill: 'guncombat' },
      { roll: 6, skill: 'stealth' },
    ],
    advanced: [
      { roll: 1, skill: 'medic' },
      { roll: 2, skill: 'survival' },
      { roll: 3, skill: 'explosives' },
      { roll: 4, skill: 'engineer' },
      { roll: 5, skill: 'pilot' },
      { roll: 6, skill: 'navigation' },
    ],
    officer: [
      { roll: 1, skill: 'electronics' },
      { roll: 2, skill: 'tactics' },
      { roll: 3, skill: 'admin' },
      { roll: 4, skill: 'advocate' },
      { roll: 5, skill: 'diplomat' },
      { roll: 6, skill: 'leadership' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Marine', benefit: 'Gun Combat (any) 1 or Melee (blade) 1' },
    { rank: 1, title: 'Lance Corporal', skill: 'guncombat', skillLevel: 1 },
    { rank: 2, title: 'Corporal' },
    { rank: 3, title: 'Lance Sergeant', skill: 'leadership', skillLevel: 1 },
    { rank: 4, title: 'Sergeant' },
    { rank: 5, title: 'Gunnery Sergeant', benefit: '+1 END' },
    { rank: 6, title: 'Sergeant Major' },
  ],

  officerRanks: [
    { rank: 1, title: 'Lieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 2, title: 'Captain' },
    { rank: 3, title: 'Force Commander', skill: 'tactics', skillLevel: 1 },
    { rank: 4, title: 'Lieutenant Colonel' },
    { rank: 5, title: 'Colonel', benefit: 'SOC 10 or +1 SOC, whichever is higher' },
    { rank: 6, title: 'Brigadier' },
  ],

  cashBenefits: [2000, 5000, 5000, 10000, 20000, 30000, 40000],

  benefitTable: [
    { roll: 1, benefit: 'Armour' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'TAS Membership' },
    { roll: 6, benefit: 'Armour or +1 END' },
    { roll: 7, benefit: '+2 SOC' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A major setback occurs; resolve a mishap, but your marine career continues afterward.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description:
        'Separated from friendly forces, you stay alive by improvising far beyond the lines.',
      effects: [{ type: 'skill', target: 'survival|stealth|deception|streetwise', value: 1 }],
    },
    {
      roll: 4,
      description:
        'You rotate onto station security, learning to move and work in orbital facilities.',
      effects: [{ type: 'skill', target: 'vaccsuit|athletics.dexterity', value: 1 }],
    },
    {
      roll: 5,
      description: 'Specialist instruction is offered if you can make the most of it.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+: gain any one skill at level 1' },
      ],
    },
    {
      roll: 6,
      description:
        'You join a direct attack against a hardened stronghold; combat skill decides whether you profit or suffer.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Melee or Gun Combat 8+: gain Tactics (military) or Leadership; fail: injured and -1 physical characteristic',
        },
      ],
    },
    {
      roll: 7,
      description: 'Something personal reshapes the term; resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You are heavily engaged during a planetary invasion and its aftermath.',
      effects: [
        { type: 'skill', target: 'recon|guncombat|leadership|electronics.comms', value: 1 },
      ],
    },
    {
      roll: 9,
      description:
        'A superior officer nearly ruins an operation, but you live through it and must decide how to respond.',
      choices: [
        {
          id: 'report-commander',
          description: 'Expose the failure and accept the officer as an Enemy.',
          effects: [
            { type: 'special', target: 'next_advancement_dm', value: 2 },
            { type: 'special', target: 'enemy', value: 'commanding_officer' },
          ],
        },
        {
          id: 'protect-commander',
          description: 'Keep quiet and gain the officer as an Ally.',
          effects: [{ type: 'special', target: 'ally', value: 'commanding_officer' }],
        },
      ],
    },
    {
      roll: 10,
      description: 'A covert operation boosts your reputation with the chain of command.',
      effects: [{ type: 'special', target: 'next_advancement_dm', value: 2 }],
    },
    {
      roll: 11,
      description: 'A commanding officer actively cultivates your career.',
      choices: [
        {
          id: 'mentor-tactics',
          description: 'Learn battlefield command methods.',
          effects: [{ type: 'skill', target: 'tactics', value: 1 }],
        },
        {
          id: 'mentor-advancement',
          description: 'Lean on their backing for your next promotion attempt.',
          effects: [{ type: 'special', target: 'next_advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'Conspicuous bravery in combat brings immediate recognition.',
      effects: [{ type: 'special', target: 'promotion_or_commission', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description: 'Devastating battlefield injuries remove you from duty.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description:
        'An operation collapses, captivity follows, and the person responsible for your imprisonment becomes a lasting foe.',
      injury: true,
      forced: true,
      effects: [
        { type: 'characteristic', target: 'STR', value: -1 },
        { type: 'characteristic', target: 'DEX', value: -1 },
      ],
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'jailer_enemy' }],
    },
    {
      roll: 3,
      description:
        'A failed mission leaves you isolated in hostile territory, and the blame ends your service.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'stealth|survival', value: 1 }],
    },
    {
      roll: 4,
      description: 'You receive orders for a deniable action that violates your principles.',
      injury: false,
      forced: false,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value: 'refuse and leave career, or accept and gain lone survivor as Enemy',
        },
      ],
      spawns: [{ type: 'npc', relationship: 'enemy', required: false, template: 'lone_survivor' }],
    },
    {
      roll: 5,
      description: 'A bitter clash with another marine or officer pushes you out.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'marine_rival' }],
    },
    {
      roll: 6,
      description: 'Combat harm requires an injury roll.',
      injury: true,
      forced: true,
    },
  ],
};
