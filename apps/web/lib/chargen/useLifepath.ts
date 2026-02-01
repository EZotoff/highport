import { useCharacter } from './hooks';

export function useLifepath(characterId: string | null) {
  const character = useCharacter(characterId);

  // If we have an ID but no character yet, we're loading (or it doesn't exist)
  const isLoading = !!characterId && !character;

  if (!character) {
    return {
      character: null,
      terms: [],
      totalSkills: {},
      totalBenefits: [],
      isLoading,
    };
  }

  return {
    character,
    terms: character.terms || [],
    totalSkills: character.skills || {},
    totalBenefits: character.benefits || [],
    isLoading: false,
  };
}
