import type { CareerDefinition } from '../../../types/career.js';

export const MERCHANT_CAREER: CareerDefinition = {
  id: 'merchant',
  name: 'Merchant',
  description:
    'Commercial spacers, independent traders, and brokers who move cargo, passengers, and deals between worlds.',

  qualification: {
    characteristic: 'INT',
    target: 4,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'merchantMarine',
      name: 'Merchant Marine',
      description: 'Crew aboard immense corporate or Imperial freighters on regular trade routes.',
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
      id: 'freeTrader',
      name: 'Free Trader',
      description:
        'Crew on a small independent ship chasing speculative cargoes and irregular passages.',
      survival: { characteristic: 'DEX', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 2, skill: 'vaccsuit' },
        { roll: 3, skill: 'deception' },
        { roll: 4, skill: 'mechanic' },
        { roll: 5, skill: 'streetwise' },
        { roll: 6, skill: 'gunner' },
      ],
    },
    {
      id: 'broker',
      name: 'Broker',
      description: 'A starport or planetary deal-maker matching goods, buyers, and credit.',
      survival: { characteristic: 'EDU', target: 5 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'advocate' },
        { roll: 3, skill: 'broker' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'deception' },
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
      { roll: 3, skill: 'electronics' },
      { roll: 4, skill: 'pilot' },
      { roll: 5, skill: 'admin' },
      { roll: 6, skill: 'advocate' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Merchant Marine: Crewman' },
    { rank: 1, title: 'Merchant Marine: Senior Crewman', skill: 'mechanic', skillLevel: 1 },
    { rank: 2, title: 'Merchant Marine: 4th Officer' },
    { rank: 3, title: 'Merchant Marine: 3rd Officer' },
    { rank: 4, title: 'Merchant Marine: 2nd Officer', skill: 'pilot', skillLevel: 1 },
    { rank: 5, title: 'Merchant Marine: 1st Officer', benefit: '+1 SOC' },
    { rank: 6, title: 'Merchant Marine: Captain' },
    { rank: 0, title: 'Free Trader: —' },
    { rank: 1, title: 'Free Trader: —', skill: 'persuade', skillLevel: 1 },
    { rank: 2, title: 'Free Trader: —' },
    { rank: 3, title: 'Free Trader: Experienced Trader', skill: 'jackofalltrades', skillLevel: 1 },
    { rank: 4, title: 'Free Trader: —' },
    { rank: 5, title: 'Free Trader: —' },
    { rank: 6, title: 'Free Trader: —' },
    { rank: 0, title: 'Broker: —' },
    { rank: 1, title: 'Broker: —', skill: 'broker', skillLevel: 1 },
    { rank: 2, title: 'Broker: —' },
    { rank: 3, title: 'Broker: Experienced Broker', skill: 'streetwise', skillLevel: 1 },
    { rank: 4, title: 'Broker: —' },
    { rank: 5, title: 'Broker: —' },
    { rank: 6, title: 'Broker: —' },
  ],

  cashBenefits: [1000, 5000, 10000, 20000, 20000, 40000, 40000],

  benefitTable: [
    { roll: 1, benefit: 'Blade' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Gun' },
    { roll: 5, benefit: 'Ship Share' },
    { roll: 6, benefit: 'Free Trader' },
    { roll: 7, benefit: 'Free Trader' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A major setback hits; resolve a Mishap roll, but this event does not end the career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'A smuggling job is put in front of you.',
      choices: [
        {
          id: 'smuggle-cargo',
          description: 'Take the illegal cargo risk.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value:
                'Deception 8+ or Persuade 8+; success: Streetwise 1 and one extra Benefit roll',
            },
          ],
        },
        {
          id: 'reject-smuggling',
          description: 'Turn down the criminals.',
          effects: [],
        },
      ],
      spawns: [{ type: 'npc', relationship: 'enemy', required: false, template: 'criminal_enemy' }],
    },
    {
      roll: 4,
      description: 'Routine dealings with suppliers and crews teach you a practical trade.',
      effects: [
        { type: 'skill', target: 'profession|electronics|engineer|animals|science', value: 1 },
      ],
    },
    {
      roll: 5,
      description: 'You can stake benefit rolls on a speculative bargain.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Gambler 8+ or Broker 8+; success: gain half the risked Benefit rolls rounded up; fail: lose risked rolls; either way gain 1 level in the skill used',
        },
      ],
    },
    {
      roll: 6,
      description: 'Someone useful from outside your usual circles enters your orbit.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'unexpected_contact' },
      ],
    },
    {
      roll: 7,
      description: 'Resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'A legal dispute threatens to entangle your business.',
      effects: [
        { type: 'skill', target: 'advocate|admin|diplomat|investigate', value: 1 },
        { type: 'special', target: 'roll', value: 'Roll 2D; on 2, take Prisoner career next term' },
      ],
    },
    {
      roll: 9,
      description: 'Specialist study gives you a chance to improve a known skill.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+ to increase any existing skill by 1' },
      ],
    },
    {
      roll: 10,
      description: 'A profitable run funds a more comfortable few years.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 11,
      description: 'A valuable ally in a useful sphere becomes part of your life.',
      choices: [
        {
          id: 'ally-carouse',
          description: 'Learn from social access and parties.',
          effects: [{ type: 'skill', target: 'carouse', value: 1 }],
        },
        {
          id: 'ally-advancement',
          description: 'Let the ally boost your career prospects.',
          effects: [{ type: 'special', target: 'advancement_dm', value: 4 }],
        },
      ],
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'merchant_ally' }],
    },
    {
      roll: 12,
      description: 'Your venture prospers dramatically.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description: 'A grave injury occurs.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'A competing trader ruins your finances.',
      injury: false,
      forced: true,
      effects: [
        { type: 'special', target: 'benefits', value: 'Lose all Benefits from this career' },
      ],
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'merchant_rival' }],
    },
    {
      roll: 3,
      description: 'War abruptly wrecks your routes and contacts, forcing a move to safer space.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'guncombat|pilot', value: 1 }],
    },
    {
      roll: 4,
      description: 'Criminal action destroys your vessel or operating port.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'criminal_enemy' }],
    },
    {
      roll: 5,
      description: 'Imperial commerce rules make continued operation impossible.',
      injury: false,
      forced: true,
      effects: [{ type: 'special', target: 'auto_qualify', value: 'Rogue next term' }],
    },
    {
      roll: 6,
      description:
        'Bad calls and failed bargains leave you insolvent, though you recover some value.',
      injury: false,
      forced: true,
      effects: [{ type: 'benefit', target: 'extra_roll', value: 1 }],
    },
  ],
};
