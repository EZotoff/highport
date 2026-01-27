'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Shield, Flame, Activity } from 'lucide-react';
import { getYDoc } from '../../lib/ydoc';
import {
  Faction,
  getReputationMap,
  yMapToFaction,
  getStandingColor,
} from '../../lib/reputation-state';

interface NodePanelProps {
  nodeId: string | null;
  onClose: () => void;
}

export function NodePanel({ nodeId, onClose }: NodePanelProps) {
  const [faction, setFaction] = useState<Faction | null>(null);

  useEffect(() => {
    if (!nodeId) {
      setFaction(null);
      return;
    }

    const doc = getYDoc();
    const factionsMap = getReputationMap(doc);

    const findFaction = () => {
      let found: Faction | null = null;
      // Iterate through all factions to find the one linked to this node
      // Note: In a larger app, we might want a reverse index
      for (const value of factionsMap.values()) {
        const f = yMapToFaction(value as any);
        if (f.factionNodeId === nodeId) {
          found = f;
          break;
        }
      }
      setFaction(found);
    };

    findFaction();

    const observer = () => {
      findFaction();
    };

    factionsMap.observeDeep(observer);

    return () => {
      factionsMap.unobserveDeep(observer);
    };
  }, [nodeId]);

  if (!nodeId || !faction) return null;

  return (
    <div className="absolute top-20 right-4 w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-20 animate-in slide-in-from-right-10 duration-200">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-800/50">
        <h3 className="font-bold text-zinc-100 truncate">{faction.name}</h3>
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Standing & Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span className="flex items-center gap-1"><Shield size={14} /> Standing</span>
            <span className="flex items-center gap-1"><Activity size={14} /> Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 py-1 px-2 rounded text-center font-bold text-black shadow-sm"
              style={{ backgroundColor: getStandingColor(faction.standing) }}
            >
              {faction.standing}
            </div>
            <div className="flex-1 py-1 px-2 bg-zinc-800 text-zinc-300 text-center rounded border border-zinc-700 text-sm">
              {faction.tier}
            </div>
          </div>
        </div>

        {/* Heat */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span className="flex items-center gap-1"><Flame size={14} /> Heat</span>
            <span className="text-xs">{faction.heat}/100</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-500" 
              style={{ width: `${faction.heat}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          <Link 
            href="/reputation"
            className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors text-sm"
          >
            <ExternalLink size={14} />
            View in Reputation Table
          </Link>
        </div>
      </div>
    </div>
  );
}
