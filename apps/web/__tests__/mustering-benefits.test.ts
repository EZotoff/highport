import { describe, expect, it } from 'vitest';
import { applyCharacteristicBenefit } from '../lib/chargen/mustering';

const characteristics = { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 };

describe('characteristic mustering benefits', () => {
  it.each(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'] as const)(
    'applies the recorded bonus to %s',
    (stat) => {
      const applied = applyCharacteristicBenefit(characteristics, `+1 ${stat}`);
      expect(applied).toEqual({ ...characteristics, [stat]: 8 });
      expect(characteristics[stat]).toBe(7);
    },
  );

  it.each(['TAS Membership', 'Weapon', '2 Ship Shares'])(
    'leaves characteristics alone for %s',
    (benefit) => {
      expect(applyCharacteristicBenefit(characteristics, benefit)).toBeNull();
    },
  );

  it('uses the existing numeric guard when persisted stat data is non-numeric', () => {
    const malformed = { ...characteristics };
    Reflect.set(malformed, 'INT', '7');
    expect(applyCharacteristicBenefit(malformed, '+1 INT')?.INT).toBe(1);
  });
});
