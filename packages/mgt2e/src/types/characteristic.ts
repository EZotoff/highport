export type CharacteristicCode = 'STR' | 'DEX' | 'END' | 'INT' | 'EDU' | 'SOC' | 'PSI';

export interface CharacteristicSet {
  STR: number;
  DEX: number;
  END: number;
  INT: number;
  EDU: number;
  SOC: number;
  PSI?: number;
}

export function getCharacteristicModifier(value: number): number {
  if (value <= 0) return -3;
  if (value <= 2) return -2;
  if (value <= 5) return -1;
  if (value <= 8) return 0;
  if (value <= 11) return 1;
  if (value <= 14) return 2;
  return 3;
}
