# Witness: Timeline Preview Workbench and Scrubber Keyframe UX

## Purpose

Verify the preview scrubber and keyframe-entry ergonomics cycle implemented in
the current branch.

## Environment

- Branch: `cycles/UIUX_preview-scrubber-polish-v2`
- Repo: `/Users/james/git/tadpole`

## Commands

```bash
cd /Users/james/git/tadpole

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
3. Double-click in preview bar to insert a keyframe on the selected track and
   confirm it appears in track keyframe list.
4. Use toolbar `Drop keyframe` action and verify same result with snapped time.
5. Confirm shortcut panel includes preview double-click hint and keyframe-step
   guidance.

## Expected observations

- Visual scrubber marker and label exist in both timeline and preview rails.
- Playhead context label in preview updates between `on frame`, `between`, and
  `before/after` states.
- `addKeyframeFromPreviewScrubber` is invoked from preview interactions and uses
  shared snap-time behavior.
