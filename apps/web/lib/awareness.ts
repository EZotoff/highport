import { Awareness } from 'y-protocols/awareness';

export interface PresenceState {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', 
  '#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#fb7185'
];

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function initAwareness(awareness: Awareness, userId: string, name: string) {
  const color = getRandomColor();
  const initialState: PresenceState = {
    userId,
    name,
    color,
    cursor: null,
    selectedNodeId: null,
  };
  awareness.setLocalState(initialState);
}

export function updateCursor(awareness: Awareness, position: { x: number; y: number } | null) {
  const currentState = awareness.getLocalState() as PresenceState;
  if (currentState) {
    awareness.setLocalState({ ...currentState, cursor: position });
  }
}

export function updateSelection(awareness: Awareness, nodeId: string | null) {
  const currentState = awareness.getLocalState() as PresenceState;
  if (currentState) {
    awareness.setLocalState({ ...currentState, selectedNodeId: nodeId });
  }
}
