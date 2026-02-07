# Learnings - Fix SciFiButton Colors

- Tailwind v4 (at least in this configuration) does not include the default color palette. Classes like `text-red-400` fail silently and result in black/invisible text on dark backgrounds.
- To fix this for themed components, use inline styles with hex values from `THEME_HEX`.
- For hover states with inline styles, CSS custom properties (variables) can be set in the `style` object and then used in Tailwind `hover:` classes (e.g., `hover:bg-[var(--theme-hover)]`).
- Centralizing these styles in `themeUtils.ts` via `getThemeStyle` helps maintain consistency and simplifies component code.
