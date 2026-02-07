- `CosmicBackground` uses layered CSS radial gradients to create a complex visual effect without heavy assets.
- `style jsx` is effective for component-specific keyframe animations in Next.js without polluting global CSS.
- `LifepathTimeline` refactored to use `GlassPanel` and design tokens (`var(--star-metal)`, `var(--deep-void)`) for consistent sci-fi theming.
- Replaced hardcoded Tailwind colors with `THEME_HEX` values for consistent neon accents.

- **FinalizeStep Redesign**: Updated `FinalizeStep.tsx` to use `GlassPanel` and `THEME_HEX`. Replaced Tailwind color classes with specific RGBA values and theme constants for exact visual control matching the sci-fi aesthetic.

- **BaseNode Visual Enhancements**: Implemented sci-fi visual effects for BaseNode component:
  - Orbiting ring on selection using `animate-spin-slow`.
  - Triple-layer neon glow box-shadows for depth.
  - Subtle scanline overlay using repeating linear gradient.
  - Hover float animation using conditional transforms.
  - Added `spin-slow` animation to `tailwind.config.js` (20s linear infinite).
