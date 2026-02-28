## Visual Effects Implementation

- **CSS Animations**: Added global keyframes in `globals.css` for reusable animations like `gradient-shift` and `pulse-danger`.
- **Tailwind Arbitrary Values**: Used arbitrary values (e.g., `shadow-[...]`) for complex glow effects to avoid cluttering the theme config with one-off values.
- **GlassMorphism**: Combined `GlassPanel` with absolute positioning layers for "energy border" effects.

## Build Process

- **Typecheck Dependency**: `pnpm typecheck` (tsc) may fail if Next.js generated types are missing. Running `pnpm build` first generates these types and resolves the issue.

---

## Session 2025-02-02 - Full Plan Completion

### Key Patterns Discovered

1. **CSS Variable Architecture**
   - Alpha variants needed for colors: `--nebula-mist-90`, `--asteroid-dust-50`
   - Added to `design-tokens.css` for reuse across components
   - Prefer CSS vars over hardcoded `rgba()` for consistency

2. **Animation Keyframes Location**
   - Add keyframes to `globals.css` for CSS-based animations
   - Add to `tailwind.config.js` for Tailwind utility class animations
   - Examples: `spin-slow`, `gradient-shift`, `pulse-danger`, `twinkle-fast/medium/slow`

3. **Glow Effect Best Practices**
   - Triple-layer glow provides more depth: `0 0 15px at 40%, 0 0 30px at 20%, 0 0 45px at 10%`
   - Use utility classes (`.glow-cyan`, `.text-glow-cyan`) for consistency
   - Increased base opacity from 0.4 to 0.6 for visibility

4. **CosmicBackground Enhancement**
   - 3-layer starfield with different animation speeds creates depth
   - Nebula pulse animation (scale 1.0→1.05 over 25s) adds life
   - Vignette overlay applied at component level, not in shared primitive

5. **TYPOGRAPHY Constants**
   - Import from `@/lib/design-system/themeUtils`
   - Apply consistently: `TYPOGRAPHY.label`, `TYPOGRAPHY.data`, `TYPOGRAPHY.subheading`
   - Combines font family, size, weight, tracking in one class

6. **Visual Polish Techniques**
   - Corner accents: L-shaped borders at corners add tech-panel feel
   - Chromatic aberration: Simple `text-shadow` with red/cyan offset
   - Age ruler: Pulsing indicator on current age draws attention

### Agent Configuration

- **ALWAYS use `category="visual-engineering"`** for UI polish tasks
- The Gemini 3 Pro model produces higher quality visual work
- Do NOT use `category="quick"` for visual tasks (produces flat/basic results)

### All 8 Tasks Completed

1. ✅ Task 1: Standardize styling (CSS variables)
2. ✅ Task 2: Enhance BaseNode (orbiting ring, glow, float, scanlines)
3. ✅ Task 3: Enhance TimelineTerm (corners, border, glow)
4. ✅ Task 4: Apply TYPOGRAPHY constants
5. ✅ Task 5: Amplify glow effects system-wide
6. ✅ Task 6: Chromatic aberration on headings
7. ✅ Task 7: GraphCanvas background (starfield, vignette)
8. ✅ Task 8: LifepathTimeline layout (age ruler, empty state)

- Successfully replaced standard buttons with `SciFiButton` in `GMControlPanel.tsx`.
- `SciFiButton` correctly wraps Shadcn UI `Button` and supports `theme` and `scifiVariant` props.
- Kept original icons (`Check`, `X`) inside `SciFiButton` to preserve visual hierarchy despite requested snippet omitting them.
- Verified that `@/components/ui/scifi` correctly resolves for imports in `apps/web`.

## Session 2026-02-02 - Chargen Typography Classes

- Replaced Tailwind color utilities in chargen UI with typography classes (`text-heading`, `text-default`, `text-label`, `text-subtle`) to avoid missing palette generation in Tailwind v4.
- For text inputs/textareas, prefer `text-default` on the control and drop non-functional `placeholder:text-*` color utilities when no custom placeholder class exists.
