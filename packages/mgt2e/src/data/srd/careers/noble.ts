import type { CareerDefinition } from '../../../types/career.js';

export const NOBLE_CAREER: CareerDefinition = {
  id: 'noble',
  name: 'Noble',
  description:
    'High-status figures who govern, represent states, or simply move through society on inherited privilege.',

  qualification: {
    characteristic: 'SOC',
    target: 10,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'administrator',
      name: 'Administrator',
      description: 'A government functionary, domain ruler, or manager of public power.',
      survival: { characteristic: 'INT', target: 4 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'admin' },
        { roll: 2, skill: 'advocate' },
        { roll: 3, skill: 'broker' },
        { roll: 4, skill: 'diplomat' },
        { roll: 5, skill: 'leadership' },
        { roll: 6, skill: 'persuade' },
      ],
    },
    {
      id: 'diplomat',
      name: 'Diplomat',
      description: 'An envoy, official representative, or political intermediary.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'SOC', target: 7 },
      skillTable: [
        { roll: 1, skill: 'advocate' },
        { roll: 2, skill: 'carouse' },
        { roll: 3, skill: 'electronics' },
        { roll: 4, skill: 'steward' },
        { roll: 5, skill: 'diplomat' },
        { roll: 6, skill: 'deception' },
      ],
    },
    {
      id: 'dilettante',
      name: 'Dilettante',
      description: 'A social fixture whose fame comes from status rather than productive work.',
      survival: { characteristic: 'SOC', target: 5 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'carouse' },
        { roll: 2, skill: 'deception' },
        { roll: 3, skill: 'flyer' },
        { roll: 4, skill: 'streetwise' },
        { roll: 5, skill: 'gambler' },
        { roll: 6, skill: 'jackofalltrades' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'guncombat' },
      { roll: 6, skill: 'melee' },
    ],
    service: [
      { roll: 1, skill: 'admin' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'electronics' },
      { roll: 4, skill: 'diplomat' },
      { roll: 5, skill: 'investigate' },
      { roll: 6, skill: 'persuade' },
    ],
    advanced: [
      { roll: 1, skill: 'science' },
      { roll: 2, skill: 'advocate' },
      { roll: 3, skill: 'language' },
      { roll: 4, skill: 'leadership' },
      { roll: 5, skill: 'diplomat' },
      { roll: 6, skill: 'art' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Administrator: Assistant' },
    { rank: 1, title: 'Administrator: Clerk / Knight', skill: 'admin', skillLevel: 1 },
    { rank: 2, title: 'Administrator: Supervisor / Baronet' },
    { rank: 3, title: 'Administrator: Manager / Baron', skill: 'advocate', skillLevel: 1 },
    { rank: 4, title: 'Administrator: Chief / Marquis' },
    { rank: 5, title: 'Administrator: Director / Count', skill: 'leadership', skillLevel: 1 },
    { rank: 6, title: 'Administrator: Minister / Duke' },
    { rank: 0, title: 'Diplomat: Intern' },
    { rank: 1, title: 'Diplomat: 3rd Secretary / Knight', skill: 'admin', skillLevel: 1 },
    { rank: 2, title: 'Diplomat: 2nd Secretary / Baronet' },
    { rank: 3, title: 'Diplomat: 1st Secretary / Baron', skill: 'advocate', skillLevel: 1 },
    { rank: 4, title: 'Diplomat: Counsellor / Marquis' },
    { rank: 5, title: 'Diplomat: Minister / Count', skill: 'diplomat', skillLevel: 1 },
    { rank: 6, title: 'Diplomat: Ambassador / Duke' },
    { rank: 0, title: 'Dilettante: Wastrel' },
    { rank: 1, title: 'Dilettante: — / Knight' },
    { rank: 2, title: 'Dilettante: Ingrate / Baronet', skill: 'carouse', skillLevel: 1 },
    { rank: 3, title: 'Dilettante: — / Baron' },
    { rank: 4, title: 'Dilettante: Black Sheep / Marquis', skill: 'persuade', skillLevel: 1 },
    { rank: 5, title: 'Dilettante: — / Count' },
    { rank: 6, title: 'Dilettante: Scoundrel / Duke', skill: 'jackofalltrades', skillLevel: 1 },
  ],

  cashBenefits: [10000, 10000, 50000, 50000, 100000, 100000, 200000],

  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: 'Two Ship Shares' },
    { roll: 3, benefit: 'Blade' },
    { roll: 4, benefit: '+1 SOC' },
    { roll: 5, benefit: 'TAS Membership' },
    { roll: 6, benefit: 'Yacht' },
    { roll: 7, benefit: '+1 SOC and Yacht' },
  ],

  events: [
    {
      roll: 2,
      description:
        "A grave reversal occurs; roll on this career's Mishap table, but you are not expelled this term.",
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'A challenge to your honour or status demands a response.',
      choices: [
        {
          id: 'refuse-duel',
          description: 'Decline the duel and lose social standing.',
          effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
        },
        {
          id: 'accept-duel',
          description:
            'Fight with blades; success raises SOC, failure injures you and lowers SOC. In either case, improve a related skill.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value: 'Melee (blade) 8+: success +1 SOC, failure injury and -1 SOC',
            },
            { type: 'skill', target: 'melee|leadership|tactics|deception', value: 1 },
          ],
        },
      ],
    },
    {
      roll: 4,
      description: 'Privilege, rulership, and leisure expose you to varied pursuits.',
      effects: [{ type: 'skill', target: 'animals|art|carouse|streetwise', value: 1 }],
    },
    {
      roll: 5,
      description: 'A wealthy relative leaves you a valuable gift.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'Local politics draw you into schemes, factions, and public bargaining.',
      effects: [
        { type: 'skill', target: 'advocate|admin|diplomat|persuade', value: 1 },
        { type: 'special', target: 'rival', value: 'gain' },
      ],
    },
    {
      roll: 7,
      description: 'A personal turning point occurs; roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'A hidden aristocratic faction asks you to join its plans.',
      choices: [
        {
          id: 'reject-conspiracy',
          description: 'Turn them down and make the group your Enemy.',
          effects: [{ type: 'special', target: 'enemy', value: 'conspiracy' }],
        },
        {
          id: 'join-conspiracy',
          description: 'Take part and test whether the scheme survives.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value:
                'Deception or Persuade 8+: success gain Deception, Persuade, Tactics, or Carouse; failure roll Mishap',
            },
            {
              type: 'skill',
              target: 'deception|persuade|tactics|carouse',
              value: 1,
              condition: 'if roll succeeds',
            },
          ],
        },
      ],
    },
    {
      roll: 9,
      description: 'Your rule earns admiration, or your family funds another comfortable term.',
      effects: [
        { type: 'benefit', target: 'advancement_dm', value: 2 },
        { type: 'special', target: 'enemy', value: 'jealous_relative_or_subject' },
      ],
    },
    {
      roll: 10,
      description: 'You navigate elite society through charm and calculated influence.',
      effects: [
        { type: 'skill', target: 'carouse|diplomat|persuade|steward', value: 1 },
        { type: 'special', target: 'rival', value: 'gain' },
        { type: 'special', target: 'ally', value: 'gain' },
      ],
    },
    {
      roll: 11,
      description: 'A powerful and magnetic aristocrat becomes your close supporter.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'powerful_noble' }],
      choices: [
        {
          id: 'noble-leadership',
          description: 'Learn command from them.',
          effects: [{ type: 'skill', target: 'leadership', value: 1 }],
        },
        {
          id: 'noble-advancement',
          description: 'Benefit from their patronage.',
          effects: [{ type: 'benefit', target: 'advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description: 'Imperial attention rewards your accomplishments.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

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
      description: 'A disgrace within your family drives you from office.',
      injury: false,
      forced: true,
      effects: [{ type: 'characteristic', target: 'SOC', value: -1 }],
    },
    {
      roll: 3,
      description: 'War or disaster erupts around you; stealth or lies may keep you safe.',
      injury: false,
      forced: true,
      effects: [
        { type: 'special', target: 'roll', value: 'Stealth 8+ or Deception 8+ to avoid injury' },
      ],
    },
    {
      roll: 4,
      description: 'Political rivals take your place, but the struggle teaches you useful lessons.',
      injury: false,
      forced: true,
      effects: [{ type: 'skill', target: 'diplomat|advocate', value: 1 }],
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'political_usurper' },
      ],
    },
    {
      roll: 5,
      description: 'Someone tries to have you killed.',
      injury: false,
      forced: true,
      effects: [{ type: 'special', target: 'roll', value: 'END 8+ to avoid injury' }],
    },
    {
      roll: 6,
      description: 'You are injured.',
      injury: true,
      forced: true,
    },
  ],
};
