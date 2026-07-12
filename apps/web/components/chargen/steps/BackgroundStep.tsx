'use client';

import React, { useRef, useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import {
  createCharacter,
  rerollCharacteristics,
  swapCharacteristics,
  updateCharacter,
  createSession,
  getSession,
} from '../../../lib/chargen/state';
import { useCharacter } from '../../../lib/chargen/hooks';
import { getOrCreateUser } from '../../../lib/identity';
import { getBackgroundSkills, getCharacteristicModifier } from '@highport/mgt2e';
import type { CharacteristicCode } from '@highport/mgt2e';
import { GlassPanel, SciFiButton, SciFiInput, SciFiSelect } from '@/components/ui/scifi';
import { THEME_HEX } from '../../../lib/design-system/themeUtils';
import BentoGrid from '../BentoGrid';

interface BackgroundStepProps {
  characterId: string | null;
  onCharacterCreated: (charId: string) => void;
}

const STAT_ORDER: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function BackgroundStep({ characterId, onCharacterCreated }: BackgroundStepProps) {
  const character = useCharacter(characterId);
  const [swap1, setSwap1] = useState<CharacteristicCode>('STR');
  const [swap2, setSwap2] = useState<CharacteristicCode>('DEX');
  const creatingRef = useRef(false);

  const handleCreate = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    const user = getOrCreateUser();
    const doc = getYDoc();

    if (!getSession(doc)) {
      createSession(doc, 'default-campaign', user.userId);
    }

    const newId = createCharacter(doc, user.userId);

    localStorage.setItem(
      'highport_active_character',
      JSON.stringify({
        characterId: newId,
        name: 'Unnamed Character',
      }),
    );

    onCharacterCreated(newId);
  };

  const handleReroll = () => {
    if (!characterId) return;
    const doc = getYDoc();
    rerollCharacteristics(doc, characterId);
  };

  const handleSwap = () => {
    if (!characterId) return;
    if (swap1 === swap2) return;
    const doc = getYDoc();
    swapCharacteristics(doc, characterId, swap1, swap2);
  };

  const handleSkillToggle = (skillId: string) => {
    if (!character) return;
    const currentBgSkills = character.backgroundSkills || [];
    let newBgSkills: string[];

    if (currentBgSkills.includes(skillId)) {
      newBgSkills = currentBgSkills.filter((s) => s !== skillId);
    } else {
      if (currentBgSkills.length >= 3) return; // Limit to 3
      newBgSkills = [...currentBgSkills, skillId];
    }

    const doc = getYDoc();

    // Build cleaned skills: remove deselected level-0 background skills,
    // add newly selected ones. Term-resolution skills (level > 0) are preserved.
    const cleanedSkills: Record<string, number> = { ...character.skills };
    Object.keys(cleanedSkills).forEach((skill) => {
      if (cleanedSkills[skill] === 0 && !newBgSkills.includes(skill)) {
        delete cleanedSkills[skill];
      }
    });
    newBgSkills.forEach((skill) => {
      if (!(skill in cleanedSkills)) {
        cleanedSkills[skill] = 0;
      }
    });

    updateCharacter(doc, character.id, 'backgroundSkills', newBgSkills);
    updateCharacter(doc, character.id, 'skills', cleanedSkills);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!characterId) return;
    const doc = getYDoc();
    const newName = e.target.value;
    updateCharacter(doc, characterId, 'name', newName);

    localStorage.setItem(
      'highport_active_character',
      JSON.stringify({
        characterId,
        name: newName || 'Unnamed Character',
      }),
    );
  };

  if (!characterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <GlassPanel
          theme="cyan"
          variant="elevated"
          glint
          className="max-w-md p-6 text-center space-y-4 overflow-visible"
        >
          <h2 className="text-2xl font-bold text-heading font-display">
            Start Character Generation
          </h2>
          <p className="text-label">
            Create a new character. You'll roll for characteristics, choose a background, and embark
            on a career.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <SciFiButton
              theme="cyan"
              glow
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              Create New Character
            </SciFiButton>
          </form>
        </GlassPanel>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-8">
        <GlassPanel theme="cyan" className="p-8 text-center animate-pulse">
          <span className="text-label">Loading character...</span>
        </GlassPanel>
      </div>
    );
  }

  const bgSkills = getBackgroundSkills();
  const selectedCount = character.backgroundSkills?.length || 0;

  return (
    <div className="space-y-3 p-4">
      <SciFiInput
        value={character.name}
        onChange={handleNameChange}
        placeholder="Enter character name"
        theme="cyan"
        label="Character Name *"
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-heading font-display">Characteristics</h3>
          <SciFiButton scifiVariant="outline" theme="violet" onClick={handleReroll}>
            Re-roll All
          </SciFiButton>
        </div>

        <div className="grid grid-cols-6 gap-2 mb-3">
          {STAT_ORDER.map((stat) => {
            const val = character.characteristics[stat] || 0;
            const mod = getCharacteristicModifier(val);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const modColor = mod >= 0 ? '#22d3ee' : '#f87171';

            return (
              <div key={stat} className="text-center">
                <div className="text-[10px] font-bold text-subtle">{stat}</div>
                <div className="text-xl font-mono text-heading font-bold leading-tight">{val}</div>
                <div className="text-xs font-bold" style={{ color: modColor }}>
                  {modStr}
                </div>
              </div>
            );
          })}
        </div>

        <GlassPanel variant="subtle" className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span className="text-sm text-subtle">Swap:</span>
            <div className="w-24">
              <SciFiSelect
                value={swap1}
                onValueChange={(val) => setSwap1(val as CharacteristicCode)}
                options={STAT_ORDER.map((s) => ({ value: s, label: s }))}
                theme="cyan"
              />
            </div>
            <span className="text-subtle">⟷</span>
            <div className="w-24">
              <SciFiSelect
                value={swap2}
                onValueChange={(val) => setSwap2(val as CharacteristicCode)}
                options={STAT_ORDER.map((s) => ({ value: s, label: s }))}
                theme="cyan"
              />
            </div>
            <div className="ml-auto">
              <SciFiButton
                scifiVariant="outline"
                theme="cyan"
                onClick={handleSwap}
                disabled={swap1 === swap2}
              >
                Swap
              </SciFiButton>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div data-testid="background-skill-selector">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-heading font-display">Background Skills</h3>
          <span
            className={`text-sm font-mono ${selectedCount === 3 ? 'text-cyan-400' : 'text-subtle'}`}
          >
            Selected: {selectedCount}/3
          </span>
        </div>

        <p className="text-xs text-label mb-2">
          Choose 3 background skills. These start at Level 0.
        </p>

        <BentoGrid minWidth="100px" gap={8}>
          {bgSkills.map((skill) => {
            const isSelected = character.backgroundSkills?.includes(skill.id);
            const isDisabled = !isSelected && selectedCount >= 3;

            return (
              <label
                key={skill.id}
                className={`flex items-center gap-2 cursor-pointer select-none rounded-lg
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${!isSelected && !isDisabled ? 'hover:bg-white/5' : ''}
                  has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-zinc-900`}
                style={{
                  backgroundColor: isSelected ? `${THEME_HEX.violet}20` : undefined,
                  borderRadius: '0.5rem',
                  boxShadow: isSelected ? `0 0 10px ${THEME_HEX.violet}20` : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSkillToggle(skill.id)}
                  disabled={isDisabled}
                  className="accent-violet-500 w-4 h-4 rounded"
                />
                <span className={`text-sm ${isSelected ? 'text-violet-200' : 'text-default'}`}>
                  {skill.name}
                </span>
              </label>
            );
          })}
        </BentoGrid>
      </div>
    </div>
  );
}
