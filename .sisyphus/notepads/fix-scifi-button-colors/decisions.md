# Decisions - Fix SciFiButton Colors

- **Centralized Style Helper**: Created `getThemeStyle` in `themeUtils.ts` to provide both inline `style` and `className` for themed components. This handles the complexity of Tailwind v4's missing color palette in one place.
- **CSS Variables for Hovers**: Used CSS custom properties set via inline styles to support hover effects while still using hex values for the colors. This keeps the interactive feel of the buttons without relying on broken Tailwind color classes.
- **High Contrast for Primary**: Set `primary` variant text color to `#0f172a` (slate-900) to ensure high contrast on bright theme-colored backgrounds.
