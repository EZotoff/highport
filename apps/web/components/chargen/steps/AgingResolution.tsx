'use client';

import { useState } from 'react';
import {
  roll1d6,
  type AgingCheckResult,
  type PhysicalCharacteristicCode,
  type MentalCharacteristicCode,
} from '@highport/mgt2e';
import { SciFiButton } from '@/components/ui/scifi';
import { getCharacter, updateCharacterFields } from '../../../lib/chargen/state';
import type { ChargenCharacter } from '../../../lib/chargen/types';
import { getYDoc } from '../../../lib/ydoc';

const PHYSICAL = ['STR', 'DEX', 'END'] as const;
const MENTAL = ['INT', 'EDU', 'SOC'] as const;

export function AgingResolution({
  character,
  check,
  onContinue,
}: {
  readonly character: ChargenCharacter;
  readonly check: AgingCheckResult;
  readonly onContinue: () => void;
}) {
  const term = character.terms[character.terms.length - 1];
  const [physical, setPhysical] = useState<PhysicalCharacteristicCode[]>(
    term.agingPhysicalLosses ?? [],
  );
  const [mental, setMental] = useState<MentalCharacteristicCode[]>(term.agingMentalLosses ?? []);
  const [cost, setCost] = useState<number | undefined>(term.agingCrisisCost);
  const [resolved, setResolved] = useState(term.agingResolved === true);
  const complete =
    physical.length === check.physicalLosses &&
    new Set(physical).size === physical.length &&
    check.physicalReductions.every((_, slot) => physical[slot] !== undefined) &&
    mental.length === check.mentalLosses;
  const reduced = { ...character.characteristics };
  physical.forEach((stat, slot) => {
    reduced[stat] -= check.physicalReductions[slot];
  });
  mental.forEach((stat) => {
    reduced[stat] -= 1;
  });
  const crisis = [...physical, ...mental].some((stat) => reduced[stat] <= 0);

  const apply = (decision?: 'paid' | 'died') => {
    if (!complete || resolved) return;
    const doc = getYDoc();
    const latest = getCharacter(doc, character.id);
    if (!latest) return;
    const index = latest.terms.length - 1;
    if (latest.terms[index].agingResolved) return;
    // MGT2E CRB 2e, Ageing Crisis: 1D x Cr10,000 medical care restores zero to one;
    // survivors automatically fail future Qualification rolls.
    if (crisis && cost === undefined) {
      const medicalCost = roll1d6().total * 10000;
      setCost(medicalCost);
      updateCharacterFields(doc, character.id, {
        terms: latest.terms.map((entry, position) =>
          position === index
            ? {
                ...entry,
                agingPhysicalLosses: physical,
                agingMentalLosses: mental,
                agingCrisisCost: medicalCost,
              }
            : entry,
        ),
      });
      return;
    }
    if (crisis && (!decision || (decision === 'paid' && latest.credits < (cost ?? 0)))) return;
    const characteristics = { ...reduced };
    for (const stat of [...physical, ...mental]) {
      characteristics[stat] =
        decision === 'paid'
          ? Math.max(1, characteristics[stat])
          : Math.max(0, characteristics[stat]);
    }
    updateCharacterFields(doc, character.id, {
      characteristics,
      credits: latest.credits - (decision === 'paid' ? (cost ?? 0) : 0),
      terms: latest.terms.map((entry, position) =>
        position === index
          ? {
              ...entry,
              agingPhysicalLosses: physical,
              agingMentalLosses: mental,
              agingResolved: true,
              ...(decision ? { agingCrisis: decision } : {}),
            }
          : entry,
      ),
    });
    setResolved(true);
    if (decision !== 'died') onContinue();
  };

  if (term.agingCrisis === 'died')
    return (
      <div role="alert" className="text-red-400">
        Traveller died in an ageing crisis.
      </div>
    );
  return (
    <section
      aria-label="Ageing resolution"
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-4 space-y-4"
    >
      <h3 className="text-xl font-bold text-heading font-display">
        Aging Check — Age {character.age}
      </h3>
      <p className="text-subtle font-mono">
        Roll: {check.roll.rolls.join(' + ')}; DM {check.roll.modifier}; Total {check.roll.total}
      </p>
      <p className="text-amber-300">{check.description}</p>
      {check.physicalReductions.map((amount, slot) => (
        <label key={PHYSICAL[slot]} className="block text-label">
          Physical loss {slot + 1}: −{amount}
          <select
            aria-label={`Physical loss ${slot + 1}: reduce by ${amount}`}
            value={physical[slot] ?? ''}
            disabled={cost !== undefined || resolved}
            className="block w-full bg-zinc-950 border border-zinc-700 rounded p-3"
            onChange={(event) => {
              const stat = PHYSICAL.find((value) => value === event.target.value);
              if (stat)
                setPhysical((values) => {
                  const next = [...values];
                  next[slot] = stat;
                  return next;
                });
            }}
          >
            <option value="" disabled>
              Choose characteristic
            </option>
            {PHYSICAL.map((stat) => (
              <option
                key={stat}
                value={stat}
                disabled={physical.some((value, index) => value === stat && index !== slot)}
              >
                {stat} {character.characteristics[stat]}
              </option>
            ))}
          </select>
        </label>
      ))}
      {check.mentalLosses > 0 && (
        <label className="block text-label">
          Mental loss: −1
          <select
            aria-label="Mental loss: reduce by 1"
            value={mental[0] ?? ''}
            disabled={cost !== undefined || resolved}
            className="block w-full bg-zinc-950 border border-zinc-700 rounded p-3"
            onChange={(event) => {
              const stat = MENTAL.find((value) => value === event.target.value);
              if (stat) setMental([stat]);
            }}
          >
            <option value="" disabled>
              Choose characteristic
            </option>
            {MENTAL.map((stat) => (
              <option key={stat} value={stat}>
                {stat} {character.characteristics[stat]}
              </option>
            ))}
          </select>
        </label>
      )}
      {cost !== undefined ? (
        <div role="alert" className="space-y-3">
          <p className="text-red-400">
            Ageing crisis: pay for medical care or die. Surviving prevents future qualification.
          </p>
          <SciFiButton
            theme="amber"
            disabled={resolved || character.credits < cost}
            onClick={() => apply('paid')}
          >
            Pay Cr{cost.toLocaleString()} for medical care
          </SciFiButton>
          {character.credits < cost && (
            <p className="text-subtle">Insufficient credits for medical care.</p>
          )}
          <SciFiButton theme="red" disabled={resolved} onClick={() => apply('died')}>
            Decline care — die
          </SciFiButton>
        </div>
      ) : (
        <SciFiButton theme="amber" disabled={!complete || resolved} onClick={() => apply()}>
          {check.physicalLosses === 0 ? 'Continue' : 'Apply Aging Effects'}
        </SciFiButton>
      )}
    </section>
  );
}
