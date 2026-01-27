import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { characterKnowledge } from '../db/schema.js';

export async function assembleScope(
  _userId: string,
  characterId: string | null,
  isGM: boolean
): Promise<string[]> {
  const scope: string[] = ['public'];

  if (isGM) {
    scope.push('gm');
  }

  if (characterId) {
    scope.push(`char:${characterId}`);
    scope.push('party');

    const grants = await db
      .select()
      .from(characterKnowledge)
      .where(eq(characterKnowledge.characterId, characterId));

    for (const g of grants) {
      scope.push(g.knowledgeTag);
    }
  }

  return scope;
}
