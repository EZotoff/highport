import type { ChargenCharacter, CareerTermResult, SpawnedEntityRef } from './types';

/**
 * Export character lifepath as plain text
 */
export function exportLifepathAsText(character: ChargenCharacter): string {
  const lines: string[] = [];

  // Header
  lines.push(`LIFEPATH: ${character.name}`);
  lines.push(`Age: ${character.age}`);
  lines.push('');

  // Career summary
  const careersGrouped = groupTermsByCareerId(character.terms);
  const careerSummary = Object.entries(careersGrouped)
    .map(([careerId, terms]) => `${careerId} - ${terms.length} Term${terms.length > 1 ? 's' : ''}`)
    .join(', ');
  lines.push(`CAREER: ${careerSummary}`);
  lines.push('');

  // Term-by-term breakdown
  for (const term of character.terms) {
    const endAge = term.startAge + 4;
    lines.push(`Term ${term.termNumber} (Age ${term.startAge}-${endAge})`);
    lines.push(`- Career: ${term.careerId} (${term.assignmentId})`);
    lines.push(`- Survived: ${term.survived ? 'Yes' : 'No'}`);

    if (term.eventDescription) {
      lines.push(`- Event: ${term.eventDescription}`);

      // Spawned entities from this event
      if (term.spawnedEntities.length > 0) {
        for (const entity of term.spawnedEntities) {
          lines.push(`  → Spawned: ${entity.name} (${entity.relationship || entity.type})`);
        }
      }
    }

    if (term.survived) {
      lines.push(
        `- Advanced: ${term.advanced ? 'Yes' : 'No'}${term.advanced ? ` → Rank ${term.currentRank}` : ''}`,
      );

      if (term.skillsGained.length > 0) {
        const skillStr = term.skillsGained
          .map((s) => `${s.skill}${s.specialty ? ` (${s.specialty})` : ''}-${s.level}`)
          .join(', ');
        lines.push(`- Skills: ${skillStr}`);
      }
    } else if (term.mishap) {
      lines.push(`- Mishap: Career ended`);
    }

    lines.push('');
  }

  // Final Stats
  lines.push('FINAL STATS');
  const chars = character.characteristics;
  lines.push(`STR: ${chars.STR}  DEX: ${chars.DEX}  END: ${chars.END}`);
  lines.push(`INT: ${chars.INT}  EDU: ${chars.EDU}  SOC: ${chars.SOC}`);
  lines.push('');

  // Skills
  lines.push('SKILLS');
  const skillEntries = Object.entries(character.skills)
    .sort((a, b) => b[1] - a[1]) // Sort by level desc
    .map(([skill, level]) => `${skill}-${level}`);
  if (skillEntries.length > 0) {
    lines.push(skillEntries.join(', '));
  } else {
    lines.push('None');
  }
  lines.push('');

  // Benefits
  lines.push('BENEFITS');
  if (character.benefits.length > 0) {
    lines.push(character.benefits.join(', '));
  }
  if (character.credits > 0) {
    lines.push(`Cr${character.credits.toLocaleString()}`);
  }
  if (character.benefits.length === 0 && character.credits === 0) {
    lines.push('None');
  }
  lines.push('');

  // Connections (spawned entities)
  const allConnections = character.terms.flatMap((t) =>
    t.spawnedEntities.map((e) => ({ ...e, term: t.termNumber })),
  );

  if (allConnections.length > 0) {
    lines.push('CONNECTIONS');
    for (const conn of allConnections) {
      lines.push(`- ${conn.name} (${conn.relationship || conn.type}) - Term ${conn.term}`);
    }
  }

  return lines.join('\n');
}

/**
 * Export character lifepath as Markdown
 */
export function exportLifepathAsMarkdown(character: ChargenCharacter): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Lifepath: ${character.name}`);
  lines.push('');
  lines.push(`**Age:** ${character.age}`);
  lines.push('');

  // Career summary
  const careersGrouped = groupTermsByCareerId(character.terms);
  const careerSummary = Object.entries(careersGrouped)
    .map(([careerId, terms]) => `${careerId} - ${terms.length} Term${terms.length > 1 ? 's' : ''}`)
    .join(', ');
  lines.push(`## Career: ${careerSummary}`);
  lines.push('');

  // Term-by-term breakdown
  for (const term of character.terms) {
    const endAge = term.startAge + 4;
    lines.push(`### Term ${term.termNumber} (Age ${term.startAge}-${endAge})`);
    lines.push('');
    lines.push(`- **Career:** ${term.careerId} (${term.assignmentId})`);
    lines.push(`- **Survived:** ${term.survived ? '✓' : '✗'}`);

    if (term.eventDescription) {
      lines.push(`- **Event:** ${term.eventDescription}`);

      // Spawned entities from this event
      if (term.spawnedEntities.length > 0) {
        for (const entity of term.spawnedEntities) {
          lines.push(`  - *Spawned:* ${entity.name} (${entity.relationship || entity.type})`);
        }
      }
    }

    if (term.survived) {
      lines.push(
        `- **Advanced:** ${term.advanced ? '✓' : '✗'}${term.advanced ? ` → Rank ${term.currentRank}` : ''}`,
      );

      if (term.skillsGained.length > 0) {
        const skillStr = term.skillsGained
          .map((s) => `${s.skill}${s.specialty ? ` (${s.specialty})` : ''}-${s.level}`)
          .join(', ');
        lines.push(`- **Skills:** ${skillStr}`);
      }
    } else if (term.mishap) {
      lines.push(`- **Mishap:** Career ended`);
    }

    lines.push('');
  }

  // Final Stats
  lines.push('## Final Stats');
  lines.push('');
  lines.push('| STR | DEX | END | INT | EDU | SOC |');
  lines.push('|-----|-----|-----|-----|-----|-----|');
  const chars = character.characteristics;
  lines.push(
    `| ${chars.STR} | ${chars.DEX} | ${chars.END} | ${chars.INT} | ${chars.EDU} | ${chars.SOC} |`,
  );
  lines.push('');

  // Skills
  lines.push('## Skills');
  lines.push('');
  const skillEntries = Object.entries(character.skills).sort((a, b) => b[1] - a[1]); // Sort by level desc
  if (skillEntries.length > 0) {
    for (const [skill, level] of skillEntries) {
      lines.push(`- ${skill}-${level}`);
    }
  } else {
    lines.push('*None*');
  }
  lines.push('');

  // Benefits
  lines.push('## Benefits');
  lines.push('');
  if (character.benefits.length > 0) {
    for (const benefit of character.benefits) {
      lines.push(`- ${benefit}`);
    }
  }
  if (character.credits > 0) {
    lines.push(`- Cr${character.credits.toLocaleString()}`);
  }
  if (character.benefits.length === 0 && character.credits === 0) {
    lines.push('*None*');
  }
  lines.push('');

  // Connections (spawned entities)
  const allConnections = character.terms.flatMap((t) =>
    t.spawnedEntities.map((e) => ({ ...e, term: t.termNumber })),
  );

  if (allConnections.length > 0) {
    lines.push('## Connections');
    lines.push('');
    lines.push('| Name | Relationship | From |');
    lines.push('|------|--------------|------|');
    for (const conn of allConnections) {
      lines.push(`| ${conn.name} | ${conn.relationship || conn.type} | Term ${conn.term} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Capture an HTML element as a PNG image blob
 * Uses html-to-image library
 *
 * Note: html-to-image is NOT currently installed.
 * To use this function, install it first:
 *   pnpm add html-to-image --filter web
 */
export async function exportLifepathAsImage(element: HTMLElement): Promise<Blob> {
  throw new Error(
    'Image export requires html-to-image library.\n' +
      'Install it with: pnpm add html-to-image --filter web\n' +
      'Then uncomment the implementation below.',
  );

  // Uncomment when html-to-image is installed:
  /*
  const { toPng } = await import('html-to-image');
  
  const dataUrl = await toPng(element, { 
    backgroundColor: '#1f2937', // Dark background
    quality: 1.0,
    pixelRatio: 2 // Higher quality for retina displays
  });
  
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  return response.blob();
  */
}

/**
 * Helper to download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download text as a file
 */
export function downloadText(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Group terms by career ID for summary
 */
function groupTermsByCareerId(terms: CareerTermResult[]): Record<string, CareerTermResult[]> {
  return terms.reduce(
    (acc, term) => {
      if (!acc[term.careerId]) {
        acc[term.careerId] = [];
      }
      acc[term.careerId].push(term);
      return acc;
    },
    {} as Record<string, CareerTermResult[]>,
  );
}
