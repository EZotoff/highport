import { RagUnavailableError } from '../rag-client';
import { unwrapAIField } from './types';
import type { ChargenCharacter, CrossCharacterLinkProposal, LifepathProposal } from './types';
import { findSharedHistory } from '../graph/shared-history';

const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:18124';

export type VerbosityLevel = 'brief' | 'inspiration' | 'full';

export interface CharacterContext {
  name: string;
  characteristics: Record<string, number>;
  priorEvents?: string[];
}

export interface SuggestedEntity {
  type: 'npc' | 'location' | 'item' | 'secret';
  relationship?: string;
  suggestedName?: string;
  suggestedMotivation?: string;
}

export interface EventDescriptionResult {
  description: string;
  suggestedEntities: SuggestedEntity[];
}

export interface NPCContext {
  eventText: string;
  career: string;
  characterName: string;
}

export interface NPCDetails {
  name: string;
  personality?: string;
  motivation?: string;
  appearance?: string;
  quirks?: string[];
}

/**
 * Generate a narrative description for a career event
 */
export async function generateEventDescription(params: {
  eventText: string;
  career: string;
  assignment: string;
  term: number;
  characterContext: CharacterContext;
  verbosity: VerbosityLevel;
  guidance?: string;
}): Promise<EventDescriptionResult> {
  try {
    // Convert to snake_case for Python API
    const requestBody = {
      event_text: params.eventText,
      career: params.career,
      assignment: params.assignment,
      term: params.term,
      character_context: {
        name: params.characterContext.name,
        characteristics: params.characterContext.characteristics,
        prior_events: params.characterContext.priorEvents,
      },
      verbosity: params.verbosity,
      guidance: params.guidance || undefined,
    };

    const response = await fetch(`${RAG_SERVICE_URL}/narrative/event-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new RagUnavailableError(`RAG service unavailable (${response.status})`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new RagUnavailableError('RAG service unreachable');
    }
    console.error('Narrative generation failed:', error);
    throw error;
  }
}

/**
 * Generate details for an NPC based on context
 */
export async function generateNPCDetails(params: {
  npcType: string;
  context: NPCContext;
  existingFields?: Partial<NPCDetails>;
  verbosity: VerbosityLevel;
}): Promise<NPCDetails> {
  try {
    // Convert to snake_case for Python API
    const requestBody = {
      npc_type: params.npcType,
      context: {
        event_text: params.context.eventText,
        career: params.context.career,
        character_name: params.context.characterName,
      },
      existing_fields: params.existingFields,
      verbosity: params.verbosity,
    };

    const response = await fetch(`${RAG_SERVICE_URL}/narrative/npc-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new RagUnavailableError(`RAG service unavailable (${response.status})`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new RagUnavailableError('RAG service unreachable');
    }
    console.error('NPC generation failed:', error);
    throw error;
  }
}

/**
 * Check if the narrative API is available
 */
export async function checkNarrativeAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // Short timeout for health check
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Propose narrative links between characters based on shared history.
 */
export async function generateCrossCharacterLinks(
  characters: ChargenCharacter[],
  sharedHistory: ReturnType<typeof findSharedHistory>,
  isGM = false,
): Promise<CrossCharacterLinkProposal[]> {
  try {
    const requestBody = {
      characters: characters.map((character) => ({
        id: character.id,
        name: character.name,
        player_id: character.playerId,
        homeworld: character.homeworld,
        age: character.age,
        characteristics: character.characteristics,
        background_skills: character.backgroundSkills,
        skills: character.skills,
        benefits: character.benefits,
        credits: character.credits,
        status: character.status,
        terms: character.terms.map((term) => ({
          term_number: term.termNumber,
          career_id: term.careerId,
          assignment_id: term.assignmentId,
          drafted: term.drafted,
          survived: term.survived,
          advanced: term.advanced,
          current_rank: term.currentRank,
          skills_gained: term.skillsGained,
          event_description:
            typeof term.eventDescription === 'string' ? term.eventDescription : undefined,
          mishap_description:
            typeof term.mishapDescription === 'string' ? term.mishapDescription : undefined,
          spawned_entities: term.spawnedEntities.map((entity) => ({
            type: entity.type,
            graph_node_id: entity.graphNodeId,
            relationship: entity.relationship,
            name: entity.name,
            description: entity.description,
          })),
        })),
      })),
      shared_history: sharedHistory,
    };

    const response = await fetch(`${RAG_SERVICE_URL}/narrative/cross-character-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Character-Id': characters[0]?.id ?? '',
        'X-Is-GM': String(isGM),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new RagUnavailableError(`RAG service unavailable (${response.status})`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      proposals: Array<{
        source_char_id: string;
        target_char_id: string;
        relationship: string;
        description: string;
        source_entity_id?: string;
        target_entity_id?: string;
      }>;
    };

    return data.proposals.map((proposal) => ({
      id: crypto.randomUUID(),
      sourceCharId: proposal.source_char_id,
      targetCharId: proposal.target_char_id,
      sourceEntityId: proposal.source_entity_id,
      targetEntityId: proposal.target_entity_id,
      relationship: proposal.relationship,
      description: proposal.description,
      status: 'pending' as const,
      generatedAt: Date.now(),
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new RagUnavailableError('RAG service unreachable');
    }
    console.error('Cross-character link generation failed:', error);
    throw error;
  }
}
/**
 * Propose narrative edits, connections, and hooks for a single character's lifepath.
 */
export async function generateLifepathReview(
  character: ChargenCharacter,
  campaignContext?: string[],
  isGM = false,
): Promise<LifepathProposal[]> {
  try {
    const requestBody = {
      character: {
        id: character.id,
        player_id: character.playerId,
        name: character.name,
        homeworld: character.homeworld,
        characteristics: character.characteristics,
        background_skills: character.backgroundSkills,
        terms: character.terms.map((term) => ({
          term_number: term.termNumber,
          career_id: term.careerId,
          assignment_id: term.assignmentId,
          start_age: term.startAge,
          drafted: term.drafted,
          draft_roll: term.draftRoll,
          survival_dm_bonus: term.survivalDmBonus,
          survival_roll: term.survivalRoll,
          survived: term.survived,
          event_roll: term.eventRoll,
          event: term.event,
          event_choice: term.eventChoice,
          event_description:
            typeof term.eventDescription === 'string'
              ? term.eventDescription
              : unwrapAIField(term.eventDescription),
          mishap: term.mishap,
          mishap_description:
            typeof term.mishapDescription === 'string'
              ? term.mishapDescription
              : unwrapAIField(term.mishapDescription),
          advancement_roll: term.advancementRoll,
          advanced: term.advanced,
          rank_gained: term.rankGained,
          current_rank: term.currentRank,
          commission_roll: term.commissionRoll,
          commissioned: term.commissioned,
          aging_roll: term.agingRoll,
          aging_effect: term.agingEffect,
          aging_physical_losses: term.agingPhysicalLosses,
          aging_mental_losses: term.agingMentalLosses,
          skills_gained: term.skillsGained,
          spawned_entities: term.spawnedEntities.map((entity) => ({
            type: entity.type,
            graph_node_id: entity.graphNodeId,
            relationship: entity.relationship,
            name: entity.name,
            description: entity.description,
          })),
        })),
        chapters: character.chapters.map((chapter) => ({
          term_number: chapter.termNumber,
          career_id: chapter.careerId,
          career_name: chapter.careerName,
          age: chapter.age,
          key_event_description: chapter.keyEventDescription,
          skills_gained: chapter.skillsGained,
          rank_change: chapter.rankChange,
          mishap: chapter.mishap,
          aging_effect: chapter.agingEffect,
          drafted: chapter.drafted,
        })),
        current_term_index: character.currentTermIndex,
        status: character.status,
        skills: character.skills,
        benefits: character.benefits,
        credits: character.credits,
        age: character.age,
        spawned_entity_ids: character.spawnedEntityIds,
        dismissed_suggestions: character.dismissedSuggestions,
        mustering: character.mustering,
      },
      campaign_context: campaignContext,
    };

    const response = await fetch(`${RAG_SERVICE_URL}/narrative/lifepath-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Character-Id': character.id,
        'X-Is-GM': String(isGM),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new RagUnavailableError(`RAG service unavailable (${response.status})`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      proposals: Array<{
        type: 'coherence-edit' | 'npc-connection' | 'plot-hook';
        title: string;
        description: string;
        target_term: number;
        proposed_edit?: string;
      }>;
    };

    return data.proposals.map((proposal) => ({
      id: crypto.randomUUID(),
      type: proposal.type,
      targetTerm: proposal.target_term,
      title: proposal.title,
      description: proposal.description,
      proposedEdit: proposal.proposed_edit,
      status: 'pending' as const,
      generatedAt: Date.now(),
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new RagUnavailableError('RAG service unreachable');
    }
    console.error('Lifepath review generation failed:', error);
    throw error;
  }
}
