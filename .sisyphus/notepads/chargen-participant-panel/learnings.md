# Learnings

## Component Patterns
- **ParticipantPanel**: Implemented a real-time participant list using `useAllCharacters` and `useSession` hooks.
  - **Progress Logic**: Mapped `ChargenStatus` to numeric percentages for visual progress bars.
  - **Styling**: Used zinc-based dark theme to match `CharacterPreview`.
  - **GM Display**: Handled GM display separately from character list as GM is a session property, not a character.

## Gotchas
- **GM Identification**: `useAllCharacters` only returns characters, not the GM user. Used `useSession` to confirm session existence and rendered a static/placeholder GM card since full user profile data wasn't available via the provided hooks.
