import type { CareerDefinition } from '../../../types/career.js';

export const ENTERTAINER_CAREER: CareerDefinition = {
  id: 'entertainer',
  name: 'Entertainer',
  description:
    'Artists, reporters, performers, and public figures who make a living through media and attention.',

  qualification: {
    characteristic: 'DEX',
    target: 5,
    previousCareerPenalty: -1,
    // Player may use INT instead of DEX
  },

  assignments: [
    {
      id: 'artist',
      name: 'Artist',
      description: 'A creator of written, visual, immersive, or other artistic works.',
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
      description:
        'A correspondent or investigator reporting stories to local or interstellar audiences.',
      survival: { characteristic: 'EDU', target: 7 },
      advancement: { characteristic: 'INT', target: 5 },
      skillTable: [
        { roll: 1, skill: 'art', specialty: 'write' },
        { roll: 2, skill: 'electronics' },
        { roll: 3, skill: 'drive' },
        { roll: 4, skill: 'investigate' },
        { roll: 5, skill: 'recon' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
    {
      id: 'performer',
      name: 'Performer',
      description:
        'A stage, screen, athletic, musical, or acrobatic professional in the public eye.',
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
      { roll: 3, skill: '+1 SOC' },
      { roll: 4, skill: 'language' },
      { roll: 5, skill: 'carouse' },
      { roll: 6, skill: 'jackofalltrades' },
    ],
    service: [
      { roll: 1, skill: 'art' },
      { roll: 2, skill: 'carouse' },
      { roll: 3, skill: 'deception' },
      { roll: 4, skill: 'drive' },
      { roll: 5, skill: 'persuade' },
      { roll: 6, skill: 'steward' },
    ],
    advanced: [
      { roll: 1, skill: 'advocate' },
      { roll: 2, skill: 'broker' },
      { roll: 3, skill: 'deception' },
      { roll: 4, skill: 'science' },
      { roll: 5, skill: 'streetwise' },
      { roll: 6, skill: 'diplomat' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Artist: —' },
    { rank: 1, title: 'Artist: —', skill: 'art', skillLevel: 1 },
    { rank: 2, title: 'Artist: —' },
    { rank: 3, title: 'Artist: —', skill: 'investigate', skillLevel: 1 },
    { rank: 4, title: 'Artist: —' },
    { rank: 5, title: 'Artist: Famous Artist', benefit: '+1 SOC' },
    { rank: 6, title: 'Artist: —' },
    { rank: 0, title: 'Journalist: —' },
    { rank: 1, title: 'Journalist: Freelancer', skill: 'electronics', skillLevel: 1 },
    { rank: 2, title: 'Journalist: Staff Writer', skill: 'investigate', skillLevel: 1 },
    { rank: 3, title: 'Journalist: —' },
    { rank: 4, title: 'Journalist: Correspondent', skill: 'persuade', skillLevel: 1 },
    { rank: 5, title: 'Journalist: —' },
    { rank: 6, title: 'Journalist: Senior Correspondent', benefit: '+1 SOC' },
    { rank: 0, title: 'Performer: —' },
    { rank: 1, title: 'Performer: —', benefit: '+1 DEX' },
    { rank: 2, title: 'Performer: —' },
    { rank: 3, title: 'Performer: —', benefit: '+1 STR' },
    { rank: 4, title: 'Performer: —' },
    { rank: 5, title: 'Performer: Famous Performer', benefit: '+1 SOC' },
    { rank: 6, title: 'Performer: —' },
  ],

  cashBenefits: [0, 0, 10000, 10000, 40000, 40000, 80000],

  benefitTable: [
    { roll: 1, benefit: 'Contact' },
    { roll: 2, benefit: '+1 SOC' },
    { roll: 3, benefit: 'Contact' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: '+1 INT' },
    { roll: 6, benefit: 'Two Ship Shares' },
    { roll: 7, benefit: '+1 SOC and +1 EDU' },
  ],

  events: [
    {
      roll: 2,
      description:
        "A crisis interrupts your career; roll on this career's Mishap table, but you remain in the career.",
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'A provocative show, story, or appearance puts your reputation at risk.',
      effects: [
        {
          type: 'special',
          target: 'roll',
          value: 'Art or Investigate 8+: success +1 SOC, failure -1 SOC',
        },
      ],
    },
    {
      roll: 4,
      description: "You move among your world's famous and influential circles.",
      effects: [{ type: 'skill', target: 'carouse|persuade|steward', value: 1 }],
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'celebrity_contact' },
      ],
    },
    {
      roll: 5,
      description: 'A creation or performance catches widespread attention.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'A wealthy supporter or sponsor backs your career.',
      effects: [{ type: 'benefit', target: 'advancement_dm', value: 2 }],
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'arts_patron' }],
    },
    {
      roll: 7,
      description: 'A personal turning point occurs; roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You can publicly challenge a corrupt or dubious local leader.',
      choices: [
        {
          id: 'support-leader',
          description: 'Decline the confrontation.',
          effects: [],
        },
        {
          id: 'challenge-leader',
          description: 'Oppose the leader and risk retaliation.',
          effects: [
            { type: 'special', target: 'enemy', value: 'gain' },
            {
              type: 'special',
              target: 'roll',
              value:
                'Art or Persuade 8+: success increase a known skill by one level, failure increase a skill and roll Mishap',
            },
          ],
        },
      ],
    },
    {
      roll: 9,
      description: 'A sector-wide tour brings you into contact with many people.',
      effects: [{ type: 'special', target: 'contacts', value: 'D3' }],
    },
    {
      roll: 10,
      description: 'The theft of your work draws you toward criminals and investigators.',
      effects: [{ type: 'skill', target: 'streetwise|investigate|recon|stealth', value: 1 }],
    },
    {
      roll: 11,
      description: 'Your unusual lifestyle triggers a strange incident.',
      effects: [{ type: 'special', target: 'life_event', value: 'unusual_event' }],
    },
    {
      roll: 12,
      description: 'You receive a major award and your career advances immediately.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  flavorTemplates: {
    '3': [
      'A performance, broadcast, or exposé cuts too close to power, turning applause into scrutiny.',
    ],
    '5': [
      'One piece of work catches the public mood, and suddenly venues, feeds, and patrons repeat your name.',
    ],
    '9': [
      'The tour circuit carries you through crowded ports and private rooms, leaving a trail of new faces and obligations.',
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
      description: 'A scandal catches you up and damages your career.',
      injury: false,
      forced: true,
    },
    {
      roll: 3,
      description: 'The public turns against you.',
      injury: false,
      forced: true,
      effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
    },
    {
      roll: 4,
      description: 'A trusted peer betrays you and becomes a lasting problem.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'betraying_peer' }],
    },
    {
      roll: 5,
      description: 'A tour, assignment, or project fails badly and leaves you far from support.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'survival|pilot|persuade|streetwise', value: 1 }],
    },
    {
      roll: 6,
      description:
        'Suppression, outrage, or controversy pushes you out; what truth was too dangerous?',
      injury: false,
      forced: true,
      effects: [{ type: 'benefit', target: 'next_qualification_dm', value: 2 }],
    },
  ],
};
