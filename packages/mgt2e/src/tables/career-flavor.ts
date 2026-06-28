import { getCareer } from '../loader.js';

function hashFlavorKey(careerId: string, eventKey: string, rngSeed: number | string): number {
  const input = `${careerId}:${eventKey}:${rngSeed}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function getCareerFlavor(
  careerId: string,
  eventKey: string,
  rngSeed: number | string,
): string {
  const career = getCareer(careerId);
  if (!career) return '';

  const templates = career.flavorTemplates?.[eventKey];
  if (templates && templates.length > 0) {
    const index = hashFlavorKey(careerId, eventKey, rngSeed) % templates.length;
    return templates[index] ?? '';
  }

  const eventRoll = Number.parseInt(eventKey, 10);
  const event = career.events.find((candidate) => candidate.roll === eventRoll);
  return event?.description ?? '';
}
