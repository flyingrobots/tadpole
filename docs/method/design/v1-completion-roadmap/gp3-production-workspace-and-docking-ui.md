---
title: "V1-GP3 - Production Workspace And Docking UI"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/60"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP3 - Production Workspace And Docking UI

## Linked Umbrella Issue

- [#60 - V1-GP3 - Production Workspace And Docking UI](https://github.com/flyingrobots/tadpole/issues/60)

## Hill

By the end of this goalpost, Tadpole feels like a production animation editor:
the SVG canvas is the center of attention, panels dock around it, and the
timeline remains a dense full-width editing surface.

## Slice Budget

22 slices.

## User Stories

### Story 1: Docking Editor Shell

Issue: [#52 - Adopt docking editor shell for production workspace](https://github.com/flyingrobots/tadpole/issues/52)

A user wants panels to behave like docked editor tools so that source, layers,
inspector, warnings, and export surfaces do not compete with the SVG canvas.

Proof:

- [ ] Docked panels can open, close, move, and resize.
- [ ] SVG canvas remains visually dominant.
- [ ] Existing editor workflows remain reachable.

Slice budget: 6.

### Story 2: Persisted Dock Layout

Issue: [#71 - Persist Dock Layout And Panel State](https://github.com/flyingrobots/tadpole/issues/71)

A returning user wants Tadpole to remember their dock layout and visible panels
so that the workspace stays arranged for repeated editing.

Proof:

- [ ] Dock state has a versioned local persistence model.
- [ ] Reset layout restores a known-good default.
- [ ] Browser witness proves persistence and reset.

Slice budget: 4.

### Story 3: Canvas Zoom, Pan, And Fit

Issue: [#72 - Add Canvas Zoom Pan Fit Controls](https://github.com/flyingrobots/tadpole/issues/72)

An SVG animator wants zoom, pan, fit-to-view, and actual-size controls so that
the artwork remains the center of the editor.

Proof:

- [ ] Canvas controls are keyboard and pointer reachable.
- [ ] Zoom and pan state is inspectable.
- [ ] Target selection still works after zoom and pan.

Slice budget: 4.

### Story 4: Timeline Stack Ergonomics

Issue: [#73 - Polish Bottom Timeline Track Stack Ergonomics](https://github.com/flyingrobots/tadpole/issues/73)

A user animating many SVG parts wants the bottom timeline to collapse, resize,
and scan cleanly so that tracks do not bury the canvas.

Proof:

- [ ] Timeline height is resizable.
- [ ] Track stacks collapse and expand predictably.
- [ ] Dense track labels, spans, and keyframes do not overlap.

Slice budget: 4.

### Story 5: Docking Accessibility

Issue: [#74 - Harden Docking Focus And Responsive Panel Accessibility](https://github.com/flyingrobots/tadpole/issues/74)

A keyboard or screen-reader user wants docked panels and responsive sheets to
preserve focus ownership so that workspace navigation remains predictable.

Proof:

- [ ] Focus return works for opened, closed, and moved panels.
- [ ] Narrow layout sheets expose equivalent actions.
- [ ] Browser witness covers menu, dock, canvas, and timeline transitions.

Slice budget: 4.

## Goalpost Checklist

- [ ] Slice 1: Select docking implementation and document tradeoffs.
- [ ] Slice 2: Replace current panel host with dock container.
- [ ] Slice 3: Add left and right default dock regions.
- [ ] Slice 4: Move Source, Layers, Inspector, Warnings, Export, and Debug into
      dock panels.
- [ ] Slice 5: Preserve existing menu command IDs.
- [ ] Slice 6: Add docking browser witness.
- [ ] Slice 7: Add versioned layout persistence.
- [ ] Slice 8: Add reset layout command and witness.
- [ ] Slice 9: Add canvas zoom controls.
- [ ] Slice 10: Add canvas pan controls.
- [ ] Slice 11: Add fit-to-view and actual-size controls.
- [ ] Slice 12: Prove target selection after zoom and pan.
- [ ] Slice 13: Add timeline height resize.
- [ ] Slice 14: Add track-stack collapse all and expand all.
- [ ] Slice 15: Add dense label and keyframe overlap checks.
- [ ] Slice 16: Add responsive dock-to-sheet behavior.
- [ ] Slice 17: Add focus ownership and return tests.
- [ ] Slice 18: Add screen-reader labels for dock state.
- [ ] Slice 19: Update wide and narrow screenshots or SVG mockups.
- [ ] Slice 20: Run existing workflow witnesses.
- [ ] Slice 21: Update README workspace description.
- [ ] Slice 22: Complete retrospective and close stale workspace follow-ons.

## Acceptance Criteria

- [ ] Umbrella issue [#60](https://github.com/flyingrobots/tadpole/issues/60)
      has all child story issues linked.
- [ ] The SVG canvas is visually dominant in wide and narrow layouts.
- [ ] Docks and timeline are inspectable without scraping pixels.
