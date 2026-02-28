# Chargen UI Polish Plan

> **Status**: 🔄 PENDING
> **Created**: 2025-01-XX
> **Prerequisite**: chargen-ui-redesign.md (Phase 0 complete)
> **Goal**: Transform functional-but-flat UI into visually stunning sci-fi experience

---

## Executive Summary

Phase 0 of the UI redesign was executed with `category="quick"` (Claude Sonnet) instead of the optimal `category="visual-engineering"` (Gemini 3 Pro). The result is a **functional but visually underwhelming** implementation:

- ✅ Design system infrastructure exists and works
- ✅ Components use the correct primitives (GlassPanel, ProcessFlowSheen, etc.)
- ⚠️ Styling is inconsistent (mixed inline styles, CSS vars, THEME_HEX)
- ⚠️ "Wow factor" effects exist in primitives but aren't fully utilized
- ⚠️ TYPOGRAPHY constants defined but not applied
- ⚠️ Glow effects too muted, animations too subtle
- ❌ Graph nodes still look flat/corporate rather than sci-fi
- ❌ Timeline lacks drama and energy

---

## Part 1: Current State Audit

### 1.1 What's Working Well ✅

| Asset            | Location                                   | Status                                |
| ---------------- | ------------------------------------------ | ------------------------------------- |
| Color palette    | `lib/design-system/themeUtils.ts`          | Trojan Reach colors correctly defined |
| Animation hooks  | `lib/design-system/animationUtils.ts`      | useReducedMotion, useToggleLoop work  |
| GlassPanel       | `components/ui/scifi/GlassPanel.tsx`       | Glassmorphism with variants           |
| CosmicBackground | `components/ui/scifi/CosmicBackground.tsx` | Nebula + starfield + grid             |
| ProcessFlowSheen | `components/ui/scifi/ProcessFlowSheen.tsx` | Sheen animation works                 |
| SilkyChevron     | `components/ui/scifi/SilkyChevron.tsx`     | Animated chevron works                |
| CSS Variables    | `app/design-tokens.css`                    | All tokens defined                    |
| Tailwind Config  | `tailwind.config.js`                       | Custom colors, fonts, keyframes       |
| EnergyEdge       | `components/graph/edges/EnergyEdge.tsx`    | Glow + dash animation                 |

### 1.2 What Needs Enhancement ⚠️

| Component              | Issue                                                  | Impact |
| ---------------------- | ------------------------------------------------------ | ------ |
| `LifepathTimeline.tsx` | Styling inconsistent (inline + CSS vars mixed)         | Medium |
| `TimelineTerm.tsx`     | Uses GlassPanel but still gray-heavy, lacks energy     | High   |
| `BaseNode.tsx`         | Basic glassmorphism, missing orbiting ring, muted glow | High   |
| `GraphCanvas.tsx`      | Only CosmicBackground added, needs more polish         | Medium |
| `ChargenWizard.tsx`    | Still uses legacy zinc styling                         | Low    |
| `CharacterPreview.tsx` | Still uses legacy zinc styling                         | Low    |
| `TermDetailCard.tsx`   | Better than others but could be more dramatic          | Medium |

### 1.3 Styling Inconsistencies Found

**Problem**: Components mix three different styling approaches:

```tsx
// 1. Inline styles with hardcoded values (BAD)
style={{ background: 'rgba(36, 43, 61, 0.9)' }}

// 2. CSS variables (GOOD)
style={{ background: 'var(--star-metal)' }}

// 3. THEME_HEX lookups (ACCEPTABLE for SVG/computed)
style={{ color: THEME_HEX.cyan }}
```

**Solution**: Standardize on CSS variables for static values, THEME_HEX for dynamic/computed values only.

### 1.4 Missing Visual Elements

From the original plan that weren't implemented:

1. **Chromatic aberration on headings** - Plan specified, not applied
2. **Orbiting ring effect on CharacterNode** - Plan specified, not implemented
3. **Corner accent markers on term cards** - Plan specified, not implemented
4. **Energy border gradient** - Plan specified, partially implemented
5. **More prominent glow on node selection** - Current glow is too subtle
6. **Starfield animation speed** - Too slow to notice

---

## Part 2: Polish Tasks

### Task 1: Standardize Styling Approach (Foundation)

**Priority**: HIGH  
**Files**: All component files  
**Agent**: `category="quick"` (simple refactor)

Replace hardcoded colors with CSS variables:

```tsx
// BEFORE
background: 'rgba(36, 43, 61, 0.9)';
borderColor: 'rgba(61, 69, 85, 0.5)';

// AFTER
background: 'var(--nebula-mist)';
borderColor: 'var(--asteroid-dust)';
```

### Task 2: Enhance BaseNode with Dramatic Effects

**Priority**: HIGH  
**Files**: `components/graph/nodes/BaseNode.tsx`  
**Agent**: `category="visual-engineering"` or `load_skills=["frontend-ui-ux"]`

Current state:

- Basic glassmorphism ✅
- Theme-based colors ✅
- Hover/selection states ✅
- Missing: Orbiting ring, dramatic selection glow, subtle float animation

Enhancements needed:

1. Add orbiting ring effect on selected state (from plan Part 4.2):
   ```tsx
   {
     /* Orbiting ring - only on selected */
   }
   {
     selected && (
       <div
         className="absolute inset-[-8px] rounded-lg border border-plasma-cyan/20 
                     animate-[spin_20s_linear_infinite]"
       >
         <div
           className="absolute top-0 left-1/2 w-2 h-2 bg-plasma-cyan rounded-full 
                       shadow-[0_0_10px_rgba(0,240,255,0.8)]"
         />
       </div>
     );
   }
   ```
2. Increase selection glow intensity (currently `40` opacity, should be `60-80`)
3. Add subtle float animation on hover
4. Add scanline texture overlay (very subtle)

### Task 3: Enhance TimelineTerm with Energy Effects

**Priority**: HIGH  
**Files**: `components/chargen/TimelineTerm.tsx`  
**Agent**: `category="visual-engineering"` or `load_skills=["frontend-ui-ux"]`

Current state:

- Uses GlassPanel ✅
- Has ProcessFlowSheen ✅
- Missing: Corner accents, energy border, dramatic status indicators

Enhancements needed:

1. Add corner accent markers (from plan Part 3.3):
   ```tsx
   {/* Corner accent markers */}
   <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-plasma-cyan/50" />
   <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-plasma-cyan/50" />
   ```
2. Implement energy border gradient effect
3. Make status badges (SURVIVED, PROMOTED) more prominent with glow
4. Add subtle pulse animation on mishap/injury cards

### Task 4: Apply TYPOGRAPHY Constants

**Priority**: MEDIUM  
**Files**: Multiple components  
**Agent**: `category="quick"` (find-replace pattern)

The `TYPOGRAPHY` object in `themeUtils.ts` defines:

```ts
export const TYPOGRAPHY = {
  body: "font-['Inter'] text-lg md:text-xl font-light leading-relaxed tracking-wide",
  secondary: "font-['Inter'] text-base md:text-lg font-light leading-relaxed",
  label: "font-['Inter'] text-[10px] md:text-xs font-bold uppercase tracking-[0.15em]",
  micro: "font-['Inter'] text-[9px] font-bold uppercase tracking-widest",
  heading:
    "font-['Orbitron'] text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight drop-shadow-2xl",
  subheading: "font-['Orbitron'] text-xl md:text-2xl lg:text-3xl font-light tracking-wide",
  data: "font-['JetBrains_Mono'] text-sm tracking-wider",
};
```

But components still use inline font specs like:

```tsx
className = 'text-lg font-bold'; // Should use TYPOGRAPHY.subheading or custom
className = 'text-xs font-mono'; // Should use TYPOGRAPHY.data
```

Apply consistently across:

- `LifepathTimeline.tsx` - header, age ruler, footer
- `TimelineTerm.tsx` - term number, career name, status
- `TermDetailCard.tsx` - section headers, dice results
- `BaseNode.tsx` - label, description

### Task 5: Amplify Glow Effects

**Priority**: MEDIUM  
**Files**: `globals.css`, multiple components  
**Agent**: `category="visual-engineering"`

Current glow values are too subtle. Increase intensity:

```css
/* BEFORE */
box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);

/* AFTER */
box-shadow:
  0 0 15px rgba(0, 240, 255, 0.4),
  0 0 30px rgba(0, 240, 255, 0.2),
  0 0 45px rgba(0, 240, 255, 0.1);
```

Apply to:

- Node selection state
- Active timeline term
- Header text glow
- Button hover states

### Task 6: Add Chromatic Aberration to Key Headings

**Priority**: LOW (polish)  
**Files**: `globals.css`, specific headings  
**Agent**: `category="visual-engineering"`

From plan - add subtle RGB split effect:

```css
.chromatic-heading {
  text-shadow:
    -2px 0 rgba(255, 0, 0, 0.5),
    2px 0 rgba(0, 255, 255, 0.5);
}
```

Apply to:

- Main page titles
- "LIFEPATH" header
- Character name display

### Task 7: Enhance Graph Canvas Background

**Priority**: MEDIUM  
**Files**: `components/graph/GraphCanvas.tsx`  
**Agent**: `category="visual-engineering"`

CosmicBackground is added but could be more immersive:

1. Increase starfield animation speed (currently too slow to notice)
2. Add vignette effect at edges
3. Consider adding subtle nebula pulse animation

### Task 8: Polish LifepathTimeline Layout

**Priority**: MEDIUM  
**Files**: `components/chargen/LifepathTimeline.tsx`  
**Agent**: `category="visual-engineering"`

Current issues:

1. Age ruler could have more visual interest (tick marks, glow on current age)
2. Empty state could be more inviting
3. Footer summary could have more dramatic presentation

Enhancements:

1. Add glowing tick marks on age ruler
2. Add animated "start your journey" prompt for empty state
3. Add subtle separator effects in footer

---

## Part 3: Execution Strategy

### Recommended Agent Configuration

For ALL visual polish tasks, use:

```typescript
delegate_task({
  category: 'visual-engineering', // Gemini 3 Pro with high thinking
  load_skills: ['frontend-ui-ux'],
  prompt: '...',
  run_in_background: false,
});
```

OR for more creative/dramatic work:

```typescript
delegate_task({
  subagent_type: 'frontend-ui-ux-engineer', // Explicit agent selection
  load_skills: ['frontend-ui-ux'],
  prompt: '...',
  run_in_background: false,
});
```

### Execution Order

1. **Task 1** (Standardize styling) - Foundation, do first
2. **Task 4** (TYPOGRAPHY) - Quick win, do second
3. **Task 2** (BaseNode) - High impact, visible immediately
4. **Task 3** (TimelineTerm) - High impact, core UX
5. **Task 5** (Amplify glows) - Medium impact, systemic
6. **Task 7** (GraphCanvas) - Medium impact
7. **Task 8** (LifepathTimeline layout) - Medium impact
8. **Task 6** (Chromatic aberration) - Low priority polish

### Verification Protocol

After each task:

1. `pnpm --filter web typecheck` - Must pass
2. `pnpm --filter web build` - Must pass
3. Visual verification using Playwright:
   - Navigate to `/chargen` and `/graph` routes
   - Take before/after screenshots
   - Save to `.sisyphus/evidence/chargen-ui-polish/`

---

## Part 4: Detailed Task Prompts

### Task 2 Prompt: BaseNode Enhancement

```
You are enhancing the BaseNode component for a sci-fi TTRPG app.

FILE: /home/ezotoff/AI_projects/traveller/apps/web/components/graph/nodes/BaseNode.tsx

CURRENT STATE:
- Basic glassmorphism with backdrop blur ✅
- Theme-based colors via node-config ✅
- Hover/selection states with glow ✅
- Missing dramatic effects from design spec

REQUIREMENTS:
1. Add an orbiting ring effect that appears only when node is selected:
   - Ring should be slightly larger than the node
   - Should have a small glowing dot that orbits around it
   - Use CSS animation (spin 20s linear infinite)

2. Increase selection glow intensity:
   - Current: box-shadow with 40% opacity
   - Target: Triple-layer glow (15px at 40%, 30px at 20%, 45px at 10%)

3. Add subtle float animation on hover (not selected):
   - translateY(-3px) with ease-in-out

4. Add very subtle scanline texture overlay:
   - Use CSS repeating-linear-gradient
   - Opacity 0.02-0.03 (barely visible)

5. Use CSS variables instead of hardcoded rgba values:
   - background: 'rgba(36, 43, 61, 0.9)' → 'var(--nebula-mist)'

DESIGN REFERENCE: See Part 4.2 of .sisyphus/plans/chargen-ui-redesign.md for CharacterNode spec

CONSTRAINTS:
- Must remain performant (memoized component)
- Must work with all node types (use config.themeHex for colors)
- Must respect isLocked and isHidden states
- Import any needed keyframes from globals.css or add to tailwind.config.js
```

### Task 3 Prompt: TimelineTerm Enhancement

```
You are enhancing the TimelineTerm component for a sci-fi TTRPG app.

FILE: /home/ezotoff/AI_projects/traveller/apps/web/components/chargen/TimelineTerm.tsx

CURRENT STATE:
- Uses GlassPanel component ✅
- Has ProcessFlowSheen animation ✅
- Status badges exist but are flat
- Missing corner accents and energy border

REQUIREMENTS:
1. Add corner accent markers (all four corners):
   - Small L-shaped borders at each corner
   - Color: plasma-cyan at 50% opacity
   - Size: 4x4 or 6x6 pixels

2. Implement energy border gradient:
   - Gradient from plasma-cyan to impulse-violet
   - Should flow around the card edge
   - Use CSS border-image or pseudo-element technique

3. Make status badges more prominent:
   - Add glow effect matching the badge color
   - Increase padding slightly
   - Add subtle pulse animation on hover

4. Add mishap/injury visual indicator:
   - If term has mishap: add hull-breach-red pulse
   - Use THEME_HEX.red for the effect

5. Use TYPOGRAPHY constants for text:
   - Import TYPOGRAPHY from '@/lib/design-system/themeUtils'
   - Apply TYPOGRAPHY.label for "TERM X" header
   - Apply TYPOGRAPHY.data for age display

DESIGN REFERENCE: See Part 3.3 of .sisyphus/plans/chargen-ui-redesign.md for TermCard spec

CONSTRAINTS:
- Keep existing functionality (expand, entity click callbacks)
- Maintain responsive sizing
- Ensure ProcessFlowSheen still works properly
```

---

## Part 5: Success Criteria

### Visual Quality Checklist

- [ ] No hardcoded rgba() colors remaining in components
- [ ] TYPOGRAPHY constants applied consistently
- [ ] Glow effects visible and impactful
- [ ] Selection states clearly distinguished
- [ ] Animations smooth at 60fps
- [ ] Reduced motion preferences respected

### Technical Quality Checklist

- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` passes
- [ ] No console errors in browser
- [ ] No React warnings about invalid props
- [ ] Components remain memoized where appropriate

### User Experience Checklist

- [ ] Clear visual hierarchy (important elements stand out)
- [ ] Intuitive selection feedback
- [ ] Timeline flow is visually clear
- [ ] Graph feels immersive, not corporate
- [ ] Status indicators (survived, promoted, mishap) are instantly recognizable

---

## Appendix A: File Reference

### Core Design System

- `apps/web/lib/design-system/themeUtils.ts` - Colors, typography, theme helpers
- `apps/web/lib/design-system/animationUtils.ts` - Animation hooks
- `apps/web/lib/design-system/visualConfig.ts` - Timing constants
- `apps/web/app/design-tokens.css` - CSS custom properties
- `apps/web/app/globals.css` - Base styles, keyframes
- `apps/web/tailwind.config.js` - Tailwind extensions

### Sci-Fi Primitives

- `apps/web/components/ui/scifi/GlassPanel.tsx`
- `apps/web/components/ui/scifi/CosmicBackground.tsx`
- `apps/web/components/ui/scifi/ProcessFlowSheen.tsx`
- `apps/web/components/ui/scifi/SilkyChevron.tsx`
- `apps/web/components/ui/scifi/AnimatedConnection.tsx`
- `apps/web/components/ui/scifi/DiceRollDisplay.tsx`
- `apps/web/components/ui/scifi/EntityHoverPreview.tsx`
- `apps/web/components/ui/scifi/TransitionText.tsx`

### Target Components

- `apps/web/components/chargen/LifepathTimeline.tsx`
- `apps/web/components/chargen/TimelineTerm.tsx`
- `apps/web/components/chargen/TermDetailCard.tsx`
- `apps/web/components/graph/nodes/BaseNode.tsx`
- `apps/web/components/graph/GraphCanvas.tsx`
- `apps/web/components/graph/LifepathCluster.tsx`
- `apps/web/components/graph/CareerNode.tsx`

### CSS Variable Reference

```css
/* From design-tokens.css */
--deep-void: #0a0d14;
--star-metal: #1a1f2e;
--nebula-mist: #242b3d;
--asteroid-dust: #3d4555;
--plasma-cyan: #00f0ff;
--impulse-violet: #8b5cf6;
--reactor-amber: #f59e0b;
--warp-emerald: #10b981;
--hull-breach-red: #ef4444;
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--text-muted: #64748b;
```

---

_This plan supersedes Phase 5 (Polish & Psychedelic Layer) of the original chargen-ui-redesign.md and provides more specific, actionable tasks with correct agent configuration._
