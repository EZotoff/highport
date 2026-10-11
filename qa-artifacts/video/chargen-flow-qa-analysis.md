# Chargen Flow — Video Motion QA Analysis

Captured: 2026-10-11 · Video: `chargen-flow-qa.mp4` (this directory) · Analyst: GLM 5.3 flash (video)
Channel note: analysis performed via direct API (base64 `video_url`) because the
agent-session path (`look_at`) was blocked by an AI-SDK gap — see final report.
Session: ses_ed437197fffeMWGtuKJqwQDEXi (traveller) · Spec: `apps/web/e2e/qa-video-chargen.spec.ts`

## 1. Step transition (step 1 → Step 2: Careers)

Between 00:06 and 00:07, the UI transitions to the Careers selection screen. The
visual change is a quick fade or instant cut, taking less than a second. The
animation is smooth with no jank or flicker. The surrounding panels remain fixed,
indicating no layout shift.

## 2. Interaction feedback

### Skill selection toggles (00:04–00:06)

- 00:04 — "Admin" highlighted with solid purple background (hover/focus state); "Animals" and "Art" show purple checkmarks (selected).
- 00:05 — state updates: "Admin" shows purple checkmark; "Animals"/"Art" grey out; highlight moves to "Flyer".
- 00:06 — all three skills checked with purple boxes.
- Verdict: feedback is **clear and immediate**; distinctions unambiguous; transitions appear instantaneous between frames (no tween animation).

### Continue button (00:01–00:09)

Remains bright cyan (enabled state) for the entire duration — never observed in a disabled state on video.

## 3. Full motion audit

| Time        | Event                                                                                                         | Classification |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------------- |
| 00:00–00:01 | Abrupt cut from "Highport" loading screen to dashboard + "Start Character Generation" modal                   | Abrupt         |
| 00:02       | Abrupt transition from start modal to "Characteristics" form                                                  | Abrupt         |
| 00:03–00:04 | "Re-roll All" click instantly changes stat values; instant scroll to "Background Skills"                      | Abrupt         |
| 00:06–00:08 | After "Continue", career cards ("Entertainer", "Marine", "Merchant") slide down smoothly into viewport center | **Smooth**     |

No unresponsive inputs or elements moving without cause were observed.

## QA takeaways

1. **Career cards entrance is the one polished animation** (smooth slide, 00:06–00:08).
2. **State transitions elsewhere are hard cuts** (modal→form, re-roll, scroll) — candidates for easing/fade if polish is desired.
3. **Skill toggles have no transition animation** — state flips between frames; consider a short scale/color tween if visual continuity matters.
4. Continue button never shown disabled — its disabled↔enabled affordance is untested on video (spec fills skills fast enough that it never gates).

---

## Addendum (2026-10-11, post-fix): agent path now live

The analysis above was produced via direct API because the agent-session path
(`look_at`) was blocked by an AI-SDK gap (no video serialization). That gap is
now fixed and deployed: tracked patch `opencode--sdk-video-filepart` (binary
`1.18.31-p5`, receipt `a9c5cdfd`), registered RUNTIME-VERIFIED.

Live smoke through the real agent session (same clip, same question):

> "…Smoothness: Smooth. The transition completes cleanly with no dropped-looking
> states after settle; Step 2 renders fully formed at 8.0s and 9.0s (identical
> frames = stable). Flicker: None observed beyond the expected single cross-fade
> blend frame. …Layout shift: None in surrounding chrome. Only the central step
> content swaps."

Future traveller/veran QA runs get this via
`look_at(file_path=<clip.mp4>, goal=<one specific transition question>)` with no
asterisk. Note: the looker's fallbacks are image-only — video QA rides on
`glm-5.3-flash` quota with no fallback chain.
