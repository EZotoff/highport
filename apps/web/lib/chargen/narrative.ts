const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:8000';

export type VerbosityLevel = 'minimal' | 'structured' | 'rich';

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
    };

    const response = await fetch(`${RAG_SERVICE_URL}/narrative/event-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
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
