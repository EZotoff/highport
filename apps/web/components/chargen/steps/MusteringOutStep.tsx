'use client';

import { useState } from 'react';
import type { MusteringState } from '../../../lib/chargen/types';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import { getCareer } from '@highport/mgt2e';
import { SciFiButton } from '@/components/ui/scifi';
import { Coins, Gift } from 'lucide-react';
import {
  calculateTotalBenefitRolls,
  rollBenefit,
  isHighRank,
  getGamblingBonus,
} from '../../../lib/chargen/mustering';
import type { BenefitRollResult } from '../../../lib/chargen/mustering';

interface MusteringOutStepProps {
  characterId: string | null;
}

interface CollectedBenefit {
  rollNumber: number;
  type: 'cash' | 'benefit';
  roll: number;
  result: string | number;
}

const MAX_CASH_ROLLS = 3;

export default function MusteringOutStep({ characterId }: MusteringOutStepProps) {
  const character = useCharacter(characterId);
  const [collectedBenefits, setCollectedBenefits] = useState<CollectedBenefit[]>([]);
  const [lastRollResult, setLastRollResult] = useState<BenefitRollResult | null>(null);
  const [showRollResult, setShowRollResult] = useState(false);

  if (!character) return <div className="text-subtle">Loading...</div>;

  const totalRolls = calculateTotalBenefitRolls(character);
  const mustering = character.mustering;
  const cashRollsUsed = mustering?.cashRollsUsed ?? 0;
  const rollsUsed = mustering?.rollsUsed ?? collectedBenefits.length;
  const rollsRemaining = totalRolls - rollsUsed;

  const finalTerm = character.terms[character.terms.length - 1];
  const career = getCareer(finalTerm?.careerId || '');
  const highRank = isHighRank(character);
  const gamblingBonus = getGamblingBonus(character);

  // Calculate totals for display
  const totalCredits = collectedBenefits
    .filter((b) => b.type === 'cash')
    .reduce((sum, b) => sum + (b.result as number), character.credits);

  const shipShares =
    collectedBenefits.length > 0
      ? collectedBenefits
          .filter((b) => b.type === 'benefit' && String(b.result).includes('Ship Share'))
          .reduce((sum, b) => {
            const match = String(b.result).match(/(\d+)\s*Ship/i);
            return sum + (match ? parseInt(match[1]) : 1);
          }, 0)
      : (mustering?.shipShares ?? 0);

  const handleRoll = (type: 'cash' | 'benefit') => {
    if (rollsRemaining <= 0) return;
    if (type === 'cash' && cashRollsUsed >= MAX_CASH_ROLLS) return;

    const result = rollBenefit(character, type);

    const currentMustering: MusteringState = character.mustering ?? {
      totalRolls: calculateTotalBenefitRolls(character),
      rollsUsed: 0,
      cashRollsUsed: 0,
      benefits: [],
      credits: 0,
      shipShares: 0,
    };

    const resultVal = result.result;
    const isShipShare =
      type === 'benefit' && typeof resultVal === 'string' && resultVal.includes('Ship Share');
    let shipShareCount = 0;
    if (isShipShare) {
      const match = String(resultVal).match(/(\d+)\s*Ship/i);
      shipShareCount = match ? parseInt(match[1], 10) : 1;
    }

    const newMustering: MusteringState = {
      totalRolls: currentMustering.totalRolls,
      rollsUsed: currentMustering.rollsUsed + 1,
      cashRollsUsed:
        type === 'cash' ? currentMustering.cashRollsUsed + 1 : currentMustering.cashRollsUsed,
      benefits:
        type === 'benefit'
          ? [...currentMustering.benefits, resultVal as string]
          : currentMustering.benefits,
      credits:
        type === 'cash'
          ? currentMustering.credits + (resultVal as number)
          : currentMustering.credits,
      shipShares: currentMustering.shipShares + shipShareCount,
    };

    const newBenefit: CollectedBenefit = {
      rollNumber: currentMustering.rollsUsed + 1,
      type,
      roll: result.roll.total,
      result: resultVal,
    };

    setCollectedBenefits((prev) => [...prev, newBenefit]);
    setLastRollResult(result);
    setShowRollResult(true);

    const doc = getYDoc();
    if (type === 'cash') {
      updateCharacterFields(doc, character.id, {
        mustering: newMustering,
        credits: character.credits + (resultVal as number),
      });
    } else {
      updateCharacterFields(doc, character.id, {
        mustering: newMustering,
        benefits: [...character.benefits, resultVal as string],
      });
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
          {career?.name} • {character.terms.length} Terms • Rank {finalTerm?.currentRank || 0}
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
              disabled={cashRollsUsed >= MAX_CASH_ROLLS}
              scifiVariant="secondary"
              theme="amber"
              className="h-auto flex-col gap-2 p-4"
            >
              <Coins className="w-5 h-5 text-amber-400" />
              <div className="font-bold">Roll Cash</div>
              {gamblingBonus > 0 && (
                <div className="text-xs opacity-75">+{gamblingBonus} Gambler</div>
              )}
            </SciFiButton>
            <SciFiButton
              onClick={() => handleRoll('benefit')}
              scifiVariant="secondary"
              theme="cyan"
              className="h-auto flex-col gap-2 p-4"
            >
              <Gift className="w-5 h-5 text-cyan-400" />
              <div className="font-bold">Roll Benefits</div>
              {highRank && <div className="text-xs opacity-75">High Rank Alternate</div>}
            </SciFiButton>
          </div>
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
        {collectedBenefits.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-heading mb-3 font-display">Benefits Received</h3>
            <div className="space-y-2">
              {collectedBenefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3 bg-zinc-950 rounded p-3">
                  <span className="text-subtle text-sm">#{b.rollNumber}</span>
                  <span className={b.type === 'cash' ? 'text-amber-400' : 'text-cyan-400'}>
                    {b.type === 'cash' ? (
                      <Coins className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Gift className="w-5 h-5 text-cyan-400" />
                    )}
                  </span>
                  <span className="text-heading">
                    {b.type === 'cash' ? `Cr${(b.result as number).toLocaleString()}` : b.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
          theme="slate"
          onClick={() => {
            const doc = getYDoc();
            updateCharacterFields(doc, character.id, { status: 'term_resolution' });
          }}
        >
          ← Back
        </SciFiButton>

        {rollsRemaining === 0 && (
          <SciFiButton onClick={handleFinalize} theme="cyan" glow>
            Continue →
          </SciFiButton>
        )}
      </div>
    </div>
  );
}
