'use client';

import React from 'react';
import { useCharacter } from '../../../lib/chargen/hooks';
import { GlassPanel, SkillBadge } from '@/components/ui/scifi';

interface SkillsStepProps {
  characterId: string | null;
}

export default function SkillsStep({ characterId }: SkillsStepProps) {
  const character = useCharacter(characterId);

  if (!character) {
    return (
      <GlassPanel theme="cyan" className="p-6 text-center">
        <span className="text-subtle">Loading character...</span>
      </GlassPanel>
    );
  }

  const skillEntries = Object.entries(character.skills || {});
  const trainedSkills = skillEntries.filter(([_, level]) => (level as number) > 0);
  const level0Skills = skillEntries.filter(([_, level]) => (level as number) === 0);

  return (
    <div className="space-y-6">
      <GlassPanel theme="violet" variant="bordered" className="p-6">
        <h2 className="text-xl font-display font-bold text-heading mb-4">Skills Summary</h2>
        
        <p className="text-label mb-6">
          These are the skills your character has acquired through their background and career terms.
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-display text-heading mb-3">
            Trained Skills
            <span className="text-subtle text-sm ml-2">({trainedSkills.length})</span>
          </h3>
          {trainedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trainedSkills.map(([skill, level]) => (
                <SkillBadge key={skill} skill={skill} level={level as number} theme="emerald" />
              ))}
            </div>
          ) : (
            <p className="text-subtle italic">No trained skills yet</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-display text-heading mb-3">
            Basic Familiarity
            <span className="text-subtle text-sm ml-2">(Level 0)</span>
          </h3>
          {level0Skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {level0Skills.map(([skill]) => (
                <SkillBadge key={skill} skill={skill} level={0} theme="slate" />
              ))}
            </div>
          ) : (
            <p className="text-subtle italic">No level 0 skills</p>
          )}
        </div>
      </GlassPanel>

      <GlassPanel theme="cyan" variant="default" className="p-4">
        <p className="text-sm text-label">
          <span className="text-cyan-400 font-semibold">Note:</span> Skills at Level 0 indicate basic familiarity. 
          Trained skills (Level 1+) represent professional competence.
        </p>
      </GlassPanel>
    </div>
  );
}
