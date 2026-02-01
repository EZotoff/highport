# Learnings - Chargen Route and Layout

## UI Patterns
- Used Tailwind `zinc` palette (`zinc-950` background, `zinc-900` panels) to match the existing application theme.
- Implemented a wizard layout with:
  - Top navigation bar (`StepNavigation`)
  - Main content area
  - Collapsible/Fixed side panel for character preview (`CharacterPreview`)
  - Bottom action bar for navigation

## Component Structure
- `ChargenWizard` acts as the main controller, managing `currentStep` state.
- Steps are rendered conditionally based on the current step index.
- Navigation logic is centralized in the wizard.

## Career Selection Implementation
- Implemented `CareerSelectionStep.tsx` with full 12-career support from `@planeshift/mgt2e`.
- Integrated qualification logic: `2d6 + characteristicDM + previousCareerPenalty (-1 per term)`.
- UI handles Success/Failure states with distinct visual cues (Green/Red themes).
- Added `animate-in` transitions for smooth UX.
- Integrated with `ChargenWizard` state flow, properly creating new terms in the Yjs document.
- Followed "Drifter defaults to Barbarian" rule for the fallback option.

## ConnectionRequestList Component
- Implemented `ConnectionRequestList` in `apps/web/components/chargen/`.
- UI uses direct Tailwind classes following `ParticipantCard` style (`bg-zinc-950`, `border-zinc-800`).
- logic relies on `useConnectionRequests`, `useEntityPool`, `useAllCharacters` hooks.
- Handling of `isGM` vs entity owner for approval rights was implemented.

## Session Join Flow
- Implemented `SessionJoinModal` for `/chargen/join/[sessionId]` route.
- Used `initProvider` with dynamic session IDs to switch Yjs rooms on the fly.
- Updated `ChargenWizard` to restore active character from `localStorage` (`planeshift_active_character`), enabling seamless transition from Join Page -> Main Wizard.
- Handled session connection timeouts and locked session states.
