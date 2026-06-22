import type { CareerDefinition } from '../../../types/career.js';

export const ARMY_CAREER: CareerDefinition = {
  id: 'army',
  name: 'Army',
  description:
    'Planetary soldiers and mercenary troops trained for surface campaigns, garrison duty, and mechanised warfare.',

  qualification: {
    characteristic: 'END',
    target: 5,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'support',
      name: 'Support',
      description:
        'Logistics, technical, medical, and other essential work away from the main firing line.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'mechanic' },
        { roll: 2, skill: 'drive|flyer' },
        { roll: 3, skill: 'profession' },
        { roll: 4, skill: 'explosives' },
        { roll: 5, skill: 'electronics', specialty: 'comms' },
        { roll: 6, skill: 'medic' },
      ],
    },
    {
      id: 'infantry',
      name: 'Infantry',
      description: 'Front-line ground troops who fight, patrol, and hold territory on foot.',
      survival: { characteristic: 'STR', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'guncombat' },
        { roll: 2, skill: 'melee' },
        { roll: 3, skill: 'heavyweapons' },
        { roll: 4, skill: 'stealth' },
        { roll: 5, skill: 'athletics' },
        { roll: 6, skill: 'recon' },
      ],
    },
    {
      id: 'cavalry',
      name: 'Cavalry',
      description:
        'Vehicle and gunship crews who bring armour, mobility, and heavy firepower to battle.',
      survival: { characteristic: 'DEX', target: 7 },
      advancement: { characteristic: 'INT', target: 5 },
      skillTable: [
        { roll: 1, skill: 'mechanic' },
        { roll: 2, skill: 'drive' },
        { roll: 3, skill: 'flyer' },
        { roll: 4, skill: 'recon' },
        { roll: 5, skill: 'heavyweapons', specialty: 'vehicle' },
        { roll: 6, skill: 'electronics', specialty: 'sensors' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'medic' },
      { roll: 6, skill: 'melee' },
    ],
    service: [
      { roll: 1, skill: 'drive|vaccsuit' },
      { roll: 2, skill: 'athletics' },
      { roll: 3, skill: 'guncombat' },
      { roll: 4, skill: 'recon' },
      { roll: 5, skill: 'melee' },
      { roll: 6, skill: 'heavyweapons' },
    ],
    advanced: [
      { roll: 1, skill: 'tactics', specialty: 'military' },
      { roll: 2, skill: 'electronics' },
      { roll: 3, skill: 'navigation' },
      { roll: 4, skill: 'explosives' },
      { roll: 5, skill: 'engineer' },
      { roll: 6, skill: 'survival' },
    ],
    officer: [
      { roll: 1, skill: 'tactics', specialty: 'military' },
      { roll: 2, skill: 'leadership' },
      { roll: 3, skill: 'advocate' },
      { roll: 4, skill: 'diplomat' },
      { roll: 5, skill: 'electronics' },
      { roll: 6, skill: 'admin' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Private', skill: 'guncombat', skillLevel: 1 },
    { rank: 1, title: 'Lance Corporal', skill: 'recon', skillLevel: 1 },
    { rank: 2, title: 'Corporal' },
    { rank: 3, title: 'Lance Sergeant', skill: 'leadership', skillLevel: 1 },
    { rank: 4, title: 'Sergeant' },
    { rank: 5, title: 'Gunnery Sergeant' },
    { rank: 6, title: 'Sergeant Major' },
  ],

  officerRanks: [
    { rank: 1, title: 'Lieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 2, title: 'Captain' },
    { rank: 3, title: 'Major', benefit: 'Tactics (military) 1' },
    { rank: 4, title: 'Lieutenant Colonel' },
    { rank: 5, title: 'Colonel' },
    { rank: 6, title: 'General', benefit: 'SOC 10 or +1 SOC, whichever is higher' },
  ],

  cashBenefits: [2000, 5000, 10000, 10000, 10000, 20000, 30000],

  benefitTable: [
    { roll: 1, benefit: 'Cybernetic Implant' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Armour' },
    { roll: 6, benefit: '+1 END or Cybernetic Implant' },
    { roll: 7, benefit: '+1 SOC' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A crisis strikes; resolve a mishap, though this term does not end your service.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description:
        'Your posting is on a dangerous frontier world or other harsh terrain, teaching hard survival lessons.',
      effects: [
        {
          type: 'skill',
          target: 'vaccsuit|engineer|animals.riding|animals.training|recon',
          value: 1,
        },
      ],
    },
    {
      roll: 4,
      description:
        'You deploy to a shattered city where fighting has consumed the streets and infrastructure.',
      effects: [{ type: 'skill', target: 'stealth|streetwise|persuade|recon', value: 1 }],
    },
    {
      roll: 5,
      description: 'Your unit entrusts you with an unusual responsibility or detached duty.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description:
        'You endure savage ground fighting. Avoiding harm takes EDU 8+; success improves Gun Combat or Leadership.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value: 'EDU 8+: avoid injury; success gains Gun Combat or Leadership 1',
        },
      ],
    },
    {
      roll: 7,
      description: 'A personal milestone interrupts military routine; resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Specialist instruction is made available for a field you already know.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+: increase one existing skill by 1' },
      ],
    },
    {
      roll: 9,
      description:
        'Cut off by superior enemy numbers, you keep fighting until friendly forces break through.',
      effects: [{ type: 'special', target: 'next_advancement_dm', value: 2 }],
    },
    {
      roll: 10,
      description: 'You serve as a stabilising force in a tense post-conflict zone.',
      effects: [{ type: 'skill', target: 'admin|investigate|deception|recon', value: 1 }],
    },
    {
      roll: 11,
      description: 'A senior leader sponsors your progress and helps steer your military future.',
      choices: [
        {
          id: 'mentor-tactics',
          description: 'Study operational planning.',
          effects: [{ type: 'skill', target: 'tactics.military', value: 1 }],
        },
        {
          id: 'mentor-advancement',
          description: 'Use the patronage to improve promotion prospects.',
          effects: [{ type: 'special', target: 'next_advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'Exceptional courage under fire earns immediate career recognition.',
      effects: [{ type: 'special', target: 'promotion_or_commission', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description: 'Catastrophic combat wounds end the term.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description:
        'A disastrous engagement destroys your formation, and you hold the commander responsible for the loss.',
      injury: false,
      forced: true,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'failed_commander' },
      ],
    },
    {
      roll: 3,
      description:
        'A brutal counter-insurgency posting is quietly erased from official memory, leaving enemies behind.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'recon|survival', value: 1 }],
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'insurgent_enemy' }],
    },
    {
      roll: 4,
      description:
        'You uncover criminal conduct by your superior; joining in or reporting it both end your posting.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value: 'join superior as Ally, or cooperate and keep this term Benefit roll',
        },
      ],
    },
    {
      roll: 5,
      description: 'A vicious feud with someone in uniform becomes career-ending.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'military_rival' }],
    },
    {
      roll: 6,
      description: 'Battle wounds force an injury roll.',
      injury: true,
      forced: true,
    },
  ],
};
