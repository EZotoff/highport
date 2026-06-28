import type { CareerDefinition } from '../../../types/career.js';

export const ROGUE_CAREER: CareerDefinition = {
  id: 'rogue',
  name: 'Rogue',
  description: 'Thieves, enforcers, pirates, and other criminals who survive by illegal means.',

  qualification: {
    characteristic: 'DEX',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'thief',
      name: 'Thief',
      description:
        'A burglar, pickpocket, con artist, or other criminal focused on taking valuables.',
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
      description: 'A violent operator, guard, killer, or intimidator working for criminals.',
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
      description: 'A raider, corsair, or shipboard criminal preying on space traffic.',
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
    { rank: 0, title: 'Thief: —' },
    { rank: 1, title: 'Thief: —', skill: 'stealth', skillLevel: 1 },
    { rank: 2, title: 'Thief: —' },
    { rank: 3, title: 'Thief: —', skill: 'streetwise', skillLevel: 1 },
    { rank: 4, title: 'Thief: —' },
    { rank: 5, title: 'Thief: —', skill: 'recon', skillLevel: 1 },
    { rank: 6, title: 'Thief: —' },
    { rank: 0, title: 'Enforcer: —' },
    { rank: 1, title: 'Enforcer: —', skill: 'persuade', skillLevel: 1 },
    { rank: 2, title: 'Enforcer: —' },
    { rank: 3, title: 'Enforcer: —', skill: 'guncombat|melee', skillLevel: 1 },
    { rank: 4, title: 'Enforcer: —' },
    { rank: 5, title: 'Enforcer: —', skill: 'streetwise', skillLevel: 1 },
    { rank: 6, title: 'Enforcer: —' },
    { rank: 0, title: 'Pirate: Lackey' },
    { rank: 1, title: 'Pirate: Henchman', skill: 'pilot|gunner', skillLevel: 1 },
    { rank: 2, title: 'Pirate: Corporal' },
    { rank: 3, title: 'Pirate: Sergeant', skill: 'guncombat|melee', skillLevel: 1 },
    { rank: 4, title: 'Pirate: Lieutenant' },
    { rank: 5, title: 'Pirate: Leader', skill: 'leadership', skillLevel: 1 },
    { rank: 6, title: 'Pirate: Captain' },
  ],

  cashBenefits: [0, 0, 10000, 10000, 50000, 100000, 100000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: 'Weapon' },
    { roll: 3, benefit: '+1 INT' },
    { roll: 4, benefit: '1D Ship Shares' },
    { roll: 5, benefit: 'Armour' },
    { roll: 6, benefit: '+1 DEX' },
    { roll: 7, benefit: '2D Ship Shares' },
  ],

  events: [
    {
      roll: 2,
      description:
        "A job turns disastrous; roll on this career's Mishap table, but this event alone does not end the career.",
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'Authorities bring charges against you.',
      choices: [
        {
          id: 'self-defence',
          description:
            'Argue your own case with Advocate 8+; failure creates an Enemy and sends you to Prisoner next term.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value: 'Advocate 8+: success charges dropped, failure Enemy and Prisoner next term',
            },
          ],
        },
        {
          id: 'hire-lawyer',
          description: 'Hire legal help, gain the lawyer as a Contact, and lose one Benefit roll.',
          effects: [
            { type: 'special', target: 'contact', value: 'lawyer' },
            { type: 'benefit', target: 'benefit_rolls', value: -1 },
          ],
        },
      ],
    },
    {
      roll: 4,
      description: 'You help design a major theft or raid.',
      effects: [{ type: 'skill', target: 'electronics|mechanic', value: 1 }],
    },
    {
      roll: 5,
      description: 'A crime succeeds spectacularly, though the victim remembers you.',
      effects: [
        { type: 'benefit', target: 'dm', value: 2 },
        { type: 'special', target: 'enemy', value: 'victim' },
      ],
    },
    {
      roll: 6,
      description: 'You can betray another criminal for personal advancement.',
      choices: [
        {
          id: 'betray-rogue',
          description: 'Take the advantage.',
          effects: [{ type: 'benefit', target: 'advancement_dm', value: 4 }],
        },
        {
          id: 'spare-rogue',
          description: 'Refuse and gain them as an Ally.',
          effects: [{ type: 'special', target: 'ally', value: 'fellow_rogue' }],
        },
      ],
    },
    {
      roll: 7,
      description: 'A personal turning point occurs; roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Months spent among dangerous criminals sharpen your survival instincts.',
      effects: [{ type: 'skill', target: 'streetwise|stealth|melee|guncombat', value: 1 }],
    },
    {
      roll: 9,
      description: 'A feud with another criminal outfit escalates.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value: 'Stealth or Gun Combat 8+: failure injury, success extra Benefit roll',
        },
      ],
    },
    {
      roll: 10,
      description: 'You participate in an illegal gambling operation.',
      effects: [
        { type: 'skill', target: 'gambler', value: 1 },
        {
          type: 'special',
          target: 'wager',
          value:
            'Stake any Benefit rolls; Gambler 8+ wins half that number rounded up, failure loses them',
        },
      ],
    },
    {
      roll: 11,
      description: 'A powerful underworld boss treats you as a promising protégé.',
      choices: [
        {
          id: 'crime-lord-tactics',
          description: 'Learn military tactics.',
          effects: [{ type: 'skill', target: 'tactics', value: 1 }],
        },
        {
          id: 'crime-lord-advancement',
          description: "Use the boss's influence to climb.",
          effects: [{ type: 'benefit', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'You pull off a crime that enters legend.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  flavorTemplates: {
    '3': [
      'The law finally puts your name on paper, and the next move depends on favors, nerve, and courtroom improvisation.',
    ],
    '5': [
      'A score pays out beyond expectation, but the mark survives with enough memory and money to make trouble.',
    ],
    '9': [
      'A feud with another outfit spills into the open, making every safehouse and familiar street feel contested.',
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
      description: 'You are caught and must enter the Prisoner career next term.',
      injury: false,
      forced: true,
      effects: [{ type: 'special', target: 'next_career', value: 'prisoner' }],
    },
    {
      roll: 3,
      description: 'A trusted associate sells you out; rarely, the betrayal also leads to prison.',
      injury: false,
      forced: true,
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'betraying_friend' },
      ],
      effects: [{ type: 'special', target: 'roll', value: '2D: on 2, Prisoner career next term' }],
    },
    {
      roll: 4,
      description: 'An operation collapses and you flee the world.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'deception|pilot|athletics|gunner', value: 1 }],
    },
    {
      roll: 5,
      description: 'A detective or rival criminal drives you away and swears pursuit.',
      injury: false,
      forced: true,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'relentless_hunter' },
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
