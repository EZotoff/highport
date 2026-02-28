import type { CareerDefinition } from '../../types/career.js';

export const NAVY: CareerDefinition = {
  id: 'navy',
  name: 'Navy',
  description: 'Members of the interstellar navy which patrols space between the stars.',

  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },

  assignments: [
    {
      id: 'line-crew',
      name: 'Line/Crew',
      description: 'You serve as a general crewman or junior officer on a starship.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'comms' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'guncombat', specialty: 'slug' },
        { roll: 4, skill: 'flyer' },
        { roll: 5, skill: 'melee', specialty: 'blade' },
        { roll: 6, skill: 'vaccsuit' },
      ],
    },
    {
      id: 'engineering-gunnery',
      name: 'Engineering/Gunnery',
      description: 'You serve as a gunner or engineer on a starship.',
      survival: { characteristic: 'INT', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'engineer', specialty: 'power' },
        { roll: 2, skill: 'engineer', specialty: 'mDrive' },
        { roll: 3, skill: 'engineer', specialty: 'jDrive' },
        { roll: 4, skill: 'gunner', specialty: 'turret' },
        { roll: 5, skill: 'gunner', specialty: 'ortillery' },
        { roll: 6, skill: 'gunner', specialty: 'capital' },
      ],
    },
    {
      id: 'flight',
      name: 'Flight',
      description: 'You are a pilot of a shuttle or fighter.',
      survival: { characteristic: 'DEX', target: 7 },
      advancement: { characteristic: 'EDU', target: 5 },
      skillTable: [
        { roll: 1, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 2, skill: 'flyer' },
        { roll: 3, skill: 'gunner' },
        { roll: 4, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 5, skill: 'electronics', specialty: 'sensors' },
        { roll: 6, skill: 'astrogation' },
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
      { roll: 4, skill: 'drive' },
      { roll: 5, skill: 'navigation' },
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
    { rank: 4, title: 'Petty Officer, 1st class', skill: '+1 END' },
    { rank: 5, title: 'Chief Petty Officer' },
    { rank: 6, title: 'Master Chief' },
  ],

  officerRanks: [
    { rank: 0, title: 'Ensign', skill: 'melee', skillLevel: 1 },
    { rank: 1, title: 'Sublieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 2, title: 'Lieutenant' },
    { rank: 3, title: 'Commander', skill: 'tactics', skillLevel: 1 },
    { rank: 4, title: 'Captain' },
    { rank: 5, title: 'Admiral', skill: '+1 SOC' },
    { rank: 6, title: 'Fleet Admiral' },
  ],

  cashBenefits: [1000, 5000, 10000, 10000, 20000, 50000, 50000],

  benefitTable: [
    { roll: 1, benefit: 'Personal Vehicle' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU', orHighRank: 'TAS Membership' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Ship Share', orHighRank: '+2 Ship Shares' },
    { roll: 6, benefit: '+1 SOC', orHighRank: 'Yacht' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are given a special assignment. Gain DM+1 to any one Benefit roll.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 4,
      description: 'You are assigned to an assault on an enemy fortress.',
      choices: [
        {
          id: 'assault-join',
          description: 'Join the assault',
          effects: [
            { type: 'special', target: 'roll', value: 'Gun Combat or Melee 8+' },
            { type: 'skill', target: 'tactics', value: 1, condition: 'success' },
          ],
        },
        {
          id: 'assault-support',
          description: 'Provide support',
          effects: [{ type: 'skill', target: 'engineer', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You are given advanced training in a specialist field.',
      effects: [{ type: 'special', target: 'training', value: 'EDU 8+ for skill' }],
    },
    {
      roll: 6,
      description: 'Your vessel participates in a notable military engagement.',
      spawns: [{ type: 'location', required: false, template: 'battle_location' }],
      effects: [{ type: 'special', target: 'roll', value: 'Pilot/Gunner/Engineer' }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Your vessel participates in a diplomatic mission.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'diplomat_contact' },
      ],
      choices: [
        {
          id: 'diplomacy',
          description: 'Gain Diplomat or Carouse',
          effects: [{ type: 'skill', target: 'diplomat|carouse', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description: 'You foil an attempted crime on board, such as mutiny, sabotage, or conspiracy.',
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'criminal_enemy' }],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 10,
      description: 'You are befriended by a senior officer.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'senior_officer_ally' },
      ],
      choices: [
        {
          id: 'mentor-skill',
          description: 'Gain one of Tactics (naval) or Admin',
          effects: [{ type: 'skill', target: 'tactics.naval|admin', value: 1 }],
        },
      ],
    },
    {
      roll: 11,
      description: 'You display heroism in battle, saving the whole ship.',
      effects: [
        { type: 'special', target: 'promotion', value: 'automatic' },
        { type: 'special', target: 'commission', value: 'if_not_officer' },
      ],
    },
    {
      roll: 12,
      description: 'You gain a commission or are automatically promoted.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description:
        'Severely injured in action. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description:
        'Placed in the frozen watch and revived when your ship arrives in-system. Loss of one term.',
      forced: true,
      injury: false,
    },
    {
      roll: 3,
      description: 'During a battle, defeat or loss. Gain one of Pilot, Tactics, or Leadership.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'pilot|tactics|leadership', value: 1 }],
    },
    {
      roll: 4,
      description: 'Blamed for an accident. Roll SOC 8+ to stay.',
      forced: false,
      injury: false,
      effects: [{ type: 'special', target: 'check', value: 'SOC 8+' }],
    },
    {
      roll: 5,
      description: 'You are tormented by a cruel officer, who drives you out.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'cruel_officer' }],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
