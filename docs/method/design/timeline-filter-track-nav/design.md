# Design Packet: UI Polish 2 — Track Filter/Sort + Keyframe Navigation

- Branch: `cycles/UIUX_timeline-controls-polish`
- Date: 2026-05-31
- Scope: Timeline UX refinement for faster large-track browsing and keyframe
  traversal.

## Goals

1. Make track list management usable with many tracks by adding:
   - Text filter (id / target / property)
   - Manual sort mode switchers (manual / target / property)
   - Existing "selected track only" visibility state retained.
2. Add immediate keyframe stepping commands for the selected track:
   - Jump to previous keyframe
   - Jump to next keyframe
3. Expose quick access actions and discoverability in the top toolbar and
   shortcut panel.

## Proposed Behavior

- Track filtering is case-insensitive and trims whitespace.
- Filtering applies to:
  - track id
  - target id
  - resolved target name
  - property id
- Manual sort preserves existing relative order.
- Target sort first groups by target then property.
- Property sort groups by property then target/id.
- Keyframe stepping (`","` and `"."`) jumps around keyframes in the currently
  selected track and syncs selection to the destination keyframe.

## Non-goals

- No timeline playback engine changes
- No transport/transportable export changes in this cycle
