import type { CareerDefinition } from '../../../types/career.js';

export const CITIZEN_CAREER: CareerDefinition = {
  id: 'citizen',
  name: 'Citizen',
  description:
    'Corporate staff, industrial workers, and settlers building lives on developed or frontier worlds.',

  qualification: {
    characteristic: 'EDU',
    target: 5,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'A manager, administrator, or executive inside a large organisation.',
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
      description: 'A practical labourer, technician, or tradesperson on an industrial world.',
      survival: { characteristic: 'END', target: 4 },
      advancement: { characteristic: 'EDU', target: 8 },
      skillTable: [
        { roll: 1, skill: 'drive' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'electronics' },
        { roll: 4, skill: 'engineer' },
        { roll: 5, skill: 'profession' },
        { roll: 6, skill: 'science' },
      ],
    },
    {
      id: 'colonist',
      name: 'Colonist',
      description: 'A settler carving out a home on a world that is still rough around the edges.',
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
    { rank: 0, title: 'Corporate: —' },
    { rank: 1, title: 'Corporate: —' },
    { rank: 2, title: 'Corporate: Manager', skill: 'admin', skillLevel: 1 },
    { rank: 3, title: 'Corporate: —' },
    { rank: 4, title: 'Corporate: Senior Manager', skill: 'advocate', skillLevel: 1 },
    { rank: 5, title: 'Corporate: —' },
    { rank: 6, title: 'Corporate: Director', benefit: '+1 SOC' },
    { rank: 0, title: 'Worker: —' },
    { rank: 1, title: 'Worker: —' },
    { rank: 2, title: 'Worker: Technician', skill: 'profession', skillLevel: 1 },
    { rank: 3, title: 'Worker: —' },
    { rank: 4, title: 'Worker: Craftsman', skill: 'mechanic', skillLevel: 1 },
    { rank: 5, title: 'Worker: —' },
    { rank: 6, title: 'Worker: Master Technician', skill: 'engineer', skillLevel: 1 },
    { rank: 0, title: 'Colonist: —' },
    { rank: 1, title: 'Colonist: —' },
    { rank: 2, title: 'Colonist: Settler', skill: 'survival', skillLevel: 1 },
    { rank: 3, title: 'Colonist: —' },
    { rank: 4, title: 'Colonist: Explorer', skill: 'navigation', skillLevel: 1 },
    { rank: 5, title: 'Colonist: —' },
    { rank: 6, title: 'Colonist: —', skill: 'guncombat', skillLevel: 1 },
  ],

  cashBenefits: [2000, 5000, 10000, 10000, 10000, 50000, 100000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: 'Ally' },
    { roll: 3, benefit: '+1 INT' },
    { roll: 4, benefit: 'Gun' },
    { roll: 5, benefit: '+1 EDU' },
    { roll: 6, benefit: 'Two Ship Shares' },
    { roll: 7, benefit: 'TAS Membership' },
  ],

  events: [
    {
      roll: 2,
      description:
        "A serious setback strikes; roll on this career's Mishap table, but this term continues afterward.",
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'Unrest on your homeworld pulls you into a struggle for control.',
      choices: [
        {
          id: 'revolution-skill',
          description:
            'Gain Advocate 1, Persuade 1, Explosives 1, or Streetwise 1; then roll that skill 8+ for the aftermath.',
          effects: [
            { type: 'skill', target: 'advocate|persuade|explosives|streetwise', value: 1 },
            {
              type: 'special',
              target: 'roll',
              value: 'Chosen skill 8+: success DM+2 next advancement, failure DM-2 next survival',
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      description: 'Work or recreation puts you around heavy vehicles and their support systems.',
      effects: [{ type: 'skill', target: 'mechanic|drive|electronics|flyer|engineer', value: 1 }],
    },
    {
      roll: 5,
      description: 'Your workplace, enterprise, or settlement enters a period of growth.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'You are selected for specialist instruction.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 10+ to gain any one skill at level 1' },
      ],
    },
    {
      roll: 7,
      description: 'A personal turning point occurs; roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You uncover damaging information that could be exploited outside the law.',
      choices: [
        {
          id: 'exploit-secret',
          description: 'Use the information for profit.',
          effects: [
            { type: 'benefit', target: 'dm', value: 1 },
            { type: 'skill', target: 'streetwise|deception', value: 1 },
            { type: 'special', target: 'contact', value: 'criminal' },
          ],
        },
        {
          id: 'ignore-secret',
          description: 'Leave the matter alone.',
          effects: [],
        },
      ],
    },
    {
      roll: 9,
      description: 'Your effort or cleverness is recognised.',
      effects: [{ type: 'benefit', target: 'advancement_dm', value: 2 }],
    },
    {
      roll: 10,
      description:
        'Technical duties such as systems operation or survey work broaden your expertise.',
      effects: [{ type: 'skill', target: 'electronics|engineer', value: 1 }],
    },
    {
      roll: 11,
      description: 'A higher-up becomes personally invested in your success.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'supportive_superior' },
      ],
      choices: [
        {
          id: 'superior-diplomat',
          description: 'Learn from their political guidance.',
          effects: [{ type: 'skill', target: 'diplomat', value: 1 }],
        },
        {
          id: 'superior-advancement',
          description: 'Use their backing for promotion.',
          effects: [{ type: 'benefit', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'You gain real authority in your workplace or settlement.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  flavorTemplates: {
    '3': [
      'Local unrest stops being background noise and pulls your workplace, neighbours, and future into the same fight.',
    ],
    '5': [
      'The business, settlement, or public office around you enters a rare upswing, giving your efforts room to matter.',
    ],
    '8': [
      'A compromising secret lands in your hands, and the safest civic choice may not be the most profitable one.',
    ],
  },

  mishaps: [
    {
      roll: 1,
      description: 'You suffer a major injury.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'A criminal group destroys your prospects and keeps hounding you.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'criminal_gang' }],
    },
    {
      roll: 3,
      description: 'A collapse in trade costs you your position and social standing.',
      injury: false,
      forced: true,
      effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
    },
    {
      roll: 4,
      description:
        'Officials scrutinise your business or outside interests meddle with your colony.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value: 'Cooperate: DM+2 next career qualification; refuse: gain an Ally',
        },
      ],
    },
    {
      roll: 5,
      description: 'Violence, rebellion, or another extraordinary crisis forces you offworld.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'roll',
          value: 'Streetwise 8+ to increase any known skill by one level',
        },
      ],
    },
    {
      roll: 6,
      description: 'You are injured.',
      injury: true,
      forced: true,
    },
  ],
};
