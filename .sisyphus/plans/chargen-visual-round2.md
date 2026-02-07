# Chargen Visual Update Round 2

## Goal
Update remaining chargen components to use SciFi primitives (buttons, inputs, selects, icons).

## Context
- All tasks use `ui-quick` agent category with `["frontend-ui-ux"]` skills
- Import path: `@/components/ui/scifi`
- Available components: `SciFiButton`, `SciFiInput`, `SciFiSelect`, `SciFiBadge`, `GlassPanel`, `SciFiCard`
- SciFiButton props: `theme` (cyan/violet/amber/emerald/red/slate), `scifiVariant` (primary/secondary/ghost/outline/destructive), `glow`, `size`
- Lucide icons replace emojis: Crown, Hourglass, Dice5, User, MapPin, Package, Lock, etc.

## Constraints
- ONE file per task
- ONE type of change per task
- Checkboxes styled as-is (skip)
- Cards/panels skip for this round (buttons/inputs/icons only)
- Textareas: apply SciFi CSS classes directly (no new component)

---

## Wave 1 (Parallel - No Dependencies)

### Task 1.1: TermResolutionStep - Replace primary action buttons
- [x] **File:** `apps/web/components/chargen/steps/TermResolutionStep.tsx`
- **Change:** Replace 4 main `bg-blue-600` buttons with `<SciFiButton theme="cyan">`
- **Buttons:** Roll Survival (L375-379), Roll Event (L421-425), Roll 1d6 (L543-548), Roll Advancement (L574-579)
- **Import:** `SciFiButton` already imported from `@/components/ui/scifi`

### Task 1.2: GMControlPanel - Replace approve/reject buttons
- [x] **File:** `apps/web/components/chargen/GMControlPanel.tsx`
- **Change:** Replace Approve/Reject buttons (L156-167) with `<SciFiButton>`
- **Approve:** `theme="emerald" scifiVariant="secondary" size="sm"`
- **Reject:** `theme="red" scifiVariant="secondary" size="sm"`
- **Import:** Add `import { SciFiButton } from '@/components/ui/scifi';`

### Task 1.3: ConnectionRequestModal - Replace input and select
- [x] **File:** `apps/web/components/chargen/ConnectionRequestModal.tsx`
- **Change:** Replace `<select>` (L107-124) with `<SciFiSelect>` and `<input>` (L132-139) with `<SciFiInput>`
- **Select options:** Map RELATIONSHIP_OPTIONS to SciFiSelect format
- **Import:** Add `import { SciFiInput, SciFiSelect } from '@/components/ui/scifi';`

### Task 1.4: EntitySpawnForm - Replace input and textarea
- [x] **File:** `apps/web/components/chargen/EntitySpawnForm.tsx`
- **Change:** Replace `<input>` (L191-197) with `<SciFiInput theme="cyan">`
- **Change:** Update `<textarea>` (L224-230) with SciFi CSS: `bg-[var(--star-metal)] border-[var(--asteroid-dust-50)] text-gray-100 focus:ring-cyan-500/50`
- **Import:** Add `import { SciFiInput } from '@/components/ui/scifi';`

### Task 1.5: SessionJoinModal - Replace input
- [x] **File:** `apps/web/components/chargen/SessionJoinModal.tsx`
- **Change:** Replace `<input>` (L187-194) with `<SciFiInput theme="cyan">`
- **Import:** Add `import { SciFiInput } from '@/components/ui/scifi';`

### Task 1.6: ParticipantCard - Replace emojis with Lucide icons
- [x] **File:** `apps/web/components/chargen/ParticipantCard.tsx`
- **Change:** Replace emojis with Lucide icons:
  - L38: `👑` → `<Crown className="w-4 h-4 text-amber-400" />`
  - L53: `⏳` → `<Hourglass className="w-4 h-4 text-zinc-500" />`
  - L76: `🎲` → `<Dice5 className="w-3 h-3 text-zinc-500" />`
- **Import:** Add `import { Crown, Hourglass, Dice5 } from 'lucide-react';`

### Task 1.7: ParticipantPanel - Replace emojis with Lucide icons
- [x] **File:** `apps/web/components/chargen/ParticipantPanel.tsx`
- **Change:** Replace emojis with Lucide icons:
  - L45: `👑` → `<Crown className="w-4 h-4 text-amber-400" />`
  - L71: `🎲` → `<Dice5 className="w-3 h-3 text-zinc-500" />`
- **Import:** Add `import { Crown, Dice5 } from 'lucide-react';`

### Task 1.8: EntityPoolPanel - Replace emojis with Lucide icons
- [x] **File:** `apps/web/components/chargen/EntityPoolPanel.tsx`
- **Change:** Replace TYPE_ICONS object (L13-18) from emojis to Lucide components:
  - `npc: '👤'` → Render `<User className="w-4 h-4" />`
  - `location: '📍'` → Render `<MapPin className="w-4 h-4" />`
  - `item: '📦'` → Render `<Package className="w-4 h-4" />`
  - `secret: '🔒'` → Render `<Lock className="w-4 h-4" />`
- **Update:** Rendering at L106-107
- **Import:** Add `import { User, MapPin, Package, Lock, HelpCircle } from 'lucide-react';`

### Task 1.9: EntityPoolCard - Replace emojis with Lucide icons
- [x] **File:** `apps/web/components/chargen/EntityPoolCard.tsx`
- **Change:** Replace TYPE_ICONS object (L15-20) from emojis to Lucide components:
  - `npc: '👤'` → Render `<User className="w-4 h-4" />`
  - `location: '📍'` → Render `<MapPin className="w-4 h-4" />`
  - `item: '📦'` → Render `<Package className="w-4 h-4" />`
  - `secret: '🔒'` → Render `<Lock className="w-4 h-4" />`
- **Update:** Rendering at L47-48
- **Import:** Add `import { User, MapPin, Package, Lock, HelpCircle } from 'lucide-react';`

---

## Wave 2 (Some depend on Wave 1)

### Task 2.1: TermResolutionStep - Replace secondary/action buttons
- [x] **File:** `apps/web/components/chargen/steps/TermResolutionStep.tsx`
- **Depends on:** Task 1.1
- **Change:** Replace remaining buttons:
  - L402-407: `Accept Mishap` → `<SciFiButton theme="red" scifiVariant="secondary">`
  - L444-447: `Generate Description` → `<SciFiButton theme="violet" scifiVariant="secondary">`
  - L465-469: `Accept & Save` → `<SciFiButton theme="emerald" scifiVariant="secondary">`
  - L488-493: `Continue` → `<SciFiButton theme="slate" scifiVariant="ghost">`
  - L524-531: Skill table buttons → `<SciFiButton theme="slate" scifiVariant="secondary">`
  - L538: Change Table link → `<SciFiButton theme="slate" scifiVariant="ghost" size="sm">`
  - L603-618: Continue Career + Muster Out → `<SciFiButton theme="slate/cyan">`

### Task 2.2: GMControlPanel - Replace footer buttons
- [x] **File:** `apps/web/components/chargen/GMControlPanel.tsx`
- **Depends on:** Task 1.2
- **Change:** Replace footer buttons:
  - L177-181: `Export All Characters` → `<SciFiButton theme="slate" scifiVariant="secondary">`
  - L182-191: `End Session` → `<SciFiButton theme="red" scifiVariant="outline">`

### Task 2.3: ConnectionRequestModal - Replace buttons
- [x] **File:** `apps/web/components/chargen/ConnectionRequestModal.tsx`
- **Depends on:** Task 1.3
- **Change:** Replace buttons:
  - L161-165: `Cancel` → `<SciFiButton theme="slate" scifiVariant="ghost">`
  - L167-173: `Submit Request` → `<SciFiButton theme="cyan">`
- **Import:** Add `SciFiButton` to existing import

### Task 2.4: ConnectionSuggestions - Replace buttons
- [x] **File:** `apps/web/components/chargen/ConnectionSuggestions.tsx`
- **Change:** Replace buttons:
  - L115-119: `Add Connection` → `<SciFiButton theme="violet" size="sm">`
  - L120-125: `Dismiss` → `<SciFiButton theme="slate" scifiVariant="ghost" size="sm">`
- **Import:** Add `import { SciFiButton } from '@/components/ui/scifi';`

### Task 2.5: ConnectionRequestList - Replace buttons
- [x] **File:** `apps/web/components/chargen/ConnectionRequestList.tsx`
- **Change:** Replace buttons:
  - L128-132: `Approve` → `<SciFiButton theme="emerald" size="sm">`
  - L133-139: `Reject` → `<SciFiButton theme="red" scifiVariant="outline" size="sm">`
- **Import:** Add `import { SciFiButton } from '@/components/ui/scifi';`

### Task 2.6: EntitySpawnForm - Replace buttons
- [x] **File:** `apps/web/components/chargen/EntitySpawnForm.tsx`
- **Depends on:** Task 1.4
- **Change:** Replace buttons:
  - L181-188, L205-220: AI generate buttons → `<SciFiButton theme="violet" scifiVariant="secondary" size="sm">`
  - L235-241: `Generate NPC Details` → `<SciFiButton theme="violet">`
  - L251-256: `Skip Entity` → `<SciFiButton theme="slate" scifiVariant="ghost">`
  - L258-264: `Add to Campaign Graph` → `<SciFiButton theme="cyan">`
- **Import:** Add `SciFiButton` to existing import

### Task 2.7: SessionJoinModal - Replace buttons
- [x] **File:** `apps/web/components/chargen/SessionJoinModal.tsx`
- **Depends on:** Task 1.5
- **Change:** Replace buttons:
  - L97-102, L130-135: `Return Home` → `<SciFiButton theme="slate" scifiVariant="secondary">`
  - L207-211: `Cancel` → `<SciFiButton theme="slate" scifiVariant="ghost">`
  - L213-220: `Join Session` → `<SciFiButton theme="cyan">`
- **Import:** Add `SciFiButton` to existing import

---

## Wave 3 (Depends on earlier waves)

### Task 3.1: EntityPoolPanel - Replace filter buttons
- [x] **File:** `apps/web/components/chargen/EntityPoolPanel.tsx`
- **Depends on:** Task 1.8
- **Change:** Replace filter buttons (L68-81) with `<SciFiButton>`:
  - Selected: `theme="cyan"` (primary)
  - Unselected: `theme="slate" scifiVariant="ghost"`
  - Size: `size="sm"`
- **Import:** Add `SciFiButton` to existing import

### Task 3.2: EntityPoolPanel - Replace action buttons
- [x] **File:** `apps/web/components/chargen/EntityPoolPanel.tsx`
- **Depends on:** Task 3.1
- **Change:** Replace action buttons (L153-166):
  - `Request Connection` → `<SciFiButton theme="slate" scifiVariant="secondary" size="sm">`
  - `View Details` → `<SciFiButton theme="slate" scifiVariant="ghost" size="sm">`

### Task 3.3: EntityPoolCard - Replace action buttons
- [x] **File:** `apps/web/components/chargen/EntityPoolCard.tsx`
- **Depends on:** Task 1.9
- **Change:** Replace action buttons (L94-107):
  - `Request Connection` → `<SciFiButton theme="slate" scifiVariant="secondary" size="sm">`
  - `View Details` → `<SciFiButton theme="slate" scifiVariant="ghost" size="sm">`
- **Import:** Add `import { SciFiButton } from '@/components/ui/scifi';`

### Task 3.4: ChargenNotifications - Replace emojis with Lucide icons
- [x] **File:** `apps/web/components/chargen/ChargenNotifications.tsx`
- **Change:** Replace emojis with Lucide icons:
  - L72: `👋` → `<UserPlus className="w-4 h-4" />`
  - L83: `🎲` → `<Dice5 className="w-4 h-4" />`
  - L95: `🔔` → `<Bell className="w-4 h-4" />`
  - L110: `🔗` → `<Link2 className="w-4 h-4" />`
  - L122: `✅` → `<CheckCircle className="w-4 h-4" />`
  - L134: `📅` → `<Calendar className="w-4 h-4" />`
  - L146: `⭐` → `<Star className="w-4 h-4" />`
- **Import:** Add `import { UserPlus, Dice5, Bell, Link2, CheckCircle, Calendar, Star } from 'lucide-react';`

### Task 3.5: ChargenNotifications - Replace View in Pool button
- [x] **File:** `apps/web/components/chargen/ChargenNotifications.tsx`
- **Depends on:** Task 3.4
- **Change:** Replace button (L102-104):
  - `View in Pool` → `<SciFiButton theme="slate" scifiVariant="ghost" size="sm">`
- **Import:** Add `import { SciFiButton } from '@/components/ui/scifi';`

---

## Verification

After each wave:
1. Run `pnpm --filter web typecheck`
2. Run `pnpm --filter web build`
3. Visual verification via Playwright if needed

## Summary

| Wave | Tasks | Files Touched |
|------|-------|---------------|
| 1 | 9 | 9 unique files |
| 2 | 7 | 7 files (some overlap with Wave 1) |
| 3 | 5 | 4 unique files |
| **Total** | **21** | **12 unique files** |
