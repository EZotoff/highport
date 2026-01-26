import { NodeType } from '@planeshift/shared';
import { 
  User, Users, Rocket, Globe, Flag, MapPin, 
  Calendar, Lightbulb, Grid3x3, Puzzle 
} from 'lucide-react';
import React from 'react';

export interface NodeConfig {
  borderColor: string;
  iconBg: string;
  icon: React.ElementType;
}

export const NODE_CONFIG: Record<string, NodeConfig> = {
  traveller: { borderColor: 'border-blue-500', iconBg: 'bg-blue-100 text-blue-600', icon: User },
  npc: { borderColor: 'border-green-500', iconBg: 'bg-green-100 text-green-600', icon: Users },
  spacecraft: { borderColor: 'border-purple-500', iconBg: 'bg-purple-100 text-purple-600', icon: Rocket },
  world: { borderColor: 'border-amber-500', iconBg: 'bg-amber-100 text-amber-600', icon: Globe },
  faction: { borderColor: 'border-red-500', iconBg: 'bg-red-100 text-red-600', icon: Flag },
  location: { borderColor: 'border-teal-500', iconBg: 'bg-teal-100 text-teal-600', icon: MapPin },
  event: { borderColor: 'border-orange-500', iconBg: 'bg-orange-100 text-orange-600', icon: Calendar },
  clue: { borderColor: 'border-yellow-500', iconBg: 'bg-yellow-100 text-yellow-600', icon: Lightbulb },
  sector: { borderColor: 'border-slate-500', iconBg: 'bg-slate-100 text-slate-600', icon: Grid3x3 },
  custom: { borderColor: 'border-gray-500', iconBg: 'bg-gray-100 text-gray-600', icon: Puzzle },
};

export const getNodeConfig = (type: string | undefined): NodeConfig => {
  if (!type) return NODE_CONFIG.custom;
  const baseType = type.startsWith('custom:') ? 'custom' : type;
  return NODE_CONFIG[baseType] || NODE_CONFIG.custom;
};
