export type ThemeColor = 'cyan' | 'violet' | 'amber' | 'emerald' | 'red' | 'slate';

export type AnimationPhase = 'idle' | 'exiting' | 'waiting' | 'entering';

export type NodeVariant = 'default' | 'character' | 'career' | 'event' | 'skill' | 'faction';

export type EdgeVariant = 'default' | 'career-path' | 'relationship' | 'event-chain';

export type RelationshipType = 
  | 'ally' 
  | 'rival' 
  | 'contact' 
  | 'enemy' 
  | 'patron' 
  | 'dependent';

export interface FlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    theme?: ThemeColor;
    variant?: NodeVariant;
    [key: string]: unknown;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    label?: string;
    theme?: ThemeColor;
    variant?: EdgeVariant;
    relationship?: RelationshipType;
    [key: string]: unknown;
  };
}

export interface TermVisualConfig {
  theme: ThemeColor;
  title: string;
  subtitle?: string;
  duration: string;
  outcome: 'success' | 'failure' | 'event';
  skillsGained?: string[];
  benefitsGained?: string[];
}

export interface EntityVisualConfig {
  theme: ThemeColor;
  icon?: string;
  label: string;
  sublabel?: string;
  variant?: 'compact' | 'detailed' | 'card';
}
