# PlaneShift Chargen AAA UI Overhaul - Execution Plan

## Plan Metadata

```yaml
name: chargen-aaa-overhaul
created: 2025-01-27
status: in-progress
total_tasks: 22
estimated_phases: 5
```

---

## Phase 1: Foundation (Sequential - Blocking)

### Task 1.1: Initialize shadcn/ui

- [x] **ID**: `1.1-shadcn-init`
- **Description**: Initialize shadcn/ui in the web app with fallback for Tailwind v4 compatibility
- **File Paths**:
  - Create: `apps/web/components.json`
  - Modify: `apps/web/app/globals.css` (add shadcn CSS variables)
  - Modify: `apps/web/tailwind.config.js` (add shadcn plugin if needed)
- **Dependencies**: None
- **Fallback Plan**: If `npx shadcn@latest init` fails with Tailwind v4:
  1. Manually create `components.json` with correct paths
  2. Add shadcn CSS variables to `globals.css` manually
  3. Create `lib/utils.ts` with `cn()` helper
- **Commands**:
  ```bash
  cd apps/web
  npx shadcn@latest init --defaults --style new-york
  ```
- **Verification**:
  - [ ] `apps/web/components.json` exists
  - [ ] `apps/web/lib/utils.ts` exists with `cn()` function
  - [ ] `pnpm --filter web typecheck` passes
- **Category**: `quick`
- **Skills**: None

---

### Task 1.2: Install shadcn Components

- [x] **ID**: `1.2-shadcn-components`
- **Description**: Install core shadcn components needed for sci-fi primitives
- **File Paths**:
  - Create: `apps/web/components/ui/button.tsx`
  - Create: `apps/web/components/ui/input.tsx`
  - Create: `apps/web/components/ui/select.tsx`
  - Create: `apps/web/components/ui/badge.tsx`
  - Create: `apps/web/components/ui/tooltip.tsx`
  - Create: `apps/web/components/ui/dialog.tsx`
  - Create: `apps/web/components/ui/tabs.tsx`
  - Create: `apps/web/components/ui/label.tsx`
- **Dependencies**: `1.1-shadcn-init`
- **Commands**:
  ```bash
  cd apps/web
  npx shadcn@latest add button input select badge tooltip dialog tabs label
  ```
- **Fallback Plan**: If CLI fails, manually copy component code from shadcn/ui GitHub
- **Verification**:
  - [ ] All 8 component files exist in `apps/web/components/ui/`
  - [ ] `pnpm --filter web typecheck` passes
  - [ ] `pnpm --filter web build` passes
- **Category**: `quick`
- **Skills**: None

---

### Task 1.3: SciFi-shadcn Bridge Layer

- [x] **ID**: `1.3-bridge-layer`
- **Description**: Create bridge between shadcn CSS variables and existing design tokens
- **File Paths**:
  - Create: `apps/web/lib/design-system/shadcn-bridge.ts`
  - Modify: `apps/web/app/globals.css` (add shadcn variable mappings)
  - Modify: `apps/web/components/ui/scifi/index.ts` (export new primitives)
- **Dependencies**: `1.2-shadcn-components`
- **Implementation Details**:
  ```css
  /* Add to globals.css - Map shadcn variables to design tokens */
  :root {
    --background: var(--deep-void);
    --foreground: var(--text-primary);
    --card: var(--star-metal);
    --card-foreground: var(--text-primary);
    --popover: var(--nebula-mist);
    --popover-foreground: var(--text-primary);
    --primary: var(--plasma-cyan);
    --primary-foreground: var(--deep-void);
    --secondary: var(--impulse-violet);
    --secondary-foreground: var(--text-primary);
    --muted: var(--asteroid-dust);
    --muted-foreground: var(--text-muted);
    --accent: var(--impulse-violet);
    --accent-foreground: var(--text-primary);
    --destructive: var(--hull-breach-red);
    --destructive-foreground: var(--text-primary);
    --border: var(--asteroid-dust-50);
    --input: var(--star-metal);
    --ring: var(--plasma-cyan);
    --radius: var(--radius-lg);
  }
  ```
- **Verification**:
  - [ ] Bridge file exports utility functions
  - [ ] CSS variables map correctly
  - [ ] Shadcn components render with correct colors
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

## Phase 2: Sci-Fi Primitives (Parallel after Phase 1)

### Task 2.1: SciFiButton Component

- [x] **ID**: `2.1-scifi-button`
- **Description**: Create themed button wrapping shadcn Button
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiButton.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **Interface**:

  ```typescript
  import { ButtonProps } from '@/components/ui/button';
  import { ThemeColor } from '@/lib/design-system/types';

  interface SciFiButtonProps extends ButtonProps {
    theme?: ThemeColor; // 'cyan' | 'violet' | 'amber' | 'emerald' | 'red' | 'slate'
    glow?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  }
  ```

- **Styling Requirements**:
  - Primary: Solid theme color background, dark text, glow on hover
  - Secondary: Transparent with themed border, themed text
  - Ghost: No border, themed text on hover
  - Outline: Themed border, transparent background
  - Destructive: Red variant
  - Use CSS `:hover`, `:focus`, `:active`, `:disabled` states (NO imperative handlers)
  - Glow effect uses existing `glow-{color}` classes from globals.css
- **Verification**:
  - [ ] All variants render correctly
  - [ ] Hover/focus states work via CSS
  - [ ] Disabled state clearly visible
  - [ ] No `onMouseEnter`/`onMouseLeave` handlers
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 2.2: SciFiInput Component

- [x] **ID**: `2.2-scifi-input`
- **Description**: Create themed input with FIXED text visibility
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiInput.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **CRITICAL FIX**: Text must be visible (`text-gray-100` or `--text-primary`)
- **Styling Requirements**:
  - Background: `var(--star-metal)` with slight transparency
  - Border: `var(--asteroid-dust-50)`
  - Text: `var(--text-primary)` (#e2e8f0) - HIGH CONTRAST
  - Placeholder: `var(--text-muted)` (#64748b)
  - Focus: Themed glow ring (`ring-{theme}`)
  - Error state: Red border + glow
- **Verification**:
  - [ ] Type text in input - clearly visible
  - [ ] Focus state shows glow ring
  - [ ] Placeholder text visible but muted
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 2.3: SciFiSelect Component

- [x] **ID**: `2.3-scifi-select`
- **Description**: Create themed select dropdown
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiSelect.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **Styling Requirements**:
  - Trigger: Matches SciFiInput styling
  - Dropdown: Glassmorphic panel (`backdrop-blur-xl`, `var(--nebula-mist-80)`)
  - Options: Hover state with theme highlight
  - Selected: Theme color indicator
  - Use corner accents like GlassPanel
- **Verification**:
  - [ ] Click trigger opens dropdown
  - [ ] Options visible with hover states
  - [ ] Selected value displays correctly
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 2.4: SciFiBadge Component

- [x] **ID**: `2.4-scifi-badge`
- **Description**: Create themed badge with PROPER SPACING for skills
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiBadge.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **CRITICAL FIX**: Skills display as `"Melee 1"` not `"Melee1"`
- **Interface**:

  ```typescript
  interface SciFiBadgeProps {
    children: React.ReactNode;
    theme?: ThemeColor;
    variant?: 'default' | 'outline' | 'glow';
    size?: 'sm' | 'md' | 'lg';
  }

  // Helper for skill display
  interface SkillBadgeProps {
    skill: string;
    level: number;
    theme?: ThemeColor;
  }
  ```

- **Styling Requirements**:
  - Default: Themed background with matching text
  - Outline: Transparent with themed border
  - Glow: Default + subtle glow effect
  - Skill display: `{skill} {level}` with space
- **Verification**:
  - [ ] "Melee 1" displays with space between name and level
  - [ ] All theme colors work
  - [ ] All variants render correctly
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 2.5: SciFiCard Component

- [x] **ID**: `2.5-scifi-card`
- **Description**: Create section container extending GlassPanel
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiCard.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **Interface**:
  ```typescript
  interface SciFiCardProps {
    title?: string;
    subtitle?: string;
    theme?: ThemeColor;
    variant?: 'default' | 'elevated' | 'bordered';
    headerAction?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }
  ```
- **Styling Requirements**:
  - Extends GlassPanel with structured layout
  - Header: Title + optional action button
  - Content: Consistent padding (`p-4` or `p-6`)
  - Footer: Border-top separator, action buttons
  - Use ProcessFlowSheen for visual polish
- **Verification**:
  - [ ] Card renders with title and content
  - [ ] Footer actions align correctly
  - [ ] Theme colors apply to borders/accents
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 2.6: SciFiDialog Component

- [x] **ID**: `2.6-scifi-dialog`
- **Description**: Create themed modal dialog
- **File Paths**:
  - Create: `apps/web/components/ui/scifi/SciFiDialog.tsx`
  - Modify: `apps/web/components/ui/scifi/index.ts` (add export)
- **Dependencies**: `1.3-bridge-layer`
- **Styling Requirements**:
  - Overlay: `backdrop-blur-md` with dark tint
  - Content: GlassPanel styling, corner accents
  - Title: Orbitron font, themed color
  - Close button: X icon with glow on hover
  - Optional scanline effect overlay
- **Verification**:
  - [ ] Modal opens with blur overlay
  - [ ] Close button works
  - [ ] Theme applies correctly
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

## Phase 3: Component Fixes (Parallel after Phase 2)

### Task 3.1: Fix BackgroundStep

- [x] **ID**: `3.1-fix-background-step`
- **Description**: Refactor to use new sci-fi primitives
- **File Paths**:
  - Modify: `apps/web/components/chargen/steps/BackgroundStep.tsx`
- **Dependencies**: `2.1-scifi-button`, `2.2-scifi-input`, `2.3-scifi-select`, `2.5-scifi-card`
- **Specific Changes**:
  1. Line 140-158: Replace bespoke input with `<SciFiInput>`
  2. Line 101-117: Replace "Create New Character" button with `<SciFiButton theme="cyan" glow>`
  3. Line 164-181: Replace "Re-roll All" button with `<SciFiButton variant="secondary" theme="slate">`
  4. Line 216-237: Replace swap selects with `<SciFiSelect>` components
  5. Line 231-237: Replace "Swap" button with `<SciFiButton variant="outline">`
  6. Remove ALL `onMouseEnter`/`onMouseLeave` handlers (currently 6 instances)
  7. Use `<SciFiCard>` for section wrappers
- **Verification**:
  - [ ] Name input text is clearly visible when typing
  - [ ] All buttons have proper hover states via CSS
  - [ ] No inline style hover handlers remain
  - [ ] Build passes
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.2: Fix CharacterPreview

- [x] **ID**: `3.2-fix-character-preview`
- **Description**: Fix skills display spacing, improve layout
- **File Paths**:
  - Modify: `apps/web/components/chargen/CharacterPreview.tsx`
- **Dependencies**: `2.4-scifi-badge`
- **Specific Changes**:
  1. Line 159-177: Replace skill spans with `<SciFiBadge>` or `<SkillBadge skill={s} level={level}>`
     - CRITICAL: Must have space between skill name and level
  2. Line 91-123: Improve characteristics grid with consistent spacing
  3. Line 61-82: Use consistent icon styling for Age/Credits info
  4. Consider using Lucide icons `Calendar` and `Coins` (already imported)
- **Verification**:
  - [ ] Skills display as "Melee 1" not "Melee1"
  - [ ] Characteristics grid has even spacing
  - [ ] Icons are consistent Lucide style
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.3: Fix StepNavigation Layout

- [x] **ID**: `3.3-fix-step-navigation`
- **Description**: Fix wasted space and cramped layout
- **File Paths**:
  - Modify: `apps/web/components/chargen/StepNavigation.tsx`
- **Dependencies**: `2.1-scifi-button`
- **Specific Changes**:
  1. Line 17: REMOVE `pl-[400px]` - this is causing 400px empty space on left
  2. Restructure to center steps properly in available space
  3. Replace button styling with CSS-only approach (remove onMouseEnter/Leave)
  4. Improve step indicator sizing for better hit areas (min 44px)
- **Verification**:
  - [ ] No empty space on left side
  - [ ] Steps evenly distributed
  - [ ] Step buttons have proper hit areas
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.4: Fix CareerSelectionStep

- [x] **ID**: `3.4-fix-career-selection`
- **Description**: Replace bespoke cards and buttons with primitives
- **File Paths**:
  - Modify: `apps/web/components/chargen/steps/CareerSelectionStep.tsx`
- **Dependencies**: `2.1-scifi-button`, `2.5-scifi-card`
- **Specific Changes**:
  1. Line 242-274: Replace career card divs with `<SciFiCard>`
  2. Line 265-268: Replace "Try to Join" button with `<SciFiButton>`
  3. Line 132-180: Replace qualification result cards with themed `<SciFiCard>`
  4. Line 150-169: Replace assignment buttons with `<SciFiButton>`
  5. Line 197-223: Replace failure option buttons with `<SciFiButton>`
  6. Line 279-288: Replace Drifter button with `<SciFiButton>`
- **Verification**:
  - [ ] All cards have consistent styling
  - [ ] Buttons follow hierarchy (primary/secondary)
  - [ ] Build passes
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.5: Fix TermResolutionStep

- [x] **ID**: `3.5-fix-term-resolution`
- **Description**: Improve phase sections and button hierarchy
- **File Paths**:
  - Modify: `apps/web/components/chargen/steps/TermResolutionStep.tsx`
- **Dependencies**: `2.1-scifi-button`, `2.5-scifi-card`
- **Specific Changes**:
  1. Line 360-412: Wrap survival phase in `<SciFiCard>`, use `<SciFiButton>` for roll button
  2. Line 414-508: Wrap event phase in `<SciFiCard>`
  3. Line 510-559: Wrap skill phase in `<SciFiCard>`
  4. Line 561-598: Wrap advancement phase in `<SciFiCard>`
  5. Line 600-618: Replace continue/muster buttons with `<SciFiButton>` with proper hierarchy:
     - "Continue Career" = secondary/outline
     - "Muster Out" = primary/cyan glow
  6. Line 420-426, 544-548, 573-578: Replace all blue-600 buttons with themed `<SciFiButton>`
- **Verification**:
  - [ ] Phase sections clearly distinguished
  - [ ] Button hierarchy is clear (primary vs secondary)
  - [ ] No hardcoded colors remain
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.6: Fix MusteringOutStep

- [x] **ID**: `3.6-fix-mustering-out`
- **Description**: Replace emojis with Lucide icons, use primitives
- **File Paths**:
  - Modify: `apps/web/components/chargen/steps/MusteringOutStep.tsx`
- **Dependencies**: `2.1-scifi-button`, `2.5-scifi-card`, `2.4-scifi-badge`
- **Icon Replacements**:
  - `💰` → `<Coins className="w-6 h-6" />` (import from lucide-react)
  - `🎁` → `<Gift className="w-6 h-6" />` (import from lucide-react)
- **Specific Changes**:
  1. Line 1: Add imports `import { Coins, Gift } from 'lucide-react';`
  2. Line 159: Replace `💰` with `<Coins />`
  3. Line 168: Replace `🎁` with `<Gift />`
  4. Line 185-188: Replace emoji in result display
  5. Line 200-205: Replace emojis in benefits list
  6. Line 154-176: Wrap roll buttons in `<SciFiButton>`
  7. Line 129-228: Wrap main content in `<SciFiCard>`
  8. Line 231-248: Replace navigation buttons with `<SciFiButton>`
- **Verification**:
  - [ ] No emoji characters (💰🎁) visible anywhere
  - [ ] Lucide icons display correctly
  - [ ] Consistent button styling
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.7: Fix FinalizeStep

- [x] **ID**: `3.7-fix-finalize-step`
- **Description**: Replace emojis, improve layout with primitives
- **File Paths**:
  - Modify: `apps/web/components/chargen/steps/FinalizeStep.tsx`
- **Dependencies**: `2.1-scifi-button`, `2.2-scifi-input`, `2.4-scifi-badge`, `2.5-scifi-card`
- **Icon Replacements**:
  - `💰` → `<Coins />`
  - `🎁` → `<Gift />`
  - `🟢🔵🟠🔴⚪` → Lucide icons or themed dots
- **Specific Changes**:
  1. Add imports: `import { Coins, Gift, UserCheck, Users, UserX, Skull, Circle } from 'lucide-react';`
  2. Line 24-29: Replace RELATIONSHIP_ICONS emoji object with Lucide components:
     ```typescript
     const RELATIONSHIP_ICONS: Record<string, React.ReactNode> = {
       ally: <UserCheck className="w-4 h-4 text-emerald-400" />,
       contact: <Users className="w-4 h-4 text-cyan-400" />,
       rival: <UserX className="w-4 h-4 text-amber-400" />,
       enemy: <Skull className="w-4 h-4 text-red-400" />,
     };
     ```
  3. Line 98-116: Replace bespoke input with `<SciFiInput>`
  4. Line 159-170: Replace skill spans with `<SciFiBadge>`
  5. Line 202-209: Replace emoji icons in benefits section
  6. Line 257-283: Replace buttons with `<SciFiButton>`
- **Verification**:
  - [ ] No emoji characters visible
  - [ ] Name input text clearly visible
  - [ ] Skills display with proper spacing
  - [ ] Relationship icons are Lucide components
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 3.8: Fix VerbositySelector

- [x] **ID**: `3.8-fix-verbosity-selector`
- **Description**: Align with sci-fi theme
- **File Paths**:
  - Modify: `apps/web/components/chargen/VerbositySelector.tsx`
- **Dependencies**: `2.1-scifi-button`
- **Specific Changes**:
  1. Replace bespoke button styling with `<SciFiButton>` or custom radio group
  2. Replace `bg-blue-600` with theme colors (violet for AI features)
  3. Use consistent border/glow styling
  4. Consider using tabs-like component for selection
- **Theme Alignment**:
  - Selected: `theme="violet"` with glow
  - Unselected: `variant="ghost"` or `variant="outline"`
- **Verification**:
  - [ ] Selector uses violet theme (AI-related)
  - [ ] Selection state clearly visible
  - [ ] Matches overall chargen aesthetic
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

## Phase 4: Layout Overhaul (After 3.3)

### Task 4.1: ChargenWizard Layout Overhaul

- [x] **ID**: `4.1-wizard-layout`
- **Description**: Better use of vertical space, fix proportions
- **File Paths**:
  - Modify: `apps/web/components/chargen/ChargenWizard.tsx`
- **Dependencies**: `3.3-fix-step-navigation`
- **Specific Changes**:
  1. Line 179-291: Restructure layout to use full viewport height
  2. Line 194: Adjust grid columns - consider `lg:grid-cols-[280px_1fr_320px]` for fixed sidebars
  3. Line 180-192: Fix header layout - move VerbositySelector alignment
  4. Line 204-207: Ensure step content area expands to fill available space
  5. Line 209-276: Replace inline style buttons with `<SciFiButton>` components
  6. Remove all `onMouseEnter`/`onMouseLeave` handlers (lines 229-240, 261-272)
- **Layout Goals**:
  - Navigation bar: Compact, centered
  - Left sidebar (Participants): Fixed width, full height
  - Main content: Flexible, fills remaining space
  - Right sidebar (Preview + Entities): Fixed width, scrollable
  - Footer buttons: Sticky at bottom of main content
- **Verification**:
  - [ ] Content fills viewport (no 50% empty space)
  - [ ] Sidebars are proportional
  - [ ] Navigation centered properly
  - [ ] No inline hover handlers remain
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 4.2: Button Hierarchy Refinement

- [x] **ID**: `4.2-button-hierarchy`
- **Description**: Establish clear visual hierarchy across all buttons
- **File Paths**:
  - Audit all: `apps/web/components/chargen/**/*.tsx`
- **Dependencies**: `4.1-wizard-layout`, all Phase 3 tasks
- **Hierarchy Definition**:
  | Level | Usage | Style |
  |-------|-------|-------|
  | Primary | Main action per screen | `<SciFiButton theme="cyan" glow>` |
  | Secondary | Alternative actions | `<SciFiButton variant="outline" theme="violet">` |
  | Tertiary | Minor/back actions | `<SciFiButton variant="ghost" theme="slate">` |
  | Destructive | Dangerous actions | `<SciFiButton variant="destructive">` |
- **Button Assignments**:
  - "Continue →", "Create Character" = Primary
  - "← Back", "Choose Different Career" = Tertiary
  - "Roll Survival", "Roll Event", etc. = Secondary (action but not navigation)
  - "Accept Mishap & Leave" = Destructive
- **Verification**:
  - [ ] Exactly ONE primary button visible per screen
  - [ ] Clear visual distinction between levels
  - [ ] Consistent across all steps
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

## Phase 5: Verification & Polish (Final)

### Task 5.1: Visual Testing Pass

- [x] **ID**: `5.1-visual-testing`
- **Description**: Full walkthrough with screenshots
- **File Paths**: N/A (testing only)
- **Dependencies**: All Phase 3 and Phase 4 tasks
- **Testing Checklist**:
  1. Navigate to http://localhost:3010/chargen
  2. Screenshot: Initial state (no character)
  3. Click "Create New Character"
  4. Screenshot: BackgroundStep with empty form
  5. Fill in name, verify text visibility
  6. Screenshot: Characteristics grid
  7. Select 3 background skills
  8. Screenshot: Skills with proper spacing
  9. Continue to CareerSelection
  10. Screenshot: Career cards grid
  11. Select a career, screenshot qualification result
  12. Continue through term resolution
  13. Screenshot each phase (Survival, Event, Skill, Advancement)
  14. Continue to Mustering Out
  15. Screenshot: Benefits screen (verify no emojis)
  16. Complete and screenshot Finalize step
- **Evidence Location**: `.sisyphus/evidence/chargen-aaa-overhaul/`
- **Verification**:
  - [ ] All screenshots captured
  - [ ] No visual regressions
  - [ ] No console errors
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`, `playwright`

---

### Task 5.2: Accessibility Audit

- [x] **ID**: `5.2-accessibility`
- **Description**: Verify contrast, hit areas, focus states
- **File Paths**: N/A (audit only)
- **Dependencies**: `5.1-visual-testing`
- **Audit Checklist**:
  1. **Contrast Ratios**:
     - Text on dark backgrounds ≥ 4.5:1 (AA)
     - Input text clearly visible
     - Placeholder text distinguishable
  2. **Focus Indicators**:
     - All interactive elements show focus ring
     - Focus ring uses theme glow effect
     - Tab order is logical
  3. **Hit Areas**:
     - Buttons ≥ 44x44px touch target
     - Skill badges clickable if interactive
     - Step navigation buttons adequate size
  4. **ARIA**:
     - Form inputs have labels
     - Buttons have accessible names
     - Modals have proper role and focus trap
- **Verification**:
  - [ ] No critical contrast failures
  - [ ] All interactive elements focusable
  - [ ] Hit areas meet minimum size
- **Category**: `visual-engineering`
- **Skills**: `frontend-ui-ux`

---

### Task 5.3: Build & Typecheck Verification

- [x] **ID**: `5.3-build-verify`
- **Description**: Final build verification
- **File Paths**: N/A (verification only)
- **Dependencies**: `5.2-accessibility`
- **Commands**:
  ```bash
  pnpm --filter web typecheck
  pnpm --filter web build
  pnpm --filter web lint
  ```
- **Verification**:
  - [ ] `typecheck` exits 0
  - [ ] `build` exits 0
  - [ ] `lint` exits 0 (or only pre-existing warnings)
  - [ ] No new TypeScript errors introduced
- **Category**: `quick`
- **Skills**: None

---

## Dependency Graph

```
PHASE 1 (Sequential):
  1.1 ─► 1.2 ─► 1.3

PHASE 2 (Parallel after 1.3):
  1.3 ─┬─► 2.1 (SciFiButton)
       ├─► 2.2 (SciFiInput)
       ├─► 2.3 (SciFiSelect)
       ├─► 2.4 (SciFiBadge)
       ├─► 2.5 (SciFiCard)
       └─► 2.6 (SciFiDialog)

PHASE 3 (Parallel, dependencies noted):
  2.1 + 2.2 + 2.3 + 2.5 ─► 3.1 (BackgroundStep)
  2.4 ─► 3.2 (CharacterPreview)
  2.1 ─► 3.3 (StepNavigation)
  2.1 + 2.5 ─► 3.4 (CareerSelection)
  2.1 + 2.5 ─► 3.5 (TermResolution)
  2.1 + 2.4 + 2.5 ─► 3.6 (MusteringOut)
  2.1 + 2.2 + 2.4 + 2.5 ─► 3.7 (FinalizeStep)
  2.1 ─► 3.8 (VerbositySelector)

PHASE 4 (After 3.3):
  3.3 ─► 4.1 (WizardLayout) ─► 4.2 (ButtonHierarchy)

PHASE 5 (After all Phase 3 + 4):
  All Phase 3 + 4.2 ─► 5.1 (VisualTesting) ─► 5.2 (Accessibility) ─► 5.3 (BuildVerify)
```

---

## Code Patterns Reference

### Icon Replacement Map

| Emoji | Lucide Import | Usage                |
| ----- | ------------- | -------------------- |
| 💰    | `Coins`       | Cash/credits         |
| 🎁    | `Gift`        | Benefits             |
| 🟢    | `UserCheck`   | Ally relationship    |
| 🔵    | `Users`       | Contact relationship |
| 🟠    | `UserX`       | Rival relationship   |
| 🔴    | `Skull`       | Enemy relationship   |
| ⚪    | `Circle`      | Unknown/default      |
| ✓     | `Check`       | Success state        |
| ✗     | `X`           | Failure state        |

### Button Hierarchy Pattern

```typescript
// Primary action (one per screen)
<SciFiButton theme="cyan" glow>
  Continue →
</SciFiButton>

// Secondary action
<SciFiButton variant="outline" theme="violet">
  Roll Survival
</SciFiButton>

// Tertiary/back action
<SciFiButton variant="ghost" theme="slate">
  ← Back
</SciFiButton>

// Destructive action
<SciFiButton variant="destructive">
  Accept Mishap & Leave Career
</SciFiButton>
```

### Skill Badge Pattern

```typescript
// In SciFiBadge.tsx
export function SkillBadge({ skill, level, theme = 'emerald' }: SkillBadgeProps) {
  return (
    <SciFiBadge theme={theme} size="sm">
      {skill} {level}  {/* Note the space! */}
    </SciFiBadge>
  );
}
```

---

## Success Criteria Summary

| Criterion                 | Metric                                       |
| ------------------------- | -------------------------------------------- |
| AAA Game Quality          | Visual inspection passes, no "web app" feel  |
| Consistent Design         | All components use shared primitives         |
| shadcn Integration        | 8+ shadcn components installed and wrapped   |
| No Spacing Issues         | Skills display `"Skill N"` not `"SkillN"`    |
| Typography Hierarchy      | Clear visual distinction between elements    |
| Interactive States        | All hover/focus/active/disabled work via CSS |
| No Accessibility Failures | Contrast ≥ 4.5:1, hit areas ≥ 44px           |
| Build Passes              | `typecheck` and `build` exit 0               |
| No Emojis                 | All replaced with Lucide icons               |
| No Imperative Hover       | Zero `onMouseEnter`/`onMouseLeave` handlers  |
