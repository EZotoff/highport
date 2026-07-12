export interface DiceResult {
  dice: string;
  rolls: number[];
  total: number;
  modifier: number;
  target?: number;
  success?: boolean;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = Math.random;

export function setRandomSeed(seed: number): void {
  rng = mulberry32(seed);
}

export function resetRandomSeed(): void {
  rng = Math.random;
}

export function rollDie(sides: number = 6): number {
  return Math.floor(rng() * sides) + 1;
}

export function roll(dice: string, modifier: number = 0, target?: number): DiceResult {
  const match = dice.match(/^(\d+)?d(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: ${dice}`);
  }

  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }

  let total = rolls.reduce((a, b) => a + b, 0) + modifier;
  let success = target !== undefined ? total >= target : undefined;

  if (typeof window !== 'undefined' && target !== undefined) {
    if ((window as any).__qaForceRollSuccess === true) {
      success = true;
      if (total < target) {
        total = target;
      }
    }

    if ((window as any).__qaForceRollFailure === true) {
      success = false;
      total = target - 1;
    }
  }

  return {
    dice,
    rolls,
    total,
    modifier,
    target,
    success,
  };
}

export function roll2d6(modifier: number = 0, target?: number): DiceResult {
  return roll('2d6', modifier, target);
}

export function roll1d6(modifier: number = 0): DiceResult {
  return roll('1d6', modifier);
}

export function rollD66(): number {
  return rollDie(6) * 10 + rollDie(6);
}

export function rollCharacteristic(): number {
  return roll2d6().total;
}
