'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SciFiButton, SciFiSelect, SciFiBadge } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { usePortraitGenerator } from '@/lib/portrait/usePortrait';
import { PortraitUnavailableNotice } from './PortraitUnavailableNotice';
import { cn } from '@/lib/utils';
import type {
  PortraitRecord,
  PortraitTags,
  PortraitGender,
  PortraitAgeRange,
  PortraitCareerType,
} from '@highport/shared/types/portrait';

interface PortraitRemixerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePortrait: PortraitRecord;
  campaignId: string;
  targetNodeId?: string;
  onRemixed: (newPortrait: PortraitRecord) => void;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:18122';

const GENDER_OPTIONS = [
  { value: 'none', label: 'Inherit Gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'ambiguous', label: 'Ambiguous' },
];

const AGE_OPTIONS = [
  { value: 'none', label: 'Inherit Age' },
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen' },
  { value: 'young_adult', label: 'Young Adult' },
  { value: 'adult', label: 'Adult' },
  { value: 'middle_aged', label: 'Middle Aged' },
  { value: 'elder', label: 'Elder' },
];

const CAREER_OPTIONS = [
  { value: 'none', label: 'Inherit Career' },
  { value: 'navy', label: 'Navy' },
  { value: 'marines', label: 'Marines' },
  { value: 'scout', label: 'Scout' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'army', label: 'Army' },
  { value: 'agent', label: 'Agent' },
  { value: 'noble', label: 'Noble' },
  { value: 'drifter', label: 'Drifter' },
  { value: 'scholar', label: 'Scholar' },
  { value: 'rogue', label: 'Rogue' },
  { value: 'citizen', label: 'Citizen' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'other', label: 'Other' },
];

export function PortraitRemixer({
  open,
  onOpenChange,
  sourcePortrait,
  campaignId,
  targetNodeId,
  onRemixed,
}: PortraitRemixerProps) {
  const [promptDelta, setPromptDelta] = useState('');
  const [gender, setGender] = useState<string>('none');
  const [ageRange, setAgeRange] = useState<string>('none');
  const [careerType, setCareerType] = useState<string>('none');
  const [remixedPortrait, setRemixedPortrait] = useState<PortraitRecord | null>(null);

  const { remix, isLoading, error, unavailable } = usePortraitGenerator();

  const handleRemix = async () => {
    try {
      const tagsPatch: Partial<PortraitTags> = {};

      if (gender !== 'none') {
        tagsPatch.demographics = {
          ...tagsPatch.demographics,
          gender: gender as PortraitGender,
        };
      }

      if (ageRange !== 'none') {
        tagsPatch.demographics = {
          ...tagsPatch.demographics,
          age_range: ageRange as PortraitAgeRange,
        };
      }

      if (careerType !== 'none') {
        tagsPatch.career = {
          ...tagsPatch.career,
          career_type: careerType as PortraitCareerType,
        };
      }

      const result = await remix({
        portraitId: sourcePortrait.id,
        campaignId,
        promptDelta,
        tagsPatch: Object.keys(tagsPatch).length > 0 ? tagsPatch : undefined,
        targetNodeId,
        protected: sourcePortrait.protected,
        sourcePolicy: sourcePortrait.source_policy,
      });

      setRemixedPortrait(result);
    } catch (err) {
      console.error('Remix failed:', err);
    }
  };

  const handleAccept = () => {
    if (remixedPortrait) {
      onRemixed(remixedPortrait);
      onOpenChange(false);
    }
  };

  const normalizeImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SERVER_URL}${url}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-slate-200">
        <DialogHeader>
          <DialogTitle
            style={{ color: THEME_HEX.cyan }}
            className="font-['Orbitron'] tracking-wider"
          >
            PORTRAIT REMIXER
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] mb-2 block font-bold"
                style={{ color: THEME_HEX.slate }}
              >
                Source Portrait
              </label>
              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                <img
                  src={normalizeImageUrl(sourcePortrait.image_url)}
                  alt="Source"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  {sourcePortrait.protected && (
                    <SciFiBadge theme="amber" variant="glow" size="sm">
                      PROTECTED
                    </SciFiBadge>
                  )}
                  <SciFiBadge
                    theme="slate"
                    variant="outline"
                    size="sm"
                    className="bg-black/50 backdrop-blur-sm"
                  >
                    {sourcePortrait.source_policy}
                  </SciFiBadge>
                </div>
              </div>
              <div className="mt-2 p-2 rounded bg-zinc-950/50 border border-zinc-800/50">
                <div className="text-[9px] space-y-1 font-mono uppercase opacity-50">
                  {sourcePortrait.anchor_portrait_id && (
                    <div className="flex justify-between">
                      <span>Anchor:</span>
                      <span>{sourcePortrait.anchor_portrait_id.slice(0, 12)}...</span>
                    </div>
                  )}
                  {sourcePortrait.source_portrait_id && (
                    <div className="flex justify-between">
                      <span>Lineage:</span>
                      <span>{sourcePortrait.source_portrait_id.slice(0, 12)}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-zinc-800">
              {unavailable && <PortraitUnavailableNotice />}

              <div>
                <label
                  className="text-[10px] uppercase tracking-[0.2em] mb-2 block font-bold"
                  style={{ color: THEME_HEX.cyan }}
                >
                  Prompt Delta
                </label>
                <textarea
                  className={cn(
                    'w-full h-24 bg-zinc-950 border rounded-lg p-3 text-sm',
                    'focus:outline-none focus:ring-1 transition-all duration-200 resize-none',
                  )}
                  style={
                    {
                      borderColor: THEME_HEX.cyan + '40',
                      '--tw-ring-color': THEME_HEX.cyan + '80',
                    } as React.CSSProperties
                  }
                  placeholder="Describe changes: e.g., 'add a cybernetic eye implant', 'make them 10 years older', 'dressed in formal diplomatic attire'"
                  value={promptDelta}
                  onChange={(e) => setPromptDelta(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = THEME_HEX.cyan;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = THEME_HEX.cyan + '40';
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] opacity-50 block font-bold">
                  Tag Overrides
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <SciFiSelect
                      placeholder="Gender"
                      options={GENDER_OPTIONS}
                      value={gender}
                      onValueChange={setGender}
                      theme="violet"
                    />
                    <SciFiSelect
                      placeholder="Age"
                      options={AGE_OPTIONS}
                      value={ageRange}
                      onValueChange={setAgeRange}
                      theme="violet"
                    />
                    <SciFiSelect
                      placeholder="Career"
                      options={CAREER_OPTIONS}
                      value={careerType}
                      onValueChange={setCareerType}
                      theme="violet"
                    />
                  </div>
                </div>
              </div>

              <SciFiButton
                className="w-full"
                theme="cyan"
                onClick={handleRemix}
                disabled={isLoading || !promptDelta.trim()}
              >
                {isLoading ? 'INITIATING REMIX...' : 'GENERATE REMIX'}
              </SciFiButton>
            </div>
          </div>

          <div className="flex flex-col h-full border-l border-zinc-800 pl-6">
            <label
              className="text-[10px] uppercase tracking-[0.2em] mb-2 block font-bold"
              style={{ color: THEME_HEX.emerald }}
            >
              Remix Result
            </label>
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 overflow-hidden relative">
              {remixedPortrait ? (
                <img
                  src={normalizeImageUrl(remixedPortrait.image_url)}
                  alt="Remix Result"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-zinc-600 text-sm flex flex-col items-center gap-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: THEME_HEX.cyan, borderTopColor: 'transparent' }}
                      />
                      <span
                        className="animate-pulse tracking-widest text-xs uppercase"
                        style={{ color: THEME_HEX.cyan }}
                      >
                        Synthesizing...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">
                        <span className="text-xl">✨</span>
                      </div>
                      <span className="uppercase tracking-[0.2em] text-[10px]">
                        Awaiting Instructions
                      </span>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-red-950/90 p-4 text-xs border-t"
                  style={{ borderTopColor: THEME_HEX.red + '80' }}
                >
                  <div
                    style={{ color: THEME_HEX.red }}
                    className="font-bold uppercase tracking-widest mb-1"
                  >
                    Error
                  </div>
                  <div className="text-red-200 opacity-90">{error.message}</div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 flex gap-3">
              <SciFiButton
                theme="slate"
                scifiVariant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                CANCEL
              </SciFiButton>
              <SciFiButton
                theme="emerald"
                disabled={!remixedPortrait || isLoading}
                onClick={handleAccept}
                className="flex-1"
              >
                ACCEPT REMIX
              </SciFiButton>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
