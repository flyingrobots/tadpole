---
title: "V1-GP5 - Timeline Editing Power Tools"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/62"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP5 - Timeline Editing Power Tools

## Linked Umbrella Issue

- [#62 - V1-GP5 - Timeline Editing Power Tools](https://github.com/flyingrobots/tadpole/issues/62)

## Hill

By the end of this goalpost, users can manipulate dense animation timelines
with multi-select, copy/paste, duplication, snap, zoom, grouping, filtering, and
easing tools that are command-backed and undoable.

## Slice Budget

26 slices.

## User Stories

### Story 1: Keyframe Multi-Select

Issue: [#79 - Add Keyframe Multi-Select And Range Editing](https://github.com/flyingrobots/tadpole/issues/79)

An animator wants to select multiple keyframes by range or modifier key so that
timing changes can be edited in batches.

Proof:

- [ ] Multi-select works with pointer and keyboard.
- [ ] Move, nudge, and delete apply to selected keyframes.
- [ ] Selection state is inspectable and undoable.

Slice budget: 5.

### Story 2: Copy, Paste, And Duplicate

Issue: [#80 - Add Copy Paste Duplicate For Tracks And Keyframes](https://github.com/flyingrobots/tadpole/issues/80)

An animator wants copy, paste, and duplicate operations for tracks and keyframes
so that repeated animation patterns are fast to build.

Proof:

- [ ] Clipboard format is validated.
- [ ] Paste can target the same or another SVG target when compatible.
- [ ] Operations go through command history.

Slice budget: 5.

### Story 3: Timeline Zoom, Pan, And Snap

Issue: [#81 - Add Timeline Zoom Pan And Snap Controls](https://github.com/flyingrobots/tadpole/issues/81)

An animator wants timeline zoom, horizontal pan, and visible snap controls so
that both short and long animations are editable precisely.

Proof:

- [ ] Zoom and pan controls work without layout shift.
- [ ] Snap modes are visible and deterministic.
- [ ] Keyboard nudge respects snap settings.

Slice budget: 4.

### Story 4: Curve And Tangent Editing

Issue: [#82 - Add Easing Curve And Tangent Editing](https://github.com/flyingrobots/tadpole/issues/82)

An animator wants visual easing and curve controls so that motion can be tuned
beyond linear keyframes.

Proof:

- [ ] Supported easing maps to save-compatible SVG or clearly blocks native
      save.
- [ ] Curve/tangent UI exposes accessible names and inspectable facts.
- [ ] Preview playback matches saved/runtime behavior.

Slice budget: 5.

### Story 5: Track Grouping And Filtering

Issue: [#83 - Add Track Grouping Filtering And Search](https://github.com/flyingrobots/tadpole/issues/83)

A user working with complex SVGs wants to group, filter, and search timeline
tracks so that dense animations remain navigable.

Proof:

- [ ] Search filters by target ID, label, property, and warning state.
- [ ] Groups collapse without losing selection context.
- [ ] Agent facts expose filtered and total track counts.

Slice budget: 4.

### Story 6: Destructive Operation Undo

Issue: [#23 - Add undo and redo for destructive timeline/import operations](https://github.com/flyingrobots/tadpole/issues/23)

A user wants import, clear, delete, and batch operations to be undoable so that
larger timeline edits remain safe.

Proof:

- [ ] Destructive operations route through command history or explicit recovery.
- [ ] Undo and redo restore timeline and selection state.
- [ ] Browser witnesses cover at least import, clear, and batch delete.

Slice budget: 3.

## Goalpost Checklist

- [ ] Slice 1: Add selected-keyframe set model.
- [ ] Slice 2: Add pointer multi-select.
- [ ] Slice 3: Add keyboard multi-select.
- [ ] Slice 4: Add multi-keyframe move and nudge commands.
- [ ] Slice 5: Add multi-keyframe delete command and witness.
- [ ] Slice 6: Define clipboard payload.
- [ ] Slice 7: Add copy and paste for keyframes.
- [ ] Slice 8: Add duplicate for keyframes.
- [ ] Slice 9: Add copy, paste, and duplicate for tracks.
- [ ] Slice 10: Validate cross-target paste compatibility.
- [ ] Slice 11: Add timeline zoom state.
- [ ] Slice 12: Add horizontal pan state.
- [ ] Slice 13: Add snap controls and snap facts.
- [ ] Slice 14: Make keyboard nudge respect snap settings.
- [ ] Slice 15: Define easing curve editor contract.
- [ ] Slice 16: Add easing preview UI.
- [ ] Slice 17: Add save-blocking or save-compatible easing behavior.
- [ ] Slice 18: Add curve/tangent accessibility facts.
- [ ] Slice 19: Add track search input.
- [ ] Slice 20: Add property and warning filters.
- [ ] Slice 21: Add grouping and group collapse.
- [ ] Slice 22: Add filtered count facts.
- [ ] Slice 23: Route clear tracks through command/recovery path.
- [ ] Slice 24: Route import replacement through recovery path.
- [ ] Slice 25: Add destructive operation undo witness.
- [ ] Slice 26: Run full timeline-power validation and retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#62](https://github.com/flyingrobots/tadpole/issues/62)
      has all child story issues linked.
- [ ] Every timeline mutation is command-backed or has explicit recovery.
- [ ] Dense timelines remain editable without losing the SVG canvas.
