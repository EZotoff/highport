
## SciFi-shadcn Bridge Layer
- **Decision**: Mapped shadcn/ui CSS variables to our sci-fi design tokens in `globals.css`.
- **Rationale**: Enables usage of standard shadcn components while maintaining the project's distinct "deep space" aesthetic without rewriting every component.
- **Details**:
  - Overrode `:root` variables to point to `--deep-void`, `--star-metal`, etc.
  - Removed light/dark toggle since the app is permanently dark mode.
  - Created `shadcn-bridge.ts` for type-safe theme variants mapped to shadcn `primary`, `secondary`, etc.
