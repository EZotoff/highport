import { describe, expect, it } from 'vitest';
import { SRD_CAREERS } from '../src/data/srd/careers.js';
import { getCareerFlavor } from '../src/tables/career-flavor.js';

const dangerousVerbatimPhrases = [
  'Disaster! Roll on the Mishap table',
  'Life Event. Roll on the Life Events table.',
  'You find something of value.',
  'You find temporary work.',
] as const;

const careers = Object.values(SRD_CAREERS);

function expectText(value: string): void {
  expect(value.trim()).toBe(value);
  expect(value.length).toBeGreaterThan(0);
}

describe('career event flavor templates', () => {
  it('provides at least three flavor template event keys for every shipped career', () => {
    expect(careers).toHaveLength(12);

    for (const career of careers) {
      const flavorTemplates = career.flavorTemplates ?? {};
      const eventKeys = new Set(career.events.map((event) => String(event.roll)));

      expect(
        Object.keys(flavorTemplates).length,
        `${career.id} should define at least three event flavor entries`,
      ).toBeGreaterThanOrEqual(3);

      for (const [eventKey, templates] of Object.entries(flavorTemplates)) {
        expect(
          eventKeys.has(eventKey),
          `${career.id}.${eventKey} should match a career event`,
        ).toBe(true);
        expect(
          templates.length,
          `${career.id}.${eventKey} should include at least one template`,
        ).toBeGreaterThan(0);
        for (const template of templates) {
          expectText(template);
        }
      }
    }
  });

  it('selects the same career flavor for a fixed career, event key, and seed', () => {
    const firstSelection = getCareerFlavor('army', '3', 1776);
    const secondSelection = getCareerFlavor('army', '3', 1776);

    expect(firstSelection).toBe(secondSelection);
    expect(firstSelection).toContain('frontier');
  });

  it('falls back to generic event text when no career flavor template matches', () => {
    const event = SRD_CAREERS.army.events.find((candidate) => candidate.roll === 2);

    expect(event).toBeDefined();
    expect(getCareerFlavor('army', '2', 1776)).toBe(event?.description);
  });

  it('keeps flavor templates away from known unsafe source phrases', () => {
    const searchableText = careers
      .flatMap((career) => Object.values(career.flavorTemplates ?? {}).flat())
      .join('\n');

    for (const phrase of dangerousVerbatimPhrases) {
      expect(searchableText).not.toContain(phrase);
    }
  });
});
