import type { CareerDefinition } from '../../../types/career.js';

export const NAVY_CAREER: CareerDefinition = {
  id: 'navy',
  name: 'Navy',
  description:
    'Interstellar fleet personnel who patrol trade routes, crew warships, and defend shipping from hostile powers and raiders.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'lineCrew',
      name: 'Line/Crew',
      description: 'General shipboard crew and command-track personnel aboard major naval vessels.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'guncombat' },
        { roll: 4, skill: 'flyer' },
        { roll: 5, skill: 'melee' },
        { roll: 6, skill: 'vaccsuit' },
      ],
    },
    {
      id: 'engineerGunner',
      name: 'Engineer/Gunner',
      description:
        'Specialists responsible for ship systems, repairs, weapons, and technical operations.',
      survival: { characteristic: 'INT', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'engineer' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'electronics' },
        { roll: 4, skill: 'engineer' },
        { roll: 5, skill: 'gunner' },
        { roll: 6, skill: 'flyer' },
      ],
    },
    {
      id: 'flight',
      name: 'Flight',
      description:
        'Pilots and small-craft operators flying shuttles, fighters, and other light vessels.',
      survival: { characteristic: 'DEX', target: 7 },
      advancement: { characteristic: 'EDU', target: 5 },
      skillTable: [
        { roll: 1, skill: 'pilot' },
        { roll: 2, skill: 'flyer' },
        { roll: 3, skill: 'gunner' },
        { roll: 4, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 5, skill: 'astrogation' },
        { roll: 6, skill: 'electronics' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: '+1 INT' },
      { roll: 5, skill: '+1 EDU' },
      { roll: 6, skill: '+1 SOC' },
    ],
    service: [
      { roll: 1, skill: 'pilot' },
      { roll: 2, skill: 'vaccsuit' },
      { roll: 3, skill: 'athletics' },
      { roll: 4, skill: 'gunner' },
      { roll: 5, skill: 'mechanic' },
      { roll: 6, skill: 'guncombat' },
    ],
    advanced: [
      { roll: 1, skill: 'electronics' },
      { roll: 2, skill: 'astrogation' },
      { roll: 3, skill: 'engineer' },
      { roll: 4, skill: 'flyer' },
      { roll: 5, skill: 'medic' },
      { roll: 6, skill: 'admin' },
    ],
    officer: [
      { roll: 1, skill: 'leadership' },
      { roll: 2, skill: 'electronics' },
      { roll: 3, skill: 'pilot' },
      { roll: 4, skill: 'melee', specialty: 'blade' },
      { roll: 5, skill: 'admin' },
      { roll: 6, skill: 'tactics', specialty: 'naval' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Crewman' },
    { rank: 1, title: 'Able Spacehand', skill: 'mechanic', skillLevel: 1 },
    { rank: 2, title: 'Petty Officer, 3rd class', skill: 'vaccsuit', skillLevel: 1 },
    { rank: 3, title: 'Petty Officer, 2nd class' },
    { rank: 4, title: 'Petty Officer, 1st class', benefit: '+1 END' },
    { rank: 5, title: 'Chief Petty Officer' },
    { rank: 6, title: 'Master Chief' },
  ],

  officerRanks: [
    { rank: 1, title: 'Ensign', benefit: 'Melee (blade) 1' },
    { rank: 2, title: 'Sublieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 3, title: 'Lieutenant' },
    { rank: 4, title: 'Commander', benefit: 'Tactics (naval) 1' },
    { rank: 5, title: 'Captain', benefit: 'SOC 10 or +1 SOC, whichever is higher' },
    { rank: 6, title: 'Admiral', benefit: 'SOC 12 or +1 SOC, whichever is higher' },
  ],

  cashBenefits: [1000, 5000, 5000, 10000, 20000, 50000, 50000],

  benefitTable: [
    { roll: 1, benefit: 'Personal Vehicle or Ship Share' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU or Two Ship Shares' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'TAS Membership' },
    { roll: 6, benefit: "Ship's Boat or Two Ship Shares" },
    { roll: 7, benefit: '+2 SOC' },
  ],

  events: [
    {
      roll: 2,
      description:
        'A serious incident occurs; resolve a mishap, but you are not removed from the navy.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll_no_ejection' }],
    },
    {
      roll: 3,
      description: 'A shipboard betting scene draws you in, with a chance for profit or loss.',
      choices: [
        {
          id: 'learn-table-games',
          description: 'Pick up useful habits around the tables.',
          effects: [{ type: 'skill', target: 'gambler|deception', value: 1 }],
        },
        {
          id: 'risk-wager',
          description: 'Try Gambler 8+ for an extra Benefit roll; failure costs one Benefit roll.',
          effects: [
            {
              type: 'special',
              target: 'roll',
              value: 'Gambler 8+: +1 Benefit roll; fail: -1 Benefit roll',
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      description: 'You receive an unusual shipboard responsibility that may pay off later.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 5,
      description: 'Focused instruction lets you deepen an ability you already possess.',
      effects: [
        { type: 'special', target: 'roll', value: 'EDU 8+: increase one existing skill by 1' },
      ],
    },
    {
      roll: 6,
      description:
        'Your ship is involved in an important battle, giving you practical wartime experience.',
      effects: [{ type: 'skill', target: 'electronics|engineer|gunner|pilot', value: 1 }],
    },
    {
      roll: 7,
      description: 'A private turning point occurs; resolve a Life Event.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Your vessel supports delicate negotiations or official envoys.',
      effects: [{ type: 'skill', target: 'recon|diplomat|steward', value: 1 }],
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'diplomatic_contact' },
      ],
    },
    {
      roll: 9,
      description:
        'You stop a serious crime aboard ship and make a dangerous enemy in the process.',
      effects: [{ type: 'special', target: 'next_advancement_dm', value: 2 }],
      spawns: [
        {
          type: 'npc',
          relationship: 'enemy',
          required: true,
          template: 'foiled_shipboard_criminal',
        },
      ],
    },
    {
      roll: 10,
      description:
        'Your position could be used for personal gain, but integrity has its own reward.',
      choices: [
        {
          id: 'take-profit',
          description: 'Exploit the opportunity for one extra Benefit roll from this term.',
          effects: [{ type: 'benefit', target: 'extra_benefit_roll', value: 1 }],
        },
        {
          id: 'stay-honest',
          description: 'Decline the scheme and improve your next advancement attempt.',
          effects: [{ type: 'special', target: 'next_advancement_dm', value: 2 }],
        },
      ],
    },
    {
      roll: 11,
      description: 'A superior officer becomes invested in your progress.',
      choices: [
        {
          id: 'mentor-tactics',
          description: 'Learn naval battle planning.',
          effects: [{ type: 'skill', target: 'tactics.naval', value: 1 }],
        },
        {
          id: 'mentor-advancement',
          description: 'Use their support for the next promotion roll.',
          effects: [{ type: 'special', target: 'next_advancement_dm', value: 4 }],
        },
      ],
    },
    {
      roll: 12,
      description:
        'Your actions in combat save the ship and guarantee the next promotion or commission roll.',
      effects: [
        { type: 'special', target: 'next_promotion_or_commission', value: 'automatic_pass' },
      ],
    },
  ],

  flavorTemplates: {
    '3': [
      'Off watch, the mess decks become a betting floor where reputation, credits, and judgment all sit on the table.',
    ],
    '6': [
      'The ship goes to battle stations, and drills become real work under alarms, recoil, and damage reports.',
    ],
    '9': [
      'You break open a shipboard crime before it spreads, earning command approval and someone else’s lasting hatred.',
    ],
  },

  mishaps: [
    {
      roll: 1,
      description: 'Severe action-related injuries end the term.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description:
        'Cryogenic storage goes wrong after you are placed on inactive watch, weakening your body.',
      injury: false,
      forced: false,
      effects: [{ type: 'characteristic', target: 'STR|DEX|END', value: -1 }],
    },
    {
      roll: 3,
      description:
        'A battle turns on your branch-specific expertise; failure wrecks the ship and leads to court-martial, while success earns an honourable exit.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'roll',
          value:
            '8+ using Electronics (sensors) or Gunner for Line/Crew; Mechanic or Vacc Suit for Engineer/Gunner; Pilot (small craft or spacecraft) or Tactics (naval) for Flight. Success keeps term Benefit roll; failure court-martialled and discharged.',
        },
      ],
    },
    {
      roll: 4,
      description: 'A fatal shipboard accident is laid at your feet, whether or not you caused it.',
      injury: false,
      forced: true,
      effects: [
        {
          type: 'special',
          target: 'choice',
          value:
            'if responsible, gain one free Skills and Training roll; if innocent, keep term Benefit roll and gain accusing officer as Enemy',
        },
      ],
      spawns: [
        { type: 'npc', relationship: 'enemy', required: false, template: 'accusing_officer' },
      ],
    },
    {
      roll: 5,
      description: 'An ugly dispute with another naval service member ends your time aboard.',
      injury: false,
      forced: true,
      spawns: [{ type: 'npc', relationship: 'rival', required: true, template: 'naval_rival' }],
    },
    {
      roll: 6,
      description: 'Service injuries require an injury roll.',
      injury: true,
      forced: true,
    },
  ],
};
