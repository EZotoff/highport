# Chargen Visual Update Round 3 - Design System Fix

## Critical Issues Identified

### 1. Header Overlapping
- StepNavigation overlaps with page nav when combined with VerbositySelector
- Step labels positioned at `top-12` collide with content above
- No proper vertical spacing/margin from page header

### 2. Font Contrast Problems
- `THEME_HEX.slate` (#64748b) used extensively but too low contrast on dark backgrounds
- `text-zinc-400`, `text-zinc-500` are near-invisible
- Input placeholder text hard to read
- "Back to Benefits" button barely visible

### 3. Typography Not Systematic
- Mixed usage: `text-gray-100`, `text-white`, `text-zinc-100`, `text-zinc-300`, `text-zinc-400`
- No consistent hierarchy: labels, body, captions all ad-hoc
- Font families defined but not applied consistently (`font-display`, `font-body`, `font-mono`)
- Skill lists run together without proper spacing in CharacterPreview

### 4. Layout Inefficiencies
- Poor spacing in ChargenWizard grid
- CharacterPreview cramped with `p-6` but dense content
- FinalizeStep has large empty space below content
- No max-width constraints causing overly wide layouts
- Grid gaps inconsistent (`gap-2`, `gap-3`, `gap-4`, `gap-6`)

### 5. Skills and Benefits Steps Not Implemented
- Steps 2 and 3 just show placeholder "Step content coming soon..."

---

## Solution Architecture

### Phase 1: Typography System (Foundation)
Create utility classes and apply design tokens systematically.

### Phase 2: Layout/Spacing Fix
Fix header, grid layout, proper spacing scale.

### Phase 3: Contrast Fix
Replace low-contrast colors with accessible alternatives.

### Phase 4: Skills & Benefits Steps
Implement the missing step components.

---

## Wave 1: Typography System Foundation

### Task 1.1: Create Typography Utility Classes
- [x] **File:** `apps/web/app/globals.css`
- **Add utility classes for typography:**
  ```css
  /* Typography utilities using design tokens */
  .text-display { font-family: var(--font-display); }
  .text-body { font-family: var(--font-body); }
  .text-mono { font-family: var(--font-mono); }
  
  /* Text hierarchy with proper contrast */
  .text-heading { color: #f1f5f9; } /* slate-100 - high contrast */
  .text-label { color: #cbd5e1; } /* slate-300 - good contrast */
  .text-default { color: #e2e8f0; } /* slate-200 - body text */
  .text-subtle { color: #94a3b8; } /* slate-400 - secondary */
  .text-muted { color: #64748b; } /* slate-500 - least emphasis */
  
  /* Section headings - use Orbitron */
  .section-heading {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.025em;
  }
  ```

### Task 1.2: Update design-tokens.css with better text colors
- [x] **File:** `apps/web/app/design-tokens.css`
- **Add accessible text hierarchy:**
  ```css
  --text-heading: #f1f5f9;    /* For h1-h3 */
  --text-label: #cbd5e1;       /* For labels, captions */
  --text-body: #e2e8f0;        /* Default body text */
  --text-subtle: #94a3b8;      /* Secondary info */
  ```

---

## Wave 2: Header & Layout Fixes

### Task 2.1: Fix StepNavigation Overlap
- [x] **File:** `apps/web/components/chargen/StepNavigation.tsx`
- **Changes:**
  - Add `mt-4` margin-top for spacing from page nav
  - Change step label from `top-12` to `mt-2` and use flex-col properly
  - Reduce overall height to prevent overlap
  - Make responsive: hide labels on small screens

### Task 2.2: Fix ChargenWizard Layout
- [x] **File:** `apps/web/components/chargen/ChargenWizard.tsx`
- **Changes:**
  - Add proper padding to main container: `px-6 py-4`
  - Fix header row: stack on mobile, ensure no overlap
  - Ensure grid doesn't cause overflow
  - Add `gap-8` between header and content

### Task 2.3: Fix CharacterPreview Spacing
- [x] **File:** `apps/web/components/chargen/CharacterPreview.tsx`
- **Changes:**
   - Reduce padding from `p-6` to `p-4`
  - Tighten `space-y-5` to `space-y-4`
  - Use consistent gap sizes
  - Fix skills overflow with proper wrapping

---

## Wave 3: Contrast & Typography Application

### Task 3.1: Fix FinalizeStep Typography & Contrast
- [x] **File:** `apps/web/components/chargen/steps/FinalizeStep.tsx`
- **Changes:**
  - Replace `THEME_HEX.slate` with `text-label` or higher contrast
  - Use `text-heading` for section headers
  - Use `section-heading` class for h2/h3
  - Fix "Back to Benefits" button visibility

### Task 3.2: Fix BackgroundStep Typography & Contrast
- [x] **File:** `apps/web/components/chargen/steps/BackgroundStep.tsx`
- **Changes:**
  - Replace `text-zinc-400`, `text-zinc-500` with accessible alternatives
  - Use typography utility classes
  - Ensure labels are readable

### Task 3.3: Fix CharacterPreview Typography & Contrast
- [x] **File:** `apps/web/components/chargen/CharacterPreview.tsx`
- **Changes:**
   - Replace inline color styles with semantic classes
  - Fix label visibility (currently `text-[10px]` and low contrast)
  - Ensure all text passes WCAG AA (4.5:1 ratio)

### Task 3.4: Fix StepNavigation Typography
- [x] **File:** `apps/web/components/chargen/StepNavigation.tsx`
- **Changes:**
   - Use `font-display` for step labels
  - Improve contrast for inactive steps

---

## Wave 4: Skills & Benefits Steps

### Task 4.1: Create SkillsStep Component
- [x] **File:** `apps/web/components/chargen/steps/SkillsStep.tsx` (NEW)
- **Content:**
  - Display all skills from character
  - Group by level (Level 0, Level 1+)
  - Allow skill point allocation if applicable
  - Use SkillBadge component
  - Proper typography and spacing

### Task 4.2: Create BenefitsStep Component
- [x] **File:** `apps/web/components/chargen/steps/BenefitsStep.tsx` (NEW)
- **Content:**
  - Display credits
  - Display material benefits (items, ship shares, etc.)
  - Display contacts/allies/rivals from mustering out
  - Proper layout with icons (Coins, Gift, etc.)

### Task 4.3: Integrate Steps into ChargenWizard
- [x] **File:** `apps/web/components/chargen/ChargenWizard.tsx`
- **Changes:**
   - Import SkillsStep and BenefitsStep
  - Replace placeholder content in case 2 and case 3
  - Ensure proper step transitions

---

## Wave 5: Polish & Verification

### Task 5.1: Audit All Chargen Components for Consistency
- [x] Check all 24 chargen components use consistent typography
- [x] Verify no `text-zinc-400/500` without good reason
- [x] Ensure all headings use `font-display`
- [x] Verify spacing uses design token scale

### Task 5.2: Visual Verification via Playwright
- [x] Screenshot each step
- [x] Verify no overlapping elements
- [x] Confirm text readability
- [x] Check responsive behavior

### Task 5.3: Final Typecheck & Build
- [x] `pnpm --filter web typecheck`
- [x] `pnpm --filter web build`

---

## Color Contrast Reference

| Token | Hex | WCAG on #0a0d14 | Use For |
|-------|-----|-----------------|---------|
| text-heading | #f1f5f9 | 15.6:1 ✅ | h1-h3, important |
| text-body | #e2e8f0 | 13.8:1 ✅ | Default text |
| text-label | #cbd5e1 | 11.0:1 ✅ | Labels, captions |
| text-subtle | #94a3b8 | 6.0:1 ✅ | Secondary |
| text-muted | #64748b | 3.7:1 ⚠️ | Decorative only |
| THEME_HEX.slate | #64748b | 3.7:1 ⚠️ | AVOID for text |

---

## Summary

| Wave | Tasks | Focus |
|------|-------|-------|
| 1 | 2 | Typography foundation |
| 2 | 3 | Layout & spacing |
| 3 | 4 | Contrast fixes |
| 4 | 3 | Skills & Benefits steps |
| 5 | 3 | Polish & verification |
| **Total** | **15** | |
