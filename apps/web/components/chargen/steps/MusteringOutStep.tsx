'use client';

import { useState } from 'react';
import type { MusteringState, MusteringRoll } from '../../../lib/chargen/types';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { getCharacter, updateCharacterFields } from '../../../lib/chargen/state';
import { getCareer } from '@highport/mgt2e';
import { SciFiButton } from '@/components/ui/scifi';
import { Coins, Gift } from 'lucide-react';
import { MusteringBenefitChoice, MusteringBenefitLedger } from './MusteringBenefits';
import {
  calculateTotalBenefitRolls,
  applyMusteringBenefit,
  parseBenefitChoice,
  resolveBenefitChoice,
  rollBenefit,
  isHighRank,
  getGamblingBonus,
  getMusteringCareer,
  MAX_CASH_ROLLS,
} from '../../../lib/chargen/mustering';
import type { BenefitRollResult } from '../../../lib/chargen/mustering';

interface MusteringOutStepProps {
  characterId: string | null;
}

export default function MusteringOutStep({ characterId }: MusteringOutStepProps) {
  const character = useCharacter(characterId);
  const [lastRollResult, setLastRollResult] = useState<BenefitRollResult | null>(null);
  const [showRollResult, setShowRollResult] = useState(false);

  if (!character) return <div className="text-subtle">Loading...</div>;

  const totalRolls = calculateTotalBenefitRolls(character);
  const mustering = character.mustering;
  const cashRollsUsed = mustering?.cashRollsUsed ?? 0;
  const rollsUsed = mustering?.rollsUsed ?? 0;
  const rollsRemaining = totalRolls - rollsUsed;

  const finalTerm = character.terms[character.terms.length - 1];
  const allocation = getMusteringCareer(character);
  const career = getCareer(allocation?.careerId ?? finalTerm?.careerId ?? '');
  const highRank = isHighRank(character);
  const gamblingBonus = getGamblingBonus(character);

  // Calculate totals for display
  const totalCredits = character.credits;
  const shipShares = mustering?.shipShares ?? 0;
  const pending = mustering?.pendingBenefit;
  const pendingChoice = pending ? parseBenefitChoice(pending.source) : null;
  const receivedBenefits = mustering?.rollHistory ?? [];

  const handleChoice = (benefit: string) => {
    const doc = getYDoc();
    const latest = getCharacter(doc, character.id);
    if (
      !latest?.mustering?.pendingBenefit ||
      latest.mustering.pendingBenefit.source !== pending?.source ||
      !pendingChoice?.alternatives.some((alternative) => alternative.label === benefit)
    )
      return;
    updateCharacterFields(doc, character.id, applyMusteringBenefit(latest, benefit));
  };

  const handleRoll = (type: 'cash' | 'benefit') => {
    if (rollsRemaining <= 0 || pending) return;
    if (type === 'cash' && cashRollsUsed >= MAX_CASH_ROLLS) return;

    const latest = getCharacter(getYDoc(), character.id);
    if (!latest || (type === 'cash' && (latest.mustering?.cashRollsUsed ?? 0) >= MAX_CASH_ROLLS))
      return;
    const result = rollBenefit(latest, type);

    const currentMustering: MusteringState = character.mustering ?? {
      totalRolls: calculateTotalBenefitRolls(character),
      rollsUsed: 0,
      cashRollsUsed: 0,
      benefits: [],
      credits: 0,
      shipShares: 0,
    };

    const newMustering: MusteringState = {
      ...currentMustering,
      rollsUsed: currentMustering.rollsUsed + 1,
      cashRollsUsed:
        type === 'cash' ? currentMustering.cashRollsUsed + 1 : currentMustering.cashRollsUsed,
    };
    const source = String(result.result);
    const choice = parseBenefitChoice(source);
    // 'and' grants apply every part with no choice: reuse the first alternative as a
    // sentinel so the full source flows into applyMusteringBenefit.
    const selected =
      choice.mode === 'and'
        ? { ...choice.alternatives[0], label: source }
        : resolveBenefitChoice(character, choice);
    if (type === 'benefit' && !selected) {
      updateCharacterFields(getYDoc(), character.id, {
        mustering: { ...newMustering, pendingBenefit: { source, roll: result.roll.total } },
      });
      return;
    }
    const resultVal = type === 'benefit' ? (selected?.label ?? source) : Number(result.result);
    const newBenefit: MusteringRoll = {
      rollNumber: currentMustering.rollsUsed + 1,
      type,
      roll: result.roll.total,
      result: resultVal,
    };

    setLastRollResult({ ...result, result: resultVal });
    setShowRollResult(true);

    const doc = getYDoc();
    if (type === 'cash') {
      updateCharacterFields(doc, character.id, {
        mustering: {
          ...newMustering,
          credits: currentMustering.credits + Number(resultVal),
          rollHistory: [...(currentMustering.rollHistory ?? []), newBenefit],
        },
        credits: character.credits + Number(resultVal),
      });
    } else {
      updateCharacterFields(
        doc,
        character.id,
        applyMusteringBenefit(
          { ...character, mustering: newMustering },
          String(resultVal),
          newBenefit,
        ),
      );
    }

    // Hide result after delay
    setTimeout(() => setShowRollResult(false), 2000);
  };

  const handleFinalize = () => {
    const doc = getYDoc();
    updateCharacterFields(doc, character.id, {
      status: 'finalized',
      // Ensure credits are saved (already done in handleRoll but good to be safe)
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-heading mb-2 font-display">Mustering Out</h2>

        {/* Career Summary */}
        <div className="text-subtle mb-6">
          {career?.name} • {character.terms.length} Terms • Rank{' '}
          {allocation?.rank ?? finalTerm?.currentRank ?? 0}
          {highRank && <span className="text-amber-400 ml-2">(High Rank Bonuses)</span>}
        </div>

        {/* Rolls Available */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="bg-zinc-950 rounded p-3">
            <div className="text-3xl font-bold text-heading">{rollsRemaining}</div>
            <div className="text-sm text-subtle">Rolls Remaining</div>
          </div>
          <div className="bg-zinc-950 rounded p-3">
            <div className="text-3xl font-bold text-heading">{MAX_CASH_ROLLS - cashRollsUsed}</div>
            <div className="text-sm text-subtle">Cash Rolls Left</div>
          </div>
        </div>

        {/* Roll Buttons */}
        {rollsRemaining > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SciFiButton
              onClick={() => handleRoll('cash')}
              disabled={cashRollsUsed >= MAX_CASH_ROLLS || Boolean(pending)}
              scifiVariant="secondary"
              theme="amber"
              className="h-auto flex-col gap-2 p-4"
            >
              <Coins className="w-5 h-5 text-amber-400" />
              <div className="font-bold">Roll Cash</div>
              {highRank && <div className="text-xs opacity-75">+1 Rank DM</div>}
              {gamblingBonus > 0 && (
                <div className="text-xs opacity-75">+{gamblingBonus} Gambler</div>
              )}
            </SciFiButton>
            <SciFiButton
              onClick={() => handleRoll('benefit')}
              disabled={Boolean(pending)}
              scifiVariant="secondary"
              theme="cyan"
              className="h-auto flex-col gap-2 p-4"
            >
              <Gift className="w-5 h-5 text-cyan-400" />
              <div className="font-bold">Roll Benefits</div>
              {highRank && <div className="text-xs opacity-75">+1 Rank DM</div>}
            </SciFiButton>
          </div>
        )}

        {pendingChoice && pending && (
          <MusteringBenefitChoice
            choice={pendingChoice}
            roll={pending.roll}
            onChoose={handleChoice}
          />
        )}

        {/* Last Roll Result */}
        {showRollResult && lastRollResult && (
          <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4 mb-6 text-center animate-in fade-in">
            <div className="text-subtle text-sm mb-1">Rolled: {lastRollResult.roll.total}</div>
            <div className="text-2xl font-bold text-heading">
              {lastRollResult.type === 'cash'
                ? `Cr${(lastRollResult.result as number).toLocaleString()}`
                : lastRollResult.result}
            </div>
          </div>
        )}

        {/* Collected Benefits */}
        <MusteringBenefitLedger benefits={receivedBenefits} />

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <div className="text-sm text-subtle">Total Credits</div>
            <div className="text-xl font-bold text-green-400">
              Cr{totalCredits.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-subtle">Ship Shares</div>
            <div className="text-xl font-bold text-blue-400">{shipShares}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <SciFiButton
          scifiVariant="ghost"
          disabled={Boolean(pending)}
          theme="slate"
          onClick={() => {
            const doc = getYDoc();
            updateCharacterFields(doc, character.id, { status: 'term_resolution' });
          }}
        >
          ← Back
        </SciFiButton>

        {rollsRemaining === 0 && !pending && (
          <SciFiButton onClick={handleFinalize} theme="cyan" glow>
            Continue →
          </SciFiButton>
        )}
      </div>
    </div>
  );
}
