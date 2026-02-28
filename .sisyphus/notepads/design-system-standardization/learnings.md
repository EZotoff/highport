# Learnings

- Many components were already using CSS variables, but `DiceRollDisplay.tsx` and `TermDetailCard.tsx` still had hardcoded values.
- I had to add extra CSS variables (`star-metal-60`, `star-metal-90`, `deep-void-80`) that were not in the initial list to match the existing hardcoded values.
- The `edit` tool requires sequential operations if modifying the same file to avoid conflicts or "file modified" errors.

# Issues

- `replaceAll` works well but one needs to be careful about strings that might be part of other strings (though rgba values are usually distinct).
- I initially got a "file modified" error because I tried to edit the same file twice in parallel (or too quickly in sequence without re-reading, effectively).

# Decisions

- Decided to create new variables (`star-metal-60`, etc.) rather than forcing existing ones (like 50 or 80) to preserve the visual design intent (0.6 opacity vs 0.5).
- Decided to update `deep-void` as well since it's a base color.
