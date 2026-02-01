import type { CareerDefinition } from '../../types/career.js';

export const ARMY: CareerDefinition = {
  id: 'army',
  name: 'Army',
  description: 'Members of a planetary armed fighting force trained to fight on the ground.',
  
  qualification: {
    characteristic: 'END',
    target: 5,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'support',
      name: 'Support',
      description: 'You are a quartermaster, engineer, or other support role.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'mechanic' },
        { roll: 2, skill: 'drive' },
        { roll: 3, skill: 'flyer' },
        { roll: 4, skill: 'explosives' },
        { roll: 5, skill: 'electronics', specialty: 'comms' },
        { roll: 6, skill: 'medic' },
      ],
    },
    {
      id: 'infantry',
      name: 'Infantry',
      description: 'You are a grunt, a member of the foot-slogging infantry.',
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
      description: 'You are a vehicle crewman or tanker.',
      survival: { characteristic: 'INT', target: 7 },
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
      { roll: 1, skill: 'drive' },
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
    { rank: 0, title: 'Private' },
    { rank: 1, title: 'Lance Corporal', skill: 'guncombat', skillLevel: 1 },
    { rank: 2, title: 'Corporal' },
    { rank: 3, title: 'Lance Sergeant', skill: 'leadership', skillLevel: 1 },
    { rank: 4, title: 'Sergeant' },
    { rank: 5, title: 'Gunnery Sergeant', skill: '+1 END' },
    { rank: 6, title: 'Sergeant Major' },
  ],
  
  officerRanks: [
    { rank: 0, title: 'Lieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 1, title: 'Captain' },
    { rank: 2, title: 'Major', skill: 'tactics', skillLevel: 1 },
    { rank: 3, title: 'Lieutenant Colonel' },
    { rank: 4, title: 'Colonel' },
    { rank: 5, title: 'General', skill: '+1 SOC' },
    { rank: 6, title: 'Commander-in-Chief' },
  ],
  
  cashBenefits: [2000, 5000, 10000, 10000, 20000, 30000, 40000],
  
  benefitTable: [
    { roll: 1, benefit: 'Combat Implant' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Armour' },
    { roll: 6, benefit: '+1 END', orHighRank: '+1 SOC' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are assigned to a peacekeeping role.',
      choices: [
        {
          id: 'peacekeeping',
          description: 'Gain one of Admin, Investigate, Deception, or Recon',
          effects: [{ type: 'skill', target: 'admin|investigate|deception|recon', value: 1 }],
        },
      ],
    },
    {
      roll: 4,
      description: 'You are assigned to a hostile environment.',
      choices: [
        {
          id: 'hostile-env',
          description: 'Gain one of Vacc Suit, Engineer, Animals (riding), or Recon',
          effects: [{ type: 'skill', target: 'vaccsuit|engineer|animals.riding|recon', value: 1 }],
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
      description: 'You are thrown into a brutal ground war.',
      spawns: [
        { type: 'location', required: false, template: 'ground_war' },
      ],
      effects: [
        { type: 'special', target: 'roll', value: 'END 8+ or suffer injury' },
      ],
      choices: [
        {
          id: 'ground-war-skill',
          description: 'Gain one of Gun Combat, Leadership, or Tactics (military)',
          effects: [{ type: 'skill', target: 'guncombat|leadership|tactics.military', value: 1 }],
        },
      ],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You are given a special assignment.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'special_ops_contact' },
      ],
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 9,
      description: 'You are on the front lines of a planetary assault and occupation.',
      spawns: [
        { type: 'location', required: false, template: 'occupation_zone' },
      ],
      choices: [
        {
          id: 'occupation',
          description: 'Gain one of Gun Combat, Recon, Leadership, or Electronics (comms)',
          effects: [{ type: 'skill', target: 'guncombat|recon|leadership|electronics.comms', value: 1 }],
        },
      ],
    },
    {
      roll: 10,
      description: 'You are given a command of men and/or vehicles.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: false, template: 'loyal_subordinate' },
      ],
      effects: [
        { type: 'special', target: 'advancement', value: 'dm+2' },
      ],
    },
    {
      roll: 11,
      description: 'Your commanding officer takes an interest in your career.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'mentor_officer' },
      ],
      effects: [
        { type: 'special', target: 'advancement', value: 'dm+4' },
      ],
    },
    {
      roll: 12,
      description: 'You display heroism in battle.',
      effects: [
        { type: 'special', target: 'promotion', value: 'automatic' },
        { type: 'special', target: 'commission', value: 'if_not_officer' },
      ],
    },
  ],
  
  mishaps: [
    {
      roll: 1,
      description: 'Severely injured in action. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'Your unit is slaughtered in a disastrous battle, where you are the only survivor.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'sole_survivor' },
      ],
      effects: [{ type: 'special', target: 'trauma', value: 'survivor_guilt' }],
    },
    {
      roll: 3,
      description: 'You are sent to a hostile world.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'survival|recon', value: 1 }],
    },
    {
      roll: 4,
      description: 'You discover that your commanding officer is engaged in illegal activity.',
      forced: false,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'rival', required: true, template: 'corrupt_officer' },
        { type: 'secret', required: true, template: 'officer_corruption' },
      ],
    },
    {
      roll: 5,
      description: 'You are tormented by a senior officer or NCO.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'cruel_officer' },
      ],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
