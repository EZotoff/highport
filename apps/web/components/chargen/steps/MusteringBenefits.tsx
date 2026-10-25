import { SciFiButton } from '@/components/ui/scifi';
import { Coins, Gift } from 'lucide-react';
import type { BenefitChoice } from '../../../lib/chargen/mustering-benefits';
import type { MusteringRoll } from '../../../lib/chargen/types';

export function MusteringBenefitLedger({
  benefits,
}: {
  readonly benefits: readonly MusteringRoll[];
}) {
  if (benefits.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-heading mb-3 font-display">Benefits Received</h3>
      <div className="space-y-2">
        {benefits.map((benefit) => (
          <div
            key={`${benefit.type}-${benefit.rollNumber}`}
            className="flex items-center gap-3 bg-zinc-950 rounded p-3"
          >
            <span className="text-subtle text-sm">#{benefit.rollNumber}</span>
            {benefit.type === 'cash' ? (
              <Coins className="w-5 h-5 text-amber-400" />
            ) : (
              <Gift className="w-5 h-5 text-cyan-400" />
            )}
            <span className="text-heading">
              {benefit.type === 'cash'
                ? `Cr${Number(benefit.result).toLocaleString()}`
                : benefit.result}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MusteringBenefitChoice({
  choice,
  roll,
  onChoose,
}: {
  readonly choice: BenefitChoice;
  readonly roll: number;
  readonly onChoose: (benefit: string) => void;
}) {
  return (
    <fieldset className="bg-zinc-950 border border-cyan-500/30 rounded-lg p-4 mb-6 space-y-3">
      <legend className="font-display text-heading">Choose one benefit</legend>
      <p className="text-subtle text-sm">
        Rolled: {roll}. Only your chosen benefit will be granted.
      </p>
      <div className="flex flex-wrap gap-3">
        {choice.alternatives.map((alternative) => (
          <SciFiButton
            key={alternative.label}
            theme="cyan"
            scifiVariant="secondary"
            onClick={() => onChoose(alternative.label)}
          >
            {alternative.label}
          </SciFiButton>
        ))}
      </div>
    </fieldset>
  );
}
