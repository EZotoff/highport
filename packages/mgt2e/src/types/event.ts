export interface CareerEvent {
  roll: number;           // 2-12 on 2d6
  description: string;    // Base event text from CRB
  
  // What this event can spawn
  spawns?: EventSpawn[];
  
  // Mechanical effects
  effects?: EventEffect[];
  
  // Choices for the player
  choices?: EventChoice[];
}

export interface EventSpawn {
  type: 'npc' | 'location' | 'item' | 'secret';
  relationship?: 'ally' | 'contact' | 'rival' | 'enemy';
  template?: string;       // AI prompt template for generation
  required: boolean;       // Must player provide details?
}

export interface EventEffect {
  type: 'skill' | 'characteristic' | 'benefit' | 'special';
  target: string;          // Skill/characteristic/benefit ID
  value: number | string;  // +1, -1, or special value
  condition?: string;      // "if player chooses X"
}

export interface EventChoice {
  id: string;
  description: string;
  effects: EventEffect[];
}

export interface CareerMishap {
  roll: number;            // 1-6 on 1d6
  description: string;
  injury: boolean;         // Does this cause injury roll?
  effects?: EventEffect[];
  spawns?: EventSpawn[];
  forced: boolean;         // Must leave career after this?
}
