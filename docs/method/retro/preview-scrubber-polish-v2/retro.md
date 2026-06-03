# Retro: Timeline Preview Workbench and Scrubber Keyframe UX

## Outcome

Implemented scrubber parity and preview insertion affordances in one pass while
keeping changes limited to `frontend/src/App.svelte` and cycle-method packets.
Rendered SVG target binding is follow-up work from the source-rendered preview
path and is tracked by the SVG timeline MVP checklist and witness evidence.

## What went well

- Preview and timeline scrubbers now share pointer-to-time behavior through
  helper paths.
- One-click/one-dblclick actions are now discoverable in the preview controls
  and toolbar.
- Preview playhead metadata and labels provide immediate context for where the
  current insertion point sits.
- New METHOD cycle packet documents scope, playback questions, and manual
  verification.

## What was difficult

- Balancing compactness vs. clarity in shortcut/micro-UI while minimizing layout
  churn.
- Existing visual density of workbench requires occasional spacing tuning on
  smaller widths.

## Risks / follow-up

- No automated interaction coverage for drag/drop interactions yet; verify with
  manual smoke.
- Keyframe neighborhood metadata is tied to selected track only; multi-track
  context needs explicit future visualization.

## Commands / Evidence

- Branch: `cycles/UIUX_preview-scrubber-polish-v2`
- Files changed:
  - `frontend/src/App.svelte`
  - `docs/method/design/preview-scrubber-polish-v2/design.md`
  - `docs/method/witness/preview-scrubber-polish-v2/witness.md`
  - `docs/method/retro/preview-scrubber-polish-v2/retro.md`
