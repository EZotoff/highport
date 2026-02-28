## Design Tokens and CSS Setup

- Implemented design tokens in `apps/web/app/design-tokens.css` using CSS custom properties for colors, spacing, typography, and animations.
- Updated `apps/web/app/globals.css` to import fonts (Orbitron, Inter, JetBrains Mono) and design tokens, and added base styles and utilities.
- Converted `apps/web/postcss.config.js` and `apps/web/tailwind.config.js` to ES modules (`export default`) to support the project's `"type": "module"` configuration.
- Upgraded PostCSS configuration to use `@tailwindcss/postcss` for compatibility with Tailwind CSS v4.
- Verified the build with `pnpm --filter web build`.
