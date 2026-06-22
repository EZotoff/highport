import type { CareerDefinition } from '../../../types/career.js';

export const AGENT_CAREER: CareerDefinition = {
  id: 'agent',
  name: 'Agent',
  description:
    'Investigators, covert operatives, and corporate troubleshooters who handle sensitive work in the shadows.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'lawEnforcement',
      name: 'Law Enforcement',
      description: 'A public investigator or peace officer working cases, patrols, and arrests.',
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
      description:
        'A clandestine operative assigned to surveillance, disruption, and secret missions.',
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
      description:
        'An employee or contractor gathering secrets and countering threats for a business patron.',
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
    { rank: 0, title: 'Law Enforcement: Rookie' },
    { rank: 1, title: 'Law Enforcement: Corporal', skill: 'streetwise', skillLevel: 1 },
    { rank: 2, title: 'Law Enforcement: Sergeant' },
    { rank: 3, title: 'Law Enforcement: Detective' },
    { rank: 4, title: 'Law Enforcement: Lieutenant', skill: 'investigate', skillLevel: 1 },
    { rank: 5, title: 'Law Enforcement: Chief', skill: 'admin', skillLevel: 1 },
    { rank: 6, title: 'Law Enforcement: Commissioner', benefit: '+1 SOC' },
    { rank: 0, title: 'Intelligence/Corporate: —' },
    { rank: 1, title: 'Intelligence/Corporate: Agent', skill: 'deception', skillLevel: 1 },
    { rank: 2, title: 'Intelligence/Corporate: Field Agent', skill: 'investigate', skillLevel: 1 },
    { rank: 3, title: 'Intelligence/Corporate: —' },
    { rank: 4, title: 'Intelligence/Corporate: Special Agent', skill: 'guncombat', skillLevel: 1 },
    { rank: 5, title: 'Intelligence/Corporate: Assistant Director' },
    { rank: 6, title: 'Intelligence/Corporate: Director' },
  ],

  cashBenefits: [1000, 2000, 5000, 7500, 10000, 25000, 50000],

  benefitTable: [
    { roll: 1, benefit: 'Scientific Equipment' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: 'Ship Share' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Cybernetic Implant' },
    { roll: 6, benefit: '+1 SOC', orHighRank: 'Cybernetic Implant' },
    { roll: 7, benefit: 'TAS Membership' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A crisis strikes; resolve a Mishap roll, but this event does not remove you from the career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'A case turns perilous and tests your fieldcraft.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Investigate 8+ or Streetwise 8+; fail: mishap; success: gain Deception, Jack-of-all-Trades, Persuade or Tactics 1',
        },
      ],
    },
    {
      roll: 4,
      description: 'You finish an important assignment and receive a career benefit advantage.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 5,
      description: 'Your professional web expands through informants, assets, and acquaintances.',
      effects: [{ type: 'special', target: 'contacts', value: 'D3' }],
    },
    {
      roll: 6,
      description: 'Specialist instruction lets you deepen an ability you already possess.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+ to increase any existing skill by 1' },
      ],
    },
    {
      roll: 7,
      description: 'Resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You infiltrate hostile circles while posing as someone else.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Deception 8+; success: Rogue or Citizen event plus one Specialist skill table roll; fail: Rogue or Citizen mishap',
        },
      ],
    },
    {
      roll: 9,
      description: 'Exceptional service improves your prospects for promotion.',
      effects: [{ type: 'special', target: 'advancement_dm', value: 2 }],
    },
    {
      roll: 10,
      description: 'Vehicle-focused training broadens your operational options.',
      effects: [{ type: 'skill', target: 'drive|flyer|pilot|gunner', value: 1 }],
    },
    {
      roll: 11,
      description: 'A high-ranking operative takes an interest in your career.',
      choices: [
        {
          id: 'mentor-investigation',
          description: 'Learn investigative methods from the mentor.',
          effects: [{ type: 'skill', target: 'investigate', value: 1 }],
        },
        {
          id: 'mentor-promotion',
          description: "Use the mentor's backing for advancement.",
          effects: [{ type: 'special', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'You expose a large plot targeting your organization.',
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
      description:
        'A target offers a bargain: take it and depart without extra punishment, or refuse and risk serious harm.',
      injury: true,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value:
            'accept: leave and lose term Benefit roll; refuse: roll twice on Injury and keep lower result',
        },
        { type: 'skill', target: 'any', value: 1 },
      ],
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'investigated_enemy' },
      ],
    },
    {
      roll: 3,
      description: 'A case collapses disastrously or implicates people too powerful to touch.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            'Advocate 8+; success: keep this term Benefit roll; natural 2: Prisoner career next term',
        },
      ],
    },
    {
      roll: 4,
      description: 'You uncover a lethal secret and become marked for removal.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'deception', value: 1 }],
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'secret_hunter' }],
    },
    {
      roll: 5,
      description: 'Danger from the job reaches someone close to you.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'associate_injury',
          value:
            'Choose a Contact, Ally or family member; roll twice on Injury and keep lower result for them',
        },
      ],
    },
    {
      roll: 6,
      description: 'You are hurt in the line of duty.',
      injury: true,
      forced: true,
    },
  ],
};
