import type { CareerDefinition } from '../../types/career.js';

export const MARINES: CareerDefinition = {
  id: 'marines',
  name: 'Marines',
  description: 'Members of the armed fighting forces carried aboard starships, trained to fight in space and on planetary surfaces.',
  
  qualification: {
    characteristic: 'END',
    target: 6,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'support',
      name: 'Support',
      description: 'You are part of the support staff of a marine unit.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'comms' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'drive' },
        { roll: 4, skill: 'medic' },
        { roll: 5, skill: 'heavyweapons' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
    {
      id: 'star-marine',
      name: 'Star Marine',
      description: 'You are trained for boarding actions and combat in space.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'vaccsuit' },
        { roll: 2, skill: 'athletics' },
        { roll: 3, skill: 'guncombat' },
        { roll: 4, skill: 'melee' },
        { roll: 5, skill: 'electronics', specialty: 'sensors' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
    {
      id: 'ground-assault',
      name: 'Ground Assault',
      description: 'You are part of a planetary assault force.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'EDU', target: 5 },
      skillTable: [
        { roll: 1, skill: 'vaccsuit' },
        { roll: 2, skill: 'heavyweapons' },
        { roll: 3, skill: 'recon' },
        { roll: 4, skill: 'melee', specialty: 'blade' },
        { roll: 5, skill: 'tactics', specialty: 'military' },
        { roll: 6, skill: 'guncombat' },
      ],
    },
  ],
  
  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: 'gambler' },
      { roll: 5, skill: 'melee', specialty: 'unarmed' },
      { roll: 6, skill: 'melee', specialty: 'blade' },
    ],
    service: [
      { roll: 1, skill: 'athletics' },
      { roll: 2, skill: 'vaccsuit' },
      { roll: 3, skill: 'tactics' },
      { roll: 4, skill: 'heavyweapons' },
      { roll: 5, skill: 'guncombat' },
      { roll: 6, skill: 'stealth' },
    ],
    advanced: [
      { roll: 1, skill: 'medic' },
      { roll: 2, skill: 'survival' },
      { roll: 3, skill: 'explosives' },
      { roll: 4, skill: 'engineer' },
      { roll: 5, skill: 'pilot' },
      { roll: 6, skill: 'navigation' },
    ],
    officer: [
      { roll: 1, skill: 'electronics' },
      { roll: 2, skill: 'tactics' },
      { roll: 3, skill: 'admin' },
      { roll: 4, skill: 'advocate' },
      { roll: 5, skill: 'vaccsuit' },
      { roll: 6, skill: 'leadership' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Marine' },
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
    { rank: 2, title: 'Force Commander', skill: 'tactics', skillLevel: 1 },
    { rank: 3, title: 'Lieutenant Colonel' },
    { rank: 4, title: 'Colonel', skill: '+1 SOC' },
    { rank: 5, title: 'Brigadier' },
    { rank: 6, title: 'General' },
  ],
  
  cashBenefits: [2000, 5000, 10000, 10000, 20000, 30000, 40000],
  
  benefitTable: [
    { roll: 1, benefit: 'Armour' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'TAS Membership', orHighRank: '+2 Ship Shares' },
    { roll: 6, benefit: 'Armour', orHighRank: '+1 SOC' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'Trapped behind enemy lines, you have to survive on your own.',
      effects: [
        { type: 'special', target: 'roll', value: 'Stealth or Survival 8+' },
      ],
      choices: [
        {
          id: 'survive-success',
          description: 'On success, gain one of Survival, Stealth, Deception, or Streetwise',
          effects: [{ type: 'skill', target: 'survival|stealth|deception|streetwise', value: 1 }],
        },
      ],
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
      description: 'You are assigned to a black ops mission.',
      spawns: [
        { type: 'secret', required: false, template: 'black_ops_mission' },
      ],
      effects: [{ type: 'special', target: 'roll', value: 'Stealth or Gun Combat 8+' }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'You are on the front lines of a planetary assault and occupation.',
      spawns: [
        { type: 'location', required: false, template: 'war_zone' },
      ],
      choices: [
        {
          id: 'front-lines',
          description: 'Gain one of Recon, Gun Combat, Leadership, or Electronics (comms)',
          effects: [{ type: 'skill', target: 'recon|guncombat|leadership|electronics.comms', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description: 'A mission goes wrong and you are held responsible.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'accusing_officer' },
      ],
      effects: [{ type: 'special', target: 'choice', value: 'accept_blame_or_shift' }],
    },
    {
      roll: 10,
      description: 'You are assigned to protect a VIP.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'vip_contact' },
      ],
      choices: [
        {
          id: 'vip-protection',
          description: 'Gain a Contact and one of Carouse, Persuade, or Steward',
          effects: [{ type: 'skill', target: 'carouse|persuade|steward', value: 1 }],
        },
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
      description: 'A mission goes wrong and you are stranded behind enemy lines. Increase Survival or Stealth by one level.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'survival|stealth', value: 1 }],
    },
    {
      roll: 3,
      description: 'You are ordered to take part in a black ops mission that goes wrong. You may keep this secret, or it may come to light.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'black_ops_failure' },
      ],
    },
    {
      roll: 4,
      description: 'You are blamed for a failed mission. Roll SOC 8+ to stay.',
      forced: false,
      injury: false,
      effects: [{ type: 'special', target: 'check', value: 'SOC 8+' }],
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
