'use client';

import React from 'react';
import { useCharacter } from '../../../lib/chargen/hooks';
import { GlassPanel } from '@/components/ui/scifi';
import { Coins, Gift, UserCheck, Users, UserX, Skull } from 'lucide-react';

interface BenefitsStepProps {
  characterId: string | null;
}

const RELATIONSHIP_ICONS: Record<string, React.ReactNode> = {
  ally: <UserCheck className="w-5 h-5 text-emerald-400" />,
  contact: <Users className="w-5 h-5 text-cyan-400" />,
  rival: <UserX className="w-5 h-5 text-amber-400" />,
  enemy: <Skull className="w-5 h-5 text-red-400" />,
};

export default function BenefitsStep({ characterId }: BenefitsStepProps) {
  const character = useCharacter(characterId);

  if (!character) {
    return (
      <GlassPanel theme="cyan" className="p-6 text-center">
        <span className="text-subtle">Loading character...</span>
      </GlassPanel>
    );
  }

  const connections = character.terms.flatMap((term, termIndex) =>
    (term.spawnedEntities || []).map((e) => ({
      ...e,
      termNumber: termIndex + 1,
    })),
  );

  return (
    <div className="space-y-6">
      <GlassPanel theme="violet" variant="bordered" className="p-6">
        <h2 className="text-xl font-display font-bold text-heading mb-4">Mustering Out Benefits</h2>

        <p className="text-label mb-6">
          These are the benefits your character received upon leaving their career.
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-display text-heading mb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Credits
          </h3>
          <div className="bg-deep-void/60 rounded-lg p-4 border border-amber-500/20">
            <span className="text-2xl font-mono font-bold text-amber-400">
              Cr{character.credits.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-display text-heading mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-cyan-400" />
            Material Benefits
          </h3>
          {character.benefits && character.benefits.length > 0 ? (
            <div className="space-y-2">
              {character.benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="bg-deep-void/60 rounded-lg p-3 border border-cyan-500/20 flex items-center gap-3"
                >
                  <Gift className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-heading">{benefit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-subtle italic">No material benefits received</p>
          )}
        </div>

        {connections.length > 0 && (
          <div>
            <h3 className="text-lg font-display text-heading mb-3">Connections</h3>
            <div className="space-y-2">
              {connections.map((conn, i) => (
                <div
                  key={i}
                  className="bg-deep-void/60 rounded-lg p-3 border border-slate-500/20 flex items-center gap-3"
                >
                  {RELATIONSHIP_ICONS[conn.relationship || ''] || (
                    <Users className="w-5 h-5 text-subtle" />
                  )}
                  <div>
                    <span className="text-heading font-medium">{conn.name}</span>
                    <span className="text-subtle text-sm ml-2">
                      ({conn.relationship || 'connection'}, Term {conn.termNumber})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
