
export const CHART_DEFAULTS = {
  width: 280,
  height: 100,
  padding: 15,
  bottomPadding: 20,
};

export const ANIMATION_TIMING = {
  TRANSITION_EXIT: 300,
  TRANSITION_ENTER: 600,
  DELAY_STAGGER: 150,
  CHART_DRAW: 1500,
  CHART_FADE_DELAY_BASE: 0.5,
  CHART_FADE_STAGGER: 0.1, // seconds
  
  // Sequence / Loop Timings
  SEQUENCE_FAST: 1500,
  SEQUENCE_NORMAL: 3000,
  SEQUENCE_SLOW: 4500,
  
  // Specific Component Cycles
  // [OffDuration, OnDuration] -> 3s wait, 9s hold
  MOCKUP_CYCLE: [3000, 9000],
  TABLE_DATA_CYCLE: [3000, 9000],
  
  GUARDIAN_CYCLE: 3500,
  SHEEN_DURATION: 3, // seconds (CSS animation)
  
  // Traveller-Specific Timings
  TERM_CARD_ENTER: 800,
  EDGE_FLOW_CYCLE: 2500,
  NODE_PULSE_CYCLE: 4000,
  DICE_ROLL_REVEAL: 1200,
  CAREER_PATH_TRACE: 2000,
  SKILL_BADGE_STAGGER: 100,
  EVENT_CARD_FLIP: 600,
};

export const Z_LAYERS = {
  BASE: 0,
  GRAPH_EDGES: 10,
  GRAPH_NODES: 20,
  CARDS: 30,
  OVERLAYS: 40,
  MODALS: 50,
  TOOLTIPS: 60,
  NOTIFICATIONS: 70,
};
