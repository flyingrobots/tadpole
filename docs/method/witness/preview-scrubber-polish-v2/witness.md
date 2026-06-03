# Witness: Timeline Preview Workbench and Scrubber Keyframe UX

## Purpose

Verify the preview scrubber and keyframe-entry ergonomics cycle implemented in
the current branch.

## Environment

- Branch: `cycles/UIUX_preview-scrubber-polish-v2`
- Repo: derive with `git rev-parse --show-toplevel`

## Commands

```bash
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git branch --show-current
rg -n "preview-controls-row|preview-metadata" frontend/src/App.svelte
rg -n "addKeyframeFromPreviewScrubber" frontend/src/App.svelte
rg -n "selectedTrackNeighborhood|scrubber-time" frontend/src/App.svelte
cat frontend/src/App.svelte
```

## Manual checks

1. Open the app and confirm the preview and timeline scrubbers move in lockstep
   when dragging.
2. Drag preview scrubber; verify the label and metadata update as playhead
   changes.
3. Scrub the timeline and confirm the rendered SVG preview changes visually:
   `UI Text` shifts, `Tadpole Q` opacity changes, and `CO Text` fill updates.
4. Double-click in preview bar to insert a keyframe on the selected track and
   confirm it appears in track keyframe list.
5. Use toolbar `Drop keyframe` action and verify same result with snapped time.
6. Confirm shortcut panel includes preview double-click hint and keyframe-step
   guidance.

## Expected observations

- Visual scrubber marker and label exist in both timeline and preview rails.
- Playhead context label in preview updates between `on frame`, `between`, and
  `before/after` states.
- `addKeyframeFromPreviewScrubber` is invoked from preview interactions and uses
  shared snap-time behavior.
