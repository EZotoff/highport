/**
 * Fallback Career Data
 *
 * Minimal starter content for the app to function out of the box.
 * This data provides a basic "Drifter" career as a starting point.
 *
 * For complete career data (Agent, Army, Citizen, Entertainer, Marines, Merchant,
 * Navy, Noble, Rogue, Scholar, Scout), install a full game data pack.
 *
 * See docs/game-data-format.md for the JSON import format.
 */

import type { CareerDefinition } from '../../types/career.js';

/**
 * Minimal Drifter career — starter content.
 * Descriptions are generic to avoid reproducing copyrighted text.
 */
const SRD_DRIFTER: CareerDefinition = {
  id: 'drifter',
  name: 'Drifter',
  description: 'Wanderers and vagabonds who travel between the stars, taking odd jobs.',

  qualification: {
    characteristic: 'INT',
    target: 0, // Auto-qualify
  },

  assignments: [
    {
      id: 'barbarian',
      name: 'Barbarian',
      description: 'Living on a primitive world without advanced technology.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'STR', target: 7 },
      skillTable: [
        { roll: 1, skill: 'animals' },
        { roll: 2, skill: 'carouse' },
        { roll: 3, skill: 'melee', specialty: 'blade' },
        { roll: 4, skill: 'stealth' },
        { roll: 5, skill: 'seafarer' },
        { roll: 6, skill: 'survival' },
      ],
    },
    {
      id: 'wanderer',
      name: 'Wanderer',
      description: 'A homeless traveler moving from world to world.',
      survival: { characteristic: 'END', target: 7 },
      advancement: { characteristic: 'INT', target: 7 },
      skillTable: [
        { roll: 1, skill: 'drive' },
        { roll: 2, skill: 'deception' },
        { roll: 3, skill: 'recon' },
        { roll: 4, skill: 'stealth' },
        { roll: 5, skill: 'streetwise' },
        { roll: 6, skill: 'survival' },
      ],
    },
    {
      id: 'scavenger',
      name: 'Scavenger',
      description: 'Scraping a living from salvage and scrap.',
      survival: { characteristic: 'DEX', target: 7 },
      advancement: { characteristic: 'END', target: 7 },
      skillTable: [
        { roll: 1, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'athletics' },
        { roll: 4, skill: 'guncombat' },
        { roll: 5, skill: 'recon' },
        { roll: 6, skill: 'vaccsuit' },
      ],
    },
  ],

  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 END' },
      { roll: 3, skill: '+1 DEX' },
      { roll: 4, skill: 'jackofalltrades' },
      { roll: 5, skill: '+1 END' },
      { roll: 6, skill: 'melee' },
    ],
    service: [
      { roll: 1, skill: 'athletics' },
      { roll: 2, skill: 'melee', specialty: 'unarmed' },
      { roll: 3, skill: 'recon' },
      { roll: 4, skill: 'streetwise' },
      { roll: 5, skill: 'stealth' },
      { roll: 6, skill: 'survival' },
    ],
    advanced: [
      { roll: 1, skill: 'navigation' },
      { roll: 2, skill: 'mechanic' },
      { roll: 3, skill: 'medic' },
      { roll: 4, skill: 'electronics', specialty: 'computers' },
      { roll: 5, skill: 'electronics', specialty: 'comms' },
      { roll: 6, skill: 'guncombat' },
    ],
  },

  ranks: [
    { rank: 0, title: 'Drifter' },
    { rank: 1, title: 'Drifter', skill: 'survival', skillLevel: 1 },
    { rank: 2, title: 'Drifter' },
    { rank: 3, title: 'Drifter', skill: 'streetwise', skillLevel: 1 },
    { rank: 4, title: 'Drifter' },
    { rank: 5, title: 'Drifter' },
    { rank: 6, title: 'Drifter' },
  ],

  cashBenefits: [0, 0, 1000, 2000, 3000, 4000, 8000],

  benefitTable: [
    { roll: 1, benefit: 'Contact' },
    { roll: 2, benefit: 'Weapon' },
    { roll: 3, benefit: 'Ally' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: '+1 EDU' },
    { roll: 6, benefit: 'Ship Share' },
  ],

  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You find something of value.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 4,
      description: 'You find temporary work.',
      choices: [
        {
          id: 'labour-skill',
          description: 'Gain a practical skill from the work.',
          effects: [{ type: 'skill', target: 'mechanic|drive|electronics|athletics', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You are attacked.',
      effects: [{ type: 'special', target: 'roll', value: 'Melee or Gun Combat 8+' }],
    },
    {
      roll: 6,
      description: 'You are offered a risky opportunity.',
      choices: [
        {
          id: 'scheme-accept',
          description: 'Accept the risk.',
          effects: [{ type: 'special', target: 'roll', value: '8+ for benefit' }],
        },
        {
          id: 'scheme-refuse',
          description: 'Refuse.',
          effects: [],
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
      description: 'You make a useful contact.',
      effects: [{ type: 'skill', target: 'streetwise', value: 1 }],
    },
    {
      roll: 9,
      description: 'You pick up useful skills.',
      choices: [
        {
          id: 'useful-skills',
          description: 'Gain a general skill.',
          effects: [{ type: 'skill', target: 'jackofalltrades|survival|streetwise', value: 1 }],
        },
      ],
    },
    {
      roll: 10,
      description: 'You encounter the criminal underworld.',
      effects: [{ type: 'skill', target: 'streetwise|deception', value: 1 }],
    },
    {
      roll: 11,
      description: 'You help someone important.',
      spawns: [{ type: 'npc', relationship: 'ally', required: true, template: 'grateful_ally' }],
    },
    {
      roll: 12,
      description: 'You are offered a proper job next term.',
      effects: [{ type: 'special', target: 'auto_qualify', value: 'next_term' }],
    },
  ],

  mishaps: [
    {
      roll: 1,
      description: 'Severely injured.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'You make a dangerous enemy.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'crime_lord' }],
    },
    {
      roll: 3,
      description: 'Injured.',
      forced: true,
      injury: true,
    },
    {
      roll: 4,
      description: 'You are arrested.',
      forced: false,
      injury: false,
      effects: [{ type: 'special', target: 'check', value: 'Streetwise or Advocate 8+' }],
    },
    {
      roll: 5,
      description: 'Betrayed by someone you trusted.',
      forced: true,
      injury: false,
      spawns: [{ type: 'npc', relationship: 'enemy', required: true, template: 'betrayer' }],
    },
    {
      roll: 6,
      description: 'Injured.',
      forced: true,
      injury: true,
    },
  ],
};

export const SRD_CAREERS: Record<string, CareerDefinition> = {
  drifter: SRD_DRIFTER,
};
