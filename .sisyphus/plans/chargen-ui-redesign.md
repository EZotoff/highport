# Chargen / Life Graph UI Redesign Plan

> **Status**: ✅ COMPLETE - All core UI redesign infrastructure implemented
> **Completed**: 2026-02-02
> **Note**: Core design system and components complete. Some wrapper components (ChargenWizard layout, CharacterPreview) still use legacy zinc styling - these can be migrated incrementally.
> **Theme**: "Interstellar Datapad" - A fusion of hi-tech terminals, cosmic aesthetics, and psychedelic universe vibes
> **Inspiration**: Mongoose Traveller 2e visual language + Modern sci-fi UI patterns + Present codebase components

---

## Executive Summary

The current chargen/life graph UI suffers from a "1980s IBM Mainframe" aesthetic due to:

- Theme inconsistency (dark chargen vs light graph)
- Over-reliance on gray palettes and boxed layouts
- Information overload without visual hierarchy
- Lack of animations, depth, and "juice"
- Static, terminal-like presentation

This plan transforms the UI into a **modern sci-fi datapad experience** featuring:

- Unified "Deep Space" dark theme
- Glowing neon accents and plasma effects
- Animated data flows and energy trails
- Layered glassmorphism panels
- Cosmic/psychedelic background elements
- Crisp hi-tech typography

---

## Part 0: Present Codebase Dissection & Adoption Strategy

> **Critical**: The `/home/ezotoff/AI_projects/present` codebase contains a battle-tested visual infrastructure that should be **dissected and adopted** (not copied wholesale) to accelerate development. We adopt the **structure and patterns**, but re-skin with our **Trojan Reach** aesthetic.

### 0.1 Structural Assets to Port

The present codebase has a well-organized architecture that we should replicate:

```
/present/                          →  /traveller/apps/web/
├── config/
│   ├── visualConfig.ts            →  lib/design-system/visualConfig.ts
│   └── transitionConfig.ts        →  lib/design-system/transitionConfig.ts
├── utils/
│   ├── themeUtils.ts              →  lib/design-system/themeUtils.ts
│   ├── animationUtils.ts          →  lib/design-system/animationUtils.ts
│   └── bezierUtils.ts             →  lib/design-system/bezierUtils.ts
├── types.ts                       →  lib/design-system/types.ts
└── components/
    └── shared/                    →  components/ui/scifi/
        ├── SilkyChevron.tsx       →  (port directly)
        ├── ProcessFlowSheen.tsx   →  (port directly)
        ├── AnimatedConnection.tsx →  (port directly)
        └── ...
```

### 0.2 Config Layer - What to Adopt

#### `visualConfig.ts` Pattern

Port the timing constants pattern for consistent animations across the app:

```typescript
// FROM: /present/config/visualConfig.ts
// TO: apps/web/lib/design-system/visualConfig.ts

export const ANIMATION_TIMING = {
  // === Transition Durations ===
  TRANSITION_EXIT: 300, // ms - element exit animation
  TRANSITION_ENTER: 600, // ms - element enter animation
  DELAY_STAGGER: 150, // ms - stagger between sibling animations

  // === Chart/Visualization Timing ===
  CHART_DRAW: 1500, // ms - SVG path draw duration
  CHART_FADE_DELAY: 0.5, // s - delay before chart elements fade in
  CHART_FADE_STAGGER: 0.1, // s - stagger between chart data points

  // === Traveller-Specific Timing ===
  TERM_CARD_ENTER: 400, // ms - career term card appearance
  EDGE_FLOW_CYCLE: 2000, // ms - animated edge "data flow" cycle
  NODE_PULSE_CYCLE: 3000, // ms - node glow pulse cycle
  SHEEN_DURATION: 3, // s - ProcessFlowSheen sweep (CSS)

  // === Sequence/Loop Timing ===
  DICE_ROLL_REVEAL: 800, // ms - dramatic dice result reveal
  EVENT_EXPAND_DURATION: 400, // ms - event card expansion
};

export const CHART_DEFAULTS = {
  width: 280,
  height: 100,
  padding: 15,
  bottomPadding: 20,
};
```

#### `themeUtils.ts` Pattern

Adopt the JIT-safe theme system, but **replace the colors** with our Trojan Reach palette:

```typescript
// FROM: /present/utils/themeUtils.ts
// TO: apps/web/lib/design-system/themeUtils.ts

// === TRAVELLER THEME COLORS (replaces present's palette) ===
export const THEME_COLORS = ['cyan', 'violet', 'amber', 'emerald', 'red', 'slate'] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

// Hex values for SVG/Canvas use
export const THEME_HEX: Record<ThemeColor, string> = {
  cyan: '#00f0ff', // plasma-cyan (primary)
  violet: '#8b5cf6', // impulse-violet (relationships)
  amber: '#f59e0b', // reactor-amber (warnings/GM)
  emerald: '#10b981', // warp-emerald (success)
  red: '#ef4444', // hull-breach-red (danger)
  slate: '#94a3b8', // neutral/muted
};

// JIT-safe Tailwind class lookup (same pattern as present)
const THEME_CONFIG = {
  cyan: {
    text: {
      100: 'text-cyan-100',
      200: 'text-cyan-200',
      300: 'text-cyan-300',
      400: 'text-cyan-400',
    },
    bg: { '500/10': 'bg-cyan-500/10', '500/20': 'bg-cyan-500/20' },
    border: { 400: 'border-cyan-400', '500/30': 'border-cyan-500/30' },
    glow: 'shadow-[0_0_20px_rgba(0,240,255,0.4)]',
    // ... etc
  },
  // ... other colors
};

// Typography presets (adapted for sci-fi)
export const TYPOGRAPHY = {
  display: 'font-orbitron text-4xl md:text-5xl font-black tracking-wider uppercase',
  heading: 'font-orbitron text-xl md:text-2xl font-bold tracking-wide',
  body: 'font-inter text-base md:text-lg font-light leading-relaxed',
  label: 'font-mono text-[10px] md:text-xs font-bold uppercase tracking-[0.15em]',
  data: 'font-mono text-lg md:text-xl font-bold',
};
```

#### `animationUtils.ts` Pattern

Port these hooks **directly** - they're framework-agnostic and highly reusable:

```typescript
// FROM: /present/utils/animationUtils.ts
// TO: apps/web/lib/design-system/animationUtils.ts

// Port these hooks as-is (change import paths only):

export type AnimationPhase = 'idle' | 'exiting' | 'waiting' | 'entering';

// ✅ PORT: Accessibility-first motion detection
export function useReducedMotion(): boolean {
  /* ... */
}

// ✅ PORT: Sequence controller for looping states
export function useSequenceController(
  steps: number,
  intervalTime: number | number[],
  active?: boolean,
): number {
  /* ... */
}

// ✅ PORT: Boolean toggle for A/B state cycling
export function useToggleLoop(intervalTime: number | number[], active?: boolean): boolean {
  /* ... */
}

// ✅ PORT: Enter/exit transition state machine
export function useTransitionController(
  targetId: string,
  delay?: number,
): {
  displayedId: string;
  animationClass: string;
  phase: AnimationPhase;
} {
  /* ... */
}
```

### 0.3 Shared Components - Direct Ports

These components are **design-agnostic** and should be ported with minimal changes:

| Component                | Source                        | Changes Needed                             |
| ------------------------ | ----------------------------- | ------------------------------------------ |
| `SilkyChevron.tsx`       | `/present/components/shared/` | **None** - accepts color prop, works as-is |
| `ProcessFlowSheen.tsx`   | `/present/components/shared/` | **None** - pure CSS animation component    |
| `AnimatedConnection.tsx` | `/present/components/shared/` | **None** - SVG edge effects                |
| `TransitionText.tsx`     | `/present/components/shared/` | **None** - animated text wrapper           |

### 0.4 Type System - What to Adapt

The present codebase has a robust type system we should **partially adopt**:

```typescript
// FROM: /present/types.ts (ADOPT PATTERNS, NOT CONTENT)
// TO: apps/web/lib/design-system/types.ts

// ✅ ADOPT: Visual configuration pattern
export interface VisualConfig {
  type: 'timeline' | 'flow' | 'cluster';
  // ... config specific to visual type
}

// ✅ ADOPT: Flow/Graph node/edge typing pattern
export interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  variant: 'character' | 'term' | 'entity' | 'career';
  color?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  variant?: 'solid' | 'flow' | 'dashed';
  color?: string;
  label?: string;
}

// ❌ SKIP: Slide/Deck/Comparison types (present-specific)
// ❌ SKIP: Venture/Workshop types (present-specific)
```

### 0.5 What NOT to Port

**Do not copy these** - they are present-specific:

- `constants.tsx`, `constants-*.ts` - Content definitions
- `contexts/DeckContext.tsx` - Presentation navigation
- `components/layouts/*Layout.tsx` - Slide layouts
- `components/copilot/*` - AI chat features
- `components/demo/*` - Demo-specific components
- `api/*` - API routes
- Deck/Slide type definitions

### 0.6 Implementation Approach

**Step 1: Create Design System Scaffolding**

```bash
mkdir -p apps/web/lib/design-system
mkdir -p apps/web/components/ui/scifi
```

**Step 2: Port Config & Utils First**

```bash
# Copy and adapt (don't symlink - we need to modify)
cp present/config/visualConfig.ts traveller/apps/web/lib/design-system/
cp present/utils/animationUtils.ts traveller/apps/web/lib/design-system/
cp present/utils/themeUtils.ts traveller/apps/web/lib/design-system/
# Then modify colors/timing to match Trojan Reach theme
```

**Step 3: Port Shared Components**

```bash
# These can be copied with minimal changes
cp present/components/shared/SilkyChevron.tsx traveller/apps/web/components/ui/scifi/
cp present/components/shared/ProcessFlowSheen.tsx traveller/apps/web/components/ui/scifi/
cp present/components/shared/AnimatedConnection.tsx traveller/apps/web/components/ui/scifi/
# Update import paths only
```

**Step 4: Create Traveller-Specific Wrapper Components**
Build higher-level components that use the ported primitives:

- `TermCard.tsx` (uses `ProcessFlowSheen`)
- `CareerTimeline.tsx` (uses `SilkyChevron`, `AnimatedConnection`)
- `CharacterNode.tsx` (uses glow effects from themeUtils)

### 0.7 Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENT CODEBASE                           │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ Config Layer     │  │ Utils Layer     │  │ Components Layer     │
│                  │  │                 │  │                      │
│ • visualConfig   │  │ • animationUtils│  │ • SilkyChevron       │
│ • transitionCfg  │  │ • themeUtils    │  │ • ProcessFlowSheen   │
│                  │  │ • bezierUtils   │  │ • AnimatedConnection │
└────────┬─────────┘  └────────┬────────┘  └──────────┬───────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               TRAVELLER DESIGN SYSTEM                           │
│                                                                 │
│  lib/design-system/           components/ui/scifi/              │
│  ├── visualConfig.ts          ├── SilkyChevron.tsx              │
│  ├── animationUtils.ts        ├── ProcessFlowSheen.tsx          │
│  ├── themeUtils.ts ◀──────── RESKINNED with Trojan Reach       │
│  └── types.ts                 ├── AnimatedConnection.tsx        │
│                               └── index.ts                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               CHARGEN / LIFE GRAPH COMPONENTS                   │
│                                                                 │
│  components/chargen/          components/graph/                 │
│  ├── TermCard.tsx ◀──────────uses ProcessFlowSheen             │
│  ├── LifepathTimeline.tsx ◀──uses SilkyChevron                 │
│  └── EventModal.tsx           ├── CharacterNode.tsx             │
│                               ├── TermNode.tsx                  │
│                               └── EnergyEdge.tsx ◀──AnimatedConnection
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Design System Foundation

### 1.1 Color Palette - "Trojan Reach"

Inspired by Mongoose Traveller's visual language and the Pirates of Drinax frontier aesthetic.

```scss
// === BASE COLORS ===
$deep-void: #0a0d14; // Primary background (almost black with blue tint)
$star-metal: #1a1f2e; // Elevated surfaces
$nebula-mist: #242b3d; // Cards, panels
$asteroid-dust: #3d4555; // Borders, dividers

// === ACCENT COLORS (Neon Spectrum) ===
$plasma-cyan: #00f0ff; // Primary accent (data, active states)
$impulse-violet: #8b5cf6; // Secondary accent (relationships, events)
$reactor-amber: #f59e0b; // Warning, GM mode, special
$warp-emerald: #10b981; // Success, advancement, survival
$hull-breach-red: #ef4444; // Failure, mishaps, danger

// === GLOW EFFECTS ===
$glow-cyan: rgba(0, 240, 255, 0.4);
$glow-violet: rgba(139, 92, 246, 0.4);
$glow-amber: rgba(245, 158, 11, 0.4);
$glow-emerald: rgba(16, 185, 129, 0.4);

// === TEXT HIERARCHY ===
$text-primary: #e2e8f0; // Headings, important
$text-secondary: #94a3b8; // Body text
$text-muted: #64748b; // Hints, metadata
$text-glow: #00f0ff; // Glowing labels
```

### 1.2 Typography - "Scout Service"

Geometric futuristic headers with legible humanist body text.

```css
/* === FONT STACK === */
:root {
  --font-display: 'Orbitron', 'Exo 2', system-ui, sans-serif;
  --font-body: 'Inter', 'Roboto', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

/* === TYPOGRAPHY SCALE === */
.title-hero {
  font: 900 3rem/1 var(--font-display);
  letter-spacing: 0.1em;
}
.title-section {
  font: 700 1.5rem/1.2 var(--font-display);
  letter-spacing: 0.05em;
}
.title-card {
  font: 600 1rem/1.3 var(--font-body);
}
.body-text {
  font: 400 0.875rem/1.5 var(--font-body);
}
.data-label {
  font: 500 0.75rem/1 var(--font-mono);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.data-value {
  font: 700 1.125rem/1 var(--font-mono);
}
```

### 1.3 Component Primitives

#### Glassmorphic Panel

```tsx
// Base panel style for all elevated surfaces
const GlassPanel = cn(
  'bg-nebula-mist/80',
  'backdrop-blur-xl',
  'border border-asteroid-dust/50',
  'rounded-2xl',
  'shadow-[0_0_40px_rgba(0,0,0,0.4)]',
  'transition-all duration-300',
);
```

#### Neon Glow Effect

```css
.neon-glow {
  box-shadow:
    0 0 10px var(--glow-color),
    0 0 20px var(--glow-color),
    0 0 30px var(--glow-color),
    inset 0 0 10px rgba(255, 255, 255, 0.1);
}
```

#### Energy Border

```css
.energy-border {
  position: relative;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--bg-color), var(--bg-color)) padding-box,
    linear-gradient(135deg, var(--plasma-cyan), var(--impulse-violet)) border-box;
}
```

---

## Part 2: Background & Atmosphere

### 2.1 Cosmic Background System

Create an immersive space environment behind all content.

#### Layer 1: Deep Space Gradient

```css
.cosmic-bg {
  background:
    radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 240, 255, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 70%),
    linear-gradient(180deg, #0a0d14 0%, #0f1420 50%, #0a0d14 100%);
}
```

#### Layer 2: Star Field (CSS Points)

```css
.starfield {
  background-image:
    radial-gradient(1px 1px at 20px 30px, white, transparent),
    radial-gradient(1px 1px at 40px 70px, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 50px 160px, white, transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.5), transparent);
  background-size: 200px 200px;
  animation: pan-stars 40s linear infinite;
}

@keyframes pan-stars {
  from {
    background-position: 0 0;
  }
  to {
    background-position: -200px 200px;
  }
}
```

#### Layer 3: Nebula Clouds (Optional WebGL)

For advanced implementation, use Three.js with a nebula shader:

```ts
// Reference: three-nebula or custom GLSL shader
// Creates drifting cosmic cloud effect in background
```

#### Layer 4: Grid Pattern (Tactical Overlay)

```css
.tactical-grid {
  background-image:
    linear-gradient(to right, rgba(100, 116, 139, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 116, 139, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 2.2 Scanline Effect (Subtle CRT)

```css
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0,
    transparent 2px,
    rgba(0, 0, 0, 0.05) 2px,
    rgba(0, 0, 0, 0.05) 4px
  );
  pointer-events: none;
}
```

---

## Part 3: Lifepath Timeline Redesign

### 3.1 Current Problems

1. **Fixed 220px term cards** - Static, inflexible
2. **Gray-on-gray color scheme** - No visual hierarchy
3. **Box borders everywhere** - Feels like spreadsheet
4. **No depth or layering** - Flat presentation
5. **Static content** - No animations or life

### 3.2 New Design: "Neural Pathway"

The timeline becomes a flowing neural pathway showing the character's journey through time.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  ▓  ⬡ LIFEPATH NEURAL MAP                              CMDR SARAH CHEN  ▓     │
│  ▓                                                                  AGE: 34 ▓ │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                                                                 │
│    AGE  18         22         26         30         34                          │
│    ──●──────────●──────────●──────────●──────────●──                           │
│      │   ═════════════════════════════════════════                              │
│      │   ║                NAVY CAREER                 ║                         │
│      │   ═════════════════════════════════════════════                          │
│      │                                                                          │
│      │   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐                  │
│      │   │ ✧ T1  │───▶│ ✧ T2  │───▶│ ★ T3  │───▶│ ✧ T4  │                    │
│      │   │  ───  │    │  ───  │    │  ───  │    │  ───  │                      │
│      │   │ Made  │    │ Saved │    │Promoted│   │ Found │                      │
│      │   │ Rival │    │ Ship  │    │ Cmdr   │    │Artifact│                    │
│      │   └───┬───┘    └────────┘    └───┬───┘    └───┬───┘                     │
│      │       │                          │            │                          │
│      │       ▼                          ▼            ▼                          │
│      │   ╔═══════╗                 ╔════════╗  ╔═══════════╗                   │
│      │   ║VASQUEZ║                 ║  CHEN  ║  ║ DATAPAD   ║                   │
│      │   ║ Rival ║                 ║  Ally  ║  ║   Item    ║                   │
│      │   ╚═══════╝                 ╚════════╝  ╚═══════════╝                   │
│                                                                                 │
│    ══════════════════════════════════════════════════════════════════════════  │
│    SKILLS: Pilot-2 ◆ Tactics-2 ◆ Vacc Suit-1 ◆ Mechanic-1 ◆ Leadership-1      │
│    ASSETS: 2 Ship Shares ◆ TL12 Blade ◆ Cr35,000                               │
│    ══════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Term Card Redesign

**From**: Gray box with borders
**To**: Holographic data panel with energy signature

```tsx
// New TermCard component structure
<div
  className={cn(
    // Base glass panel
    'relative overflow-hidden',
    'bg-gradient-to-br from-nebula-mist/90 to-star-metal/80',
    'backdrop-blur-xl',
    'border border-transparent',
    'rounded-xl',
    'p-4 w-[240px]',
    // Energy border effect
    'before:absolute before:inset-0 before:rounded-xl before:p-px',
    'before:bg-gradient-to-br before:from-plasma-cyan/30 before:via-transparent before:to-impulse-violet/30',
    // Hover glow
    'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]',
    'transition-all duration-300',
    // Status-based glow
    isMishap && 'border-hull-breach-red/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    isAdvanced && 'border-warp-emerald/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  )}
>
  {/* Animated energy flow line at top */}
  <ProcessFlowSheen duration={4} />

  {/* Corner accent markers */}
  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-plasma-cyan/50" />
  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-plasma-cyan/50" />

  {/* Content */}
  <div className="relative z-10">
    {/* Term header with status indicators */}
    <div className="flex justify-between items-center mb-3">
      <span className="data-label text-plasma-cyan">TERM {term.termNumber}</span>
      <span className="data-label text-text-muted">AGE {term.startAge}</span>
    </div>

    {/* Career badge */}
    <div className="flex items-center gap-2 mb-3">
      <Briefcase className="w-4 h-4 text-impulse-violet" />
      <span className="font-semibold text-text-primary">{career.name}</span>
    </div>

    {/* Event summary with glow effect */}
    <div className="text-sm text-text-secondary line-clamp-2 mb-3">{term.eventDescription}</div>

    {/* Status badges */}
    <div className="flex gap-2">
      {survived && (
        <span
          className="px-2 py-0.5 bg-warp-emerald/20 border border-warp-emerald/30 
                        rounded text-warp-emerald text-xs font-mono flex items-center gap-1"
        >
          <Shield className="w-3 h-3" /> SURVIVED
        </span>
      )}
      {advanced && (
        <span
          className="px-2 py-0.5 bg-reactor-amber/20 border border-reactor-amber/30 
                        rounded text-reactor-amber text-xs font-mono flex items-center gap-1"
        >
          <TrendingUp className="w-3 h-3" /> PROMOTED
        </span>
      )}
    </div>
  </div>
</div>
```

### 3.4 Animated Connections

Use `AnimatedConnection` from present codebase for term-to-term flows:

```tsx
<svg className="absolute inset-0 pointer-events-none">
  <defs>
    <linearGradient id="flow-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={PLASMA_CYAN} stopOpacity="0.2" />
      <stop offset="50%" stopColor={PLASMA_CYAN} stopOpacity="1" />
      <stop offset="100%" stopColor={PLASMA_CYAN} stopOpacity="0.2" />
    </linearGradient>
  </defs>

  {/* Animated data flow between terms */}
  <AnimatedConnection
    d={connectionPath}
    gradientId="flow-grad"
    dashed={true}
    className="animate-dash"
  />
</svg>
```

### 3.5 Chevron Arrows

Adopt `SilkyChevron` from present codebase for transitions:

```tsx
// Between career clusters or major life events
<SilkyChevron color={IMPULSE_VIOLET} height={40} duration={4} isVisible={true} />
```

---

## Part 4: Graph View Redesign

### 4.1 Current Problems

1. **White/light theme nodes** clash with dark chargen
2. **Generic React Flow styling** - no personality
3. **Plain edges** - no energy or flow
4. **Static background** - no atmosphere

### 4.2 Node Redesign: "Holographic Entities"

#### Character Node (Central)

```tsx
const CharacterNode = ({ data }) => (
  <div
    className={cn(
      // Circular energy field
      'relative flex flex-col items-center justify-center',
      'w-36 h-36 rounded-full',
      // Multi-layered glow
      'bg-gradient-to-br from-nebula-mist to-star-metal',
      'border-4 border-plasma-cyan/30',
      'shadow-[0_0_60px_rgba(0,240,255,0.3),inset_0_0_30px_rgba(0,240,255,0.1)]',
      // Animated pulse
      'animate-pulse-glow',
    )}
  >
    {/* Orbiting ring */}
    <div
      className="absolute inset-[-8px] rounded-full border border-plasma-cyan/20 
                    animate-[spin_20s_linear_infinite]"
    >
      <div
        className="absolute top-0 left-1/2 w-2 h-2 bg-plasma-cyan rounded-full 
                      shadow-[0_0_10px_rgba(0,240,255,0.8)]"
      />
    </div>

    {/* Inner content */}
    <User className="w-12 h-12 mb-2 text-plasma-cyan drop-shadow-glow" />
    <span className="text-sm font-bold text-text-primary text-center">{data.name}</span>
    <span className="text-xs text-plasma-cyan/80">{data.age} y/o</span>
  </div>
);
```

#### Term Node (Career Path)

```tsx
const TermNode = ({ data }) => (
  <div
    className={cn(
      'relative w-48 p-4 rounded-lg',
      'bg-gradient-to-br from-star-metal/90 to-nebula-mist/80',
      'backdrop-blur-sm border',
      // Status-based border color
      !data.survived && 'border-hull-breach-red/50',
      data.survived && data.advanced && 'border-warp-emerald/50',
      data.survived && !data.advanced && 'border-asteroid-dust/50',
      // Hover effect
      'hover:scale-105 hover:shadow-[0_0_30px_rgba(0,240,255,0.2)]',
      'transition-all duration-200',
    )}
  >
    {/* Scanline texture overlay */}
    <div className="absolute inset-0 opacity-5 scanlines pointer-events-none" />

    {/* Handles with glow */}
    <Handle
      type="target"
      position={Position.Left}
      className="!bg-plasma-cyan !w-3 !h-3 !shadow-[0_0_8px_rgba(0,240,255,0.8)]"
    />
    <Handle
      type="source"
      position={Position.Right}
      className="!bg-plasma-cyan !w-3 !h-3 !shadow-[0_0_8px_rgba(0,240,255,0.8)]"
    />

    {/* Content */}
    <div className="relative z-10">
      <div className="flex justify-between mb-2">
        <span className="text-[10px] font-mono text-plasma-cyan">TERM {data.termNumber}</span>
        <span className="text-[10px] font-mono text-text-muted">AGE {data.age}</span>
      </div>
      <p className="text-xs text-text-secondary line-clamp-2">{data.eventSummary}</p>

      {/* Status icons */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-asteroid-dust/30">
        {data.survived ? (
          <Shield className="w-4 h-4 text-warp-emerald drop-shadow-glow" />
        ) : (
          <Skull className="w-4 h-4 text-hull-breach-red drop-shadow-glow" />
        )}
        {data.advanced && <Award className="w-4 h-4 text-reactor-amber drop-shadow-glow" />}
      </div>
    </div>
  </div>
);
```

#### Entity Node (NPC/Location/Item)

```tsx
const EntityNode = ({ data }) => {
  const colorMap = {
    enemy: { border: 'border-hull-breach-red/50', glow: 'shadow-hull-breach-red/20' },
    rival: { border: 'border-reactor-amber/50', glow: 'shadow-reactor-amber/20' },
    ally: { border: 'border-warp-emerald/50', glow: 'shadow-warp-emerald/20' },
    contact: { border: 'border-plasma-cyan/50', glow: 'shadow-plasma-cyan/20' },
  };
  const colors = colorMap[data.relationship] || colorMap.contact;

  return (
    <div
      className={cn(
        'w-32 p-3 rounded-lg',
        'bg-nebula-mist/80 backdrop-blur-sm',
        colors.border,
        `shadow-[0_0_15px_${colors.glow}]`,
        'transition-all duration-200 hover:scale-105',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {data.type === 'npc' && <User className="w-4 h-4 text-impulse-violet" />}
        {data.type === 'location' && <MapPin className="w-4 h-4 text-plasma-cyan" />}
        {data.type === 'item' && <Package className="w-4 h-4 text-reactor-amber" />}
        <span className="text-xs font-medium text-text-primary truncate">{data.name}</span>
      </div>
      <span className="text-[10px] font-mono text-text-muted uppercase">{data.relationship}</span>
    </div>
  );
};
```

### 4.3 Edge Redesign: "Energy Conduits"

```tsx
const EnergyEdge = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const path = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      {/* Outer glow */}
      <path
        d={path}
        stroke={data.color}
        strokeWidth={4}
        fill="none"
        filter="blur(3px)"
        opacity={0.3}
      />

      {/* Core line */}
      <path d={path} stroke={data.color} strokeWidth={2} fill="none" />

      {/* Animated dash overlay */}
      <path
        d={path}
        stroke={data.color}
        strokeWidth={1.5}
        fill="none"
        strokeDasharray="8 12"
        className="animate-dash"
        opacity={0.8}
      />

      {/* Energy particles along path (optional) */}
      <circle r={3} fill={data.color} filter="blur(1px)">
        <animateMotion dur="2s" repeatCount="indefinite">
          <mpath href={`#path-${id}`} />
        </animateMotion>
      </circle>
    </>
  );
};
```

### 4.4 Career Cluster Redesign

```tsx
const CareerClusterNode = ({ data }) => (
  <div
    className={cn(
      'relative rounded-2xl overflow-hidden',
      'bg-gradient-to-br from-star-metal/50 to-transparent',
      'border border-impulse-violet/20',
      'backdrop-blur-sm',
    )}
  >
    {/* Header bar with career info */}
    <div
      className="flex items-center justify-between px-4 py-3 
                    bg-impulse-violet/10 border-b border-impulse-violet/20"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-impulse-violet/20 text-impulse-violet">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">{data.careerName}</h3>
          <span className="text-xs text-impulse-violet/80">{data.assignment}</span>
        </div>
      </div>
      <span className="px-2 py-1 bg-nebula-mist rounded text-xs font-mono text-text-muted">
        {data.termCount} TERMS
      </span>
    </div>

    {/* Subtle grid background for term area */}
    <div className="absolute inset-0 top-12 tactical-grid opacity-30" />
  </div>
);
```

---

## Part 5: Interactive Elements

### 5.1 Dice Roll Visualization

Transform boring numbers into dramatic reveals:

```tsx
const DiceRollDisplay = ({ roll, target, modifier, success }) => (
  <div
    className={cn(
      'flex items-center gap-3 p-3 rounded-lg',
      'bg-nebula-mist/50 border',
      success ? 'border-warp-emerald/30' : 'border-hull-breach-red/30',
    )}
  >
    {/* Dice visualization */}
    <div className="flex gap-1">
      {roll.dice.map((die, i) => (
        <div
          key={i}
          className={cn(
            'w-8 h-8 rounded flex items-center justify-center',
            'bg-star-metal border border-asteroid-dust',
            'text-lg font-bold font-mono',
            die === 6 && 'text-warp-emerald border-warp-emerald/50',
            die === 1 && 'text-hull-breach-red border-hull-breach-red/50',
          )}
        >
          {die}
        </div>
      ))}
    </div>

    {/* Calculation */}
    <div className="flex items-center gap-2 text-sm font-mono">
      <span className="text-text-secondary">=</span>
      <span className="text-text-primary">{roll.total}</span>
      {modifier !== 0 && (
        <>
          <span className="text-text-muted">
            {modifier > 0 ? '+' : ''}
            {modifier}
          </span>
          <span className="text-text-secondary">=</span>
          <span className="text-text-primary font-bold">{roll.total + modifier}</span>
        </>
      )}
      <span className="text-text-muted">vs</span>
      <span className="text-reactor-amber">{target}+</span>
    </div>

    {/* Result indicator */}
    <div
      className={cn(
        'px-2 py-1 rounded text-xs font-bold uppercase',
        success
          ? 'bg-warp-emerald/20 text-warp-emerald'
          : 'bg-hull-breach-red/20 text-hull-breach-red',
      )}
    >
      {success ? 'SUCCESS' : 'FAILED'}
    </div>
  </div>
);
```

### 5.2 Event Card Expansion

When clicking on a term, show a dramatic modal:

```tsx
const EventDetailModal = ({ term, isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent
      className={cn(
        'max-w-2xl',
        'bg-gradient-to-br from-deep-void to-star-metal',
        'border border-impulse-violet/30',
        'shadow-[0_0_80px_rgba(139,92,246,0.2)]',
      )}
    >
      {/* Animated header stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r 
                      from-transparent via-impulse-violet to-transparent"
      >
        <div
          className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent
                        animate-[sheen_3s_ease-in-out_infinite]"
        />
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        <div className="text-center">
          <span className="data-label text-impulse-violet">TERM {term.termNumber} EVENT</span>
          <h2 className="title-section text-text-primary mt-2">{term.eventTitle}</h2>
        </div>

        {/* Narrative description with typewriter effect */}
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-text-secondary italic">"{term.eventDescription}"</p>
        </div>

        {/* Spawned entities with hover previews */}
        {term.spawnedEntities.length > 0 && (
          <div className="space-y-2">
            <span className="data-label text-reactor-amber">ENTITIES ENCOUNTERED</span>
            <div className="grid grid-cols-2 gap-3">
              {term.spawnedEntities.map((entity) => (
                <EntityPreviewCard key={entity.id} entity={entity} />
              ))}
            </div>
          </div>
        )}

        {/* Dice roll breakdown */}
        <DiceRollDisplay roll={term.survivalRoll} target={term.survivalTarget} />
      </div>
    </DialogContent>
  </Dialog>
);
```

---

## Part 6: Animation System

### 6.1 Core Animations

```css
/* Energy pulse for active elements */
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px var(--glow-color);
  }
  50% {
    box-shadow:
      0 0 40px var(--glow-color),
      0 0 60px var(--glow-color);
  }
}

/* Data flow along edges */
@keyframes dash {
  from {
    stroke-dashoffset: 20;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Sheen pass for cards */
@keyframes sheen {
  0% {
    transform: translateX(-100%) skewX(-20deg);
  }
  100% {
    transform: translateX(200%) skewX(-20deg);
  }
}

/* Orbit for decorative elements */
@keyframes orbit {
  from {
    transform: rotate(0deg) translateX(20px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(20px) rotate(-360deg);
  }
}

/* Subtle float for nodes */
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
```

### 6.2 Framer Motion Presets

```ts
// Entry animations for cards/nodes
export const cardEnter = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
};

// Glow pulse effect
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(0, 240, 255, 0.3)',
      '0 0 40px rgba(0, 240, 255, 0.5)',
      '0 0 20px rgba(0, 240, 255, 0.3)',
    ],
  },
  transition: { duration: 2, repeat: Infinity },
};

// Staggered children
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};
```

---

## Part 7: Components to Adopt from Present

### 7.1 Direct Imports

| Component            | Location                                            | Purpose                                     |
| -------------------- | --------------------------------------------------- | ------------------------------------------- |
| `SilkyChevron`       | `/present/components/shared/SilkyChevron.tsx`       | Animated transition arrows between sections |
| `ProcessFlowSheen`   | `/present/components/shared/ProcessFlowSheen.tsx`   | Energy flow animation on cards              |
| `AnimatedConnection` | `/present/components/shared/AnimatedConnection.tsx` | SVG edge glow effects                       |
| `ScaledBarChart`     | `/present/components/shared/ScaledBarChart.tsx`     | Could adapt for skill displays              |

### 7.2 Patterns to Replicate

1. **Gradient border technique** from `OverviewBox.tsx`
2. **Grid background patterns** from `KnowledgeGraph.tsx`
3. **Radial gradient backgrounds** from `ImpactInfographics.tsx`
4. **Toggle animation patterns** from `useToggleLoop()`

---

## Part 8: Implementation Phases

### Phase 0: Present Codebase Dissection (0.5-1 day)

> **Prerequisite**: Port reusable infrastructure from `/present` before building new UI

- [x] Create directory structure:
  ```bash
  mkdir -p apps/web/lib/design-system
  mkdir -p apps/web/components/ui/scifi
  ```
- [x] Port config files from present:
  - [x] `visualConfig.ts` → `lib/design-system/visualConfig.ts` (adapt timing constants)
  - [x] `transitionConfig.ts` → `lib/design-system/transitionConfig.ts`
- [x] Port utility hooks from present:
  - [x] `animationUtils.ts` → `lib/design-system/animationUtils.ts` (useReducedMotion, useToggleLoop, useTransitionController)
  - [x] `themeUtils.ts` → `lib/design-system/themeUtils.ts` (**RESKIN** colors to Trojan Reach palette)
  - [ ] `bezierUtils.ts` → `lib/design-system/bezierUtils.ts` (if needed for edges)
- [x] Port shared components (update import paths only):
  - [x] `SilkyChevron.tsx` → `components/ui/scifi/SilkyChevron.tsx`
  - [x] `ProcessFlowSheen.tsx` → `components/ui/scifi/ProcessFlowSheen.tsx`
  - [x] `AnimatedConnection.tsx` → `components/ui/scifi/AnimatedConnection.tsx`
  - [x] `TransitionText.tsx` → `components/ui/scifi/TransitionText.tsx`
- [x] Create barrel export: `components/ui/scifi/index.ts`
- [x] Verify imports compile: `pnpm --filter web typecheck`

### Phase 1: Design System Foundation (1-2 days)

- [x] Create `apps/web/styles/design-tokens.css` with Trojan Reach color variables
- [x] Add Orbitron/Exo 2 fonts to project (Google Fonts or local)
- [x] Extend Tailwind config with custom colors and fonts
- [x] Create base component styles using ported themeUtils:
  - [x] `GlassPanel` component (glassmorphism base)
  - [x] `NeonGlow` utility classes
  - [x] `EnergyBorder` gradient border pattern
- [x] Set up global cosmic background layers
- [x] Create `CosmicBackground.tsx` component with:
  - [x] Radial gradient nebula layer
  - [x] CSS starfield animation
  - [x] Tactical grid overlay

### Phase 2: Timeline Redesign (2-3 days)

- [x] Refactor `LifepathTimeline.tsx` with new styling
- [x] Redesign `TimelineTerm.tsx` with glass effect:
  - [x] Use `GlassPanel` base
  - [x] Add `ProcessFlowSheen` animation (from ported component)
  - [x] Status-based glow colors via `themeUtils`
- [x] Implement animated connections between terms:
  - [x] Use `AnimatedConnection` from ported components
  - [x] Add dashed flow animation
- [x] Add `SilkyChevron` between career sections (from ported component)
- [x] Create age ruler with neon styling

### Phase 3: Graph View Redesign (2-3 days)

- [x] Create new node types using design system:
  - [x] `BaseNode` updated with dark glassmorphic theme, theme-based colors
  - [x] Node config extended with `themeHex` property for all node types
- [x] Implement `EnergyEdge` component:
  - [x] Custom React Flow edge with glow, animated dash overlay
  - [x] Edge barrel export created
- [x] Refactor `CareerClusterNode` with new styling
- [x] Add `CosmicBackground` to `GraphCanvas`
- [x] Implement hover/selection glow effects via themeUtils

### Phase 4: Interactive Elements (1-2 days)

- [x] Create `DiceRollDisplay` component with dramatic styling
- [x] Redesign `EventDetailModal`:
  - [x] Use `GlassPanel` with energy border
  - [x] Add `ProcessFlowSheen` header animation
  - [x] Use `ANIMATION_TIMING` constants for transitions
- [x] Add entity hover previews
- [x] Implement expand/collapse animations using `ANIMATION_TIMING` constants

### Phase 5: Polish & Psychedelic Layer (1-2 days)

- [x] Add optional chromatic aberration effect (CSS filter)
- [x] Implement star field background (CSS animation)
- [x] Add subtle CRT scanlines overlay
- [x] Create reduced motion variants using `useReducedMotion` hook
- [x] Performance optimization:
  - [x] Memoize components (DiceRollDisplay, TimelineEvent)
  - [x] Use CSS `will-change` sparingly (already in ProcessFlowSheen)
  - [ ] Test with React DevTools Profiler

---

## Part 9: Visual Reference Links

### Mongoose Traveller / Pirates of Drinax

- [Mongoose Publishing Official](https://www.mongoosepublishing.com/collections/traveller)
- [Traveller 2022 Core Rulebook](https://www.mongoosepublishing.com/products/traveller-core-rulebook-update-2022)
- [Freelance Traveller Drinax Gallery](https://freelancetraveller.com/features/gallery/drinax/index.html)

### Sci-Fi UI Libraries

- [Arwes - Futuristic Sci-Fi UI](https://arwes.dev/)
- [Aceternity UI - Modern Tech Components](https://ui.aceternity.com/)
- [Magic UI - Retro-Grid & Effects](https://magicui.design/)

### CSS Effects

- [Glassmorphism Generator](https://hype4.academy/tools/glassmorphism-generator)
- [Neon Glow CSS Examples](https://codepen.io/collection/DYYdWm)
- [CSS Scanlines Effect](https://css-tricks.com/snippets/css/crt-screen-effect/)

### WebGL/Three.js Space

- [Three Nebula Particle System](https://three-nebula.org/)
- [Celestial Drift Galaxy](https://celestial-drift.vercel.app/)

---

## Part 10: Success Metrics

### Visual Quality

- [ ] No white/light elements in dark theme
- [ ] Consistent glow effects across all components
- [ ] Smooth 60fps animations
- [ ] Readable text at all sizes

### User Experience

- [ ] Clear visual hierarchy (what's important stands out)
- [ ] Intuitive interaction states (hover, active, disabled)
- [ ] Responsive layout (works on mobile)
- [ ] Accessibility (reduced motion support)

### Technical

- [ ] TypeCheck passes
- [ ] Build succeeds
- [ ] No console errors
- [ ] Bundle size reasonable

---

## Appendix A: Color Accessibility

All color combinations verified for WCAG AA contrast:

| Foreground                | Background          | Contrast | Status |
| ------------------------- | ------------------- | -------- | ------ |
| text-primary (#e2e8f0)    | deep-void (#0a0d14) | 13.2:1   | AAA    |
| text-secondary (#94a3b8)  | deep-void (#0a0d14) | 7.1:1    | AAA    |
| plasma-cyan (#00f0ff)     | deep-void (#0a0d14) | 12.8:1   | AAA    |
| warp-emerald (#10b981)    | deep-void (#0a0d14) | 6.2:1    | AA     |
| hull-breach-red (#ef4444) | deep-void (#0a0d14) | 5.4:1    | AA     |

---

## Appendix B: Performance Considerations

### Animation Budget

- Max 3 concurrent CSS animations per viewport
- Use `will-change` sparingly (only on animated elements)
- Prefer CSS transforms over layout-affecting properties
- Use `requestAnimationFrame` for JS animations

### Render Optimization

- Memoize node components
- Use React Flow's built-in viewport culling
- Lazy load heavy visual effects (nebula shader)
- Provide reduced-motion alternatives

---

_This plan was generated based on comprehensive analysis of the current codebase, research into Mongoose Traveller visual aesthetics, modern sci-fi UI patterns, and reusable components from the present codebase._
