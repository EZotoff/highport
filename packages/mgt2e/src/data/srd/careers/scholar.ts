import type { CareerDefinition } from '../../../types/career.js';

export const SCHOLAR_CAREER: CareerDefinition = {
  id: 'scholar',
  name: 'Scholar',
  description:
    'Researchers, scientists, medics, and field specialists who advance knowledge or practise medicine.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'fieldResearcher',
      name: 'Field Researcher',
      description: 'An explorer-scientist who works both in laboratories and in difficult terrain.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'INT', target: 6 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'vaccsuit' },
        { roll: 3, skill: 'navigation' },
        { roll: 4, skill: 'survival' },
        { roll: 5, skill: 'investigate' },
        { roll: 6, skill: 'science' },
      ],
    },
    {
      id: 'scientist',
      name: 'Scientist',
      description:
        'A formal researcher in an institute, corporation, private lab, or orbital facility.',
      survival: { characteristic: 'EDU', target: 4 },
      advancement: { characteristic: 'INT', target: 8 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'engineer' },
        { roll: 3, skill: 'science' },
        { roll: 4, skill: 'science' },
        { roll: 5, skill: 'electronics' },
        { roll: 6, skill: 'science' },
      ],
    },
    {
      id: 'physician',
      name: 'Physician',
      description: 'A doctor, healer, clinician, or medical researcher.',
      survival: { characteristic: 'EDU', target: 4 },
      advancement: { characteristic: 'EDU', target: 8 },
      skillTable: [
        { roll: 1, skill: 'medic' },
        { roll: 2, skill: 'electronics' },
        { roll: 3, skill: 'investigate' },
        { roll: 4, skill: 'medic' },
        { roll: 5, skill: 'persuade' },
        { roll: 6, skill: 'science' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 INT' },
      { roll: 2, skill: '+1 EDU' },
      { roll: 3, skill: '+1 SOC' },
      { roll: 4, skill: '+1 DEX' },
      { roll: 5, skill: '+1 END' },
      { roll: 6, skill: 'language' },
    ],
    service: [
      { roll: 1, skill: 'drive|flyer' },
      { roll: 2, skill: 'electronics' },
      { roll: 3, skill: 'diplomat' },
      { roll: 4, skill: 'medic' },
      { roll: 5, skill: 'investigate' },
      { roll: 6, skill: 'science' },
    ],
    advanced: [
      { roll: 1, skill: 'art' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'electronics' },
      { roll: 4, skill: 'language' },
      { roll: 5, skill: 'engineer' },
      { roll: 6, skill: 'science' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Field Researcher: —' },
    { rank: 1, title: 'Field Researcher: —', skill: 'science', skillLevel: 1 },
    { rank: 2, title: 'Field Researcher: —', skill: 'electronics', skillLevel: 1 },
    { rank: 3, title: 'Field Researcher: —', skill: 'investigate', skillLevel: 1 },
    { rank: 4, title: 'Field Researcher: —' },
    { rank: 5, title: 'Field Researcher: —', skill: 'science', skillLevel: 2 },
    { rank: 6, title: 'Field Researcher: —' },
    { rank: 0, title: 'Scientist: —' },
    { rank: 1, title: 'Scientist: —', skill: 'science', skillLevel: 1 },
    { rank: 2, title: 'Scientist: —', skill: 'electronics', skillLevel: 1 },
    { rank: 3, title: 'Scientist: —', skill: 'investigate', skillLevel: 1 },
    { rank: 4, title: 'Scientist: —' },
    { rank: 5, title: 'Scientist: —', skill: 'science', skillLevel: 2 },
    { rank: 6, title: 'Scientist: —' },
    { rank: 0, title: 'Physician: —' },
    { rank: 1, title: 'Physician: —', skill: 'medic', skillLevel: 1 },
    { rank: 2, title: 'Physician: —' },
    { rank: 3, title: 'Physician: —', skill: 'science', skillLevel: 1 },
    { rank: 4, title: 'Physician: —' },
    { rank: 5, title: 'Physician: —', skill: 'science', skillLevel: 2 },
    { rank: 6, title: 'Physician: —' },
  ],

  cashBenefits: [5000, 10000, 20000, 30000, 40000, 60000, 100000],

  benefitTable: [
    { roll: 1, benefit: '+1 INT' },
    { roll: 2, benefit: '+1 EDU' },
    { roll: 3, benefit: 'Two Ship Shares' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: 'Scientific Equipment' },
    { roll: 6, benefit: 'Lab Ship' },
    { roll: 7, benefit: 'Lab Ship' },
  ],

  events: [
    {
      roll: 2,
      description:
        "A severe setback hits your work; roll on this career's Mishap table, but the term is not automatically ended.",
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'You are asked to undertake research that violates your principles.',
      choices: [
        {
          id: 'accept-unethical-research',
          description: 'Proceed anyway and profit, but make enemies.',
          effects: [
            { type: 'benefit', target: 'benefit_rolls', value: 1 },
            { type: 'skill', target: 'science', value: 1 },
            { type: 'special', target: 'enemies', value: 'D3' },
          ],
        },
        {
          id: 'refuse-unethical-research',
          description: 'Refuse the work.',
          effects: [],
        },
      ],
    },
    {
      roll: 4,
      description: 'A sponsor or institution assigns you to confidential work.',
      effects: [
        { type: 'skill', target: 'medic|science|engineer|electronics|investigate', value: 1 },
      ],
    },
    {
      roll: 5,
      description: 'Your work earns a major honour and professional jealousy.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'You receive advanced instruction in a specialist area.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+ to gain any one skill at level 1' },
      ],
    },
    {
      roll: 7,
      description: 'A personal turning point occurs; roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description:
        'You can advance your research by cheating, stealing, or using a dangerous shortcut.',
      choices: [
        {
          id: 'refuse-shortcut',
          description: 'Avoid the unethical path.',
          effects: [],
        },
        {
          id: 'take-shortcut',
          description:
            'Try the shortcut with Deception or Admin 8+; success grants rewards and an Enemy, failure costs a Benefit roll and still creates an Enemy.',
          effects: [
            { type: 'special', target: 'roll', value: 'Deception or Admin 8+' },
            { type: 'benefit', target: 'dm', value: 2, condition: 'if roll succeeds' },
            {
              type: 'special',
              target: 'increase_skill',
              value: 'any',
              condition: 'if roll succeeds',
            },
            { type: 'special', target: 'enemy', value: 'gain' },
            { type: 'benefit', target: 'benefit_rolls', value: -1, condition: 'if roll fails' },
          ],
        },
      ],
    },
    {
      roll: 9,
      description: 'You make an important discovery in your discipline.',
      effects: [{ type: 'benefit', target: 'advancement_dm', value: 2 }],
    },
    {
      roll: 10,
      description: 'Administrative or legal complications consume your time.',
      effects: [{ type: 'skill', target: 'admin|advocate|persuade|diplomat', value: 1 }],
    },
    {
      roll: 11,
      description: 'A brilliant eccentric mentor takes you under their wing.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'eccentric_mentor' }],
      choices: [
        {
          id: 'mentor-science',
          description: 'Deepen your scientific ability.',
          effects: [{ type: 'skill', target: 'science', value: 1 }],
        },
        {
          id: 'mentor-advancement',
          description: "Use the mentor's aid to progress.",
          effects: [{ type: 'benefit', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'Your research produces a major breakthrough.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  flavorTemplates: {
    '3': ['A sponsor asks you to cross a line your training never prepared you to ignore.'],
    '5': [
      'Your work receives serious recognition, and with the applause comes envy from people who understand its value.',
    ],
    '9': [
      'The data finally resolves into a discovery important enough to change your standing in the field.',
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
      description: 'A catastrophe injures people, and blame falls on you.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'roll_twice_take_higher' }],
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'blaming_survivor' },
      ],
    },
    {
      roll: 3,
      description: 'Authorities obstruct your research for ideological or political reasons.',
      injury: false,
      forced: false,
      effects: [
        { type: 'skill', target: 'science', value: 1 },
        {
          type: 'special',
          target: 'choice',
          value: 'Open work gains an Enemy; secret work reduces SOC by 2',
        },
      ],
    },
    {
      roll: 4,
      description: 'A field trip or voyage fails, stranding you until your post is lost.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'survival|athletics', value: 1 }],
    },
    {
      roll: 5,
      description: 'Unknown saboteurs ruin your work.',
      injury: false,
      forced: false,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value:
            "Leave and keep this term's Benefit roll, or stay and lose all career Benefit rolls",
        },
      ],
    },
    {
      roll: 6,
      description: 'A rival damages your reputation or takes credit for your research.',
      injury: false,
      forced: false,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'academic_rival' }],
    },
  ],
};
