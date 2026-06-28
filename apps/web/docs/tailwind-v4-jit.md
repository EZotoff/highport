# Tailwind v4 JIT Source Audit

Highport uses Tailwind CSS v4 through `@tailwindcss/postcss`. In v4, source detection and safelisting are controlled from the stylesheet with `@source` directives, not the legacy JavaScript `content`/`safelist` configuration path.

The global stylesheet registers the three source roots that contain responsive utility classes:

```css
@source "../app";
@source "../components";
@source "../lib";
```

It also safelists the grid utilities required by the character creation layout and regression audit:

```css
@source inline("{sm:,md:,lg:,xl:,}grid-cols-{1,2,3,4,5,6}");
@source inline("{sm:,md:,lg:,xl:,}grid-rows-1");
@source inline("{sm:,md:,lg:,xl:,}col-span-{1,2,3,4,5,6}");
```

The stylesheet uses the Tailwind v4 CSS-first entrypoint:

```css
@import 'tailwindcss';
```

This is required for v4 `@source` handling and responsive variant generation. The PostCSS plugin remains `@tailwindcss/postcss`; do not replace it with a different plugin.

Regression coverage lives in `apps/web/__tests__/tailwind-jit.test.ts`. The test scans `apps/web/app`, `apps/web/components`, and `apps/web/lib` for `sm:`, `md:`, `lg:`, and `xl:` class tokens, compiles `app/globals.css` with the same Tailwind v4 PostCSS plugin, and fails if any responsive selector or required grid utility is missing.
