import type { CareerDefinition } from '../../types/career.js';

export const SCOUT: CareerDefinition = {
  id: 'scout',
  name: 'Scout',
  description: 'Members of the exploration branch, trained to explore new regions, survey new worlds, and make first contact.',
  
  qualification: {
    characteristic: 'INT',
    target: 5,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'courier',
      name: 'Courier',
      description: 'You are responsible for the transmission of information and messages.',
      survival: { characteristic: 'END', target: 5 },
      advancement: { characteristic: 'EDU', target: 9 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'comms' },
        { roll: 2, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 3, skill: 'flyer' },
        { roll: 4, skill: 'guncombat' },
        { roll: 5, skill: 'stealth' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
    {
      id: 'survey',
      name: 'Survey',
      description: 'You visit border worlds and survey data for the Imperium.',
      survival: { characteristic: 'END', target: 6 },
      advancement: { characteristic: 'INT', target: 8 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'sensors' },
        { roll: 2, skill: 'persuade' },
        { roll: 3, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 4, skill: 'navigation' },
        { roll: 5, skill: 'diplomat' },
        { roll: 6, skill: 'streetwise' },
      ],
    },
    {
      id: 'exploration',
      name: 'Exploration',
      description: 'You explore new worlds.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'sensors' },
        { roll: 2, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 3, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 4, skill: 'science' },
        { roll: 5, skill: 'stealth' },
        { roll: 6, skill: 'recon' },
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
      { roll: 6, skill: 'jackofalltrades' },
    ],
    service: [
      { roll: 1, skill: 'pilot' },
      { roll: 2, skill: 'survival' },
      { roll: 3, skill: 'mechanic' },
      { roll: 4, skill: 'astrogation' },
      { roll: 5, skill: 'electronics' },
      { roll: 6, skill: 'guncombat' },
    ],
    advanced: [
      { roll: 1, skill: 'medic' },
      { roll: 2, skill: 'navigation' },
      { roll: 3, skill: 'engineer' },
      { roll: 4, skill: 'electronics', specialty: 'computers' },
      { roll: 5, skill: 'science' },
      { roll: 6, skill: 'jackofalltrades' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Scout' },
    { rank: 1, title: 'Scout', skill: 'vaccsuit', skillLevel: 1 },
    { rank: 2, title: 'Scout' },
    { rank: 3, title: 'Senior Scout', skill: 'pilot', skillLevel: 1 },
    { rank: 4, title: 'Senior Scout' },
    { rank: 5, title: 'Senior Scout' },
    { rank: 6, title: 'Senior Scout' },
  ],
  
  cashBenefits: [20000, 20000, 30000, 30000, 50000, 50000, 50000],
  
  benefitTable: [
    { roll: 1, benefit: 'Ship Share' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Scout Ship' },
    { roll: 6, benefit: 'Scout Ship' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'Your ship is ambushed by enemy vessels.',
      choices: [
        {
          id: 'ambush-fight',
          description: 'Run and use Pilot or Electronics to escape',
          effects: [{ type: 'special', target: 'roll', value: 'Pilot or Electronics 8+' }],
        },
        {
          id: 'ambush-surrender',
          description: 'Surrender (captured or released)',
          effects: [{ type: 'special', target: 'outcome', value: 'captured' }],
        },
      ],
    },
    {
      roll: 4,
      description: 'You survey an alien world.',
      spawns: [
        { type: 'location', required: true, template: 'alien_world' },
      ],
      choices: [
        {
          id: 'survey-skill',
          description: 'Gain one of Animals, Survival, Recon, or Science',
          effects: [{ type: 'skill', target: 'animals|survival|recon|science', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You perform an exemplary service for the Scout Service.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 6,
      description: 'You spend several years on a world with a high indigenous population.',
      spawns: [
        { type: 'location', required: false, template: 'indigenous_world' },
        { type: 'npc', relationship: 'contact', required: false, template: 'indigenous_contact' },
      ],
      choices: [
        {
          id: 'indigenous-skill',
          description: 'Gain one of Diplomat, Carouse, Survival, or Language',
          effects: [{ type: 'skill', target: 'diplomat|carouse|survival|language', value: 1 }],
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
      description: 'When dealing with an alien race, you make a mistake that creates a Loss of trust.',
      spawns: [
        { type: 'npc', relationship: 'rival', required: false, template: 'alien_rival' },
      ],
      effects: [{ type: 'skill', target: 'diplomat', value: 1 }],
    },
    {
      roll: 9,
      description: 'You have the opportunity to give freely of your time and resources.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: false, template: 'grateful_contact' },
      ],
      effects: [
        { type: 'special', target: 'choice', value: 'sacrifice_benefit_for_ally' },
      ],
    },
    {
      roll: 10,
      description: 'You befriend a useful contact in a foreign culture.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: true, template: 'foreign_contact' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 11,
      description: 'You uncover something unknown and significant.',
      spawns: [
        { type: 'secret', required: true, template: 'major_discovery' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+4' }],
    },
    {
      roll: 12,
      description: 'You are automatically promoted.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
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
      description: 'Psychologically damaged by your time in the scouts.',
      forced: true,
      injury: false,
      effects: [{ type: 'special', target: 'trauma', value: 'psychological' }],
    },
    {
      roll: 3,
      description: 'Your scout ship is ambushed. Choose: fight or run.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'pilot|guncombat', value: 1 }],
    },
    {
      roll: 4,
      description: 'You have no idea what happened to you – Loss of memory.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'secret', required: true, template: 'lost_memory' },
      ],
    },
    {
      roll: 5,
      description: 'You are attacked by natives and driven off-world.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: false, template: 'hostile_natives' },
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
