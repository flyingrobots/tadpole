# Design Packet: Timeline Preview Workbench and Scrubber Keyframe UX

## Sponsors

- Human sponsor: Tadpole maintainer (speedy iteration UX)
- Agent sponsor: Implementation agent (frontend polish)
- User sponsor: Product owner (editor usability)

## Branch

- `cycles/UIUX_preview-scrubber-polish-v2`

## Problem

After timeline and track filtering cycles, the timeline editor was becoming
usable but still required too many manual steps to connect the playhead with
keyframe actions in the preview pane.

## Scope

In scope:

- make the preview scrubber feel as authoritative as timeline ruler for
  scrubbing
- enable precise keyframe insertion from preview scrubber interactions
- expose current-context metadata at scrubber cursor (prev/current/next)
- improve shortcut discoverability around preview interactions

Out of scope:

- new track/renderer export formats
- persistence/back-end contract changes
- multi-track keyframe batch operations

## Problem framing

Users need to work from a visual preview and not mentally bounce between
timeline and scrubber interactions. The preview should show playhead-relative
context and allow one-step keyframe insertion.

## Requirements / Playback Questions

Human playback:

1. Can I scrub from preview and timeline and have the same playhead cursor
   behavior?
2. Can I add a keyframe at the exact preview time with one interaction?
3. Does the UI show whether playhead is on a keyframe or between neighbors?
4. Are the shortcut hints clear enough for discoverability?

Agent playback:

1. Can a reviewer verify new preview scrubber classes and behaviors without
   opening runtime logic only?
2. Do interactions create deterministic keyframe insertion time via shared
   snapping logic?
3. Are timeline and preview scrubbers functionally equivalent in how they map
   x-position to time?

## Implementation plan

1. add shared pointer-to-time helpers already used by both timeline and preview
   scrubbing
2. render scrubber time labels in both timeline and preview ruler lines
3. add preview-context keyframe neighborhood metadata computed from selected
   track keyframes
4. add drop-keyframe actions tied to preview and toolbar with explicit enabled
   state
5. update shortcut panel and keep scope to UI/UX-only files

## Acceptance criteria

- scrubber drag in timeline and preview both update `currentTime`
- double-click/toolbar insertion drops keyframe on selected track
- neighborhood labels update as playhead moves
- key shortcut row includes preview-drop interaction note
- cycle packet is present under
  `docs/method/{design,witness,retro}/preview-scrubber-polish-v2/`
