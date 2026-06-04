---
title: "G19-001 - Keyboard Accessibility Witnesses"
lane: "design"
goal: "Goal 19"
issue: "https://github.com/flyingrobots/tadpole/issues/41"
pr: "https://github.com/flyingrobots/tadpole/pull/27"
status: "draft"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-03"
---

<!-- markdownlint-disable-next-line MD025 -->
# G19-001 - Keyboard Accessibility Witnesses

## Linked Issue

- [G19-001 - Keyboard Accessibility Witnesses](https://github.com/flyingrobots/tadpole/issues/41)

## Roadmap Gate

- Goal 19: Keyboard Accessibility Witnesses

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` by regular merge.
- [x] Cycle branch checked out.
- [x] GitHub issue created.
- [ ] `work-in-progress` label applied when implementation starts.
- [x] Design doc, issue link, and initial cycle scaffold staged and committed.
- [ ] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Goal 19 proves that the production editor is not pointer-only. Menus, dialogs,
Layers, timeline rows, keyframes, playhead movement, work area controls, and
warnings get keyboard paths and inspectable accessibility facts.

## Sponsored Human

A keyboard or screen-reader user wants to open an SVG, select a target, edit a
keyframe, preview motion, and inspect warnings without relying on pointer-only
canvas interactions.

## Sponsored Agent

An agent needs accessibility roles, names, focus paths, and keyboard witnesses
so it can verify lower-mode operation without scraping pixels.

## Hill

By the end of this cycle, a keyboard-only browser witness can complete the
golden path: open SVG, select target through Layers, add/edit a keyframe, play
preview, and open warnings.

## Current Truth

- Prior witnesses verify behavior mostly through direct selectors and pointer
  actions.
- Parent design: [Accessibility Contract](../design.md#accessibility-contract)
  and [Keyboard Model](../design.md#keyboard-model).

## Problem

The production editor cannot be considered usable or agent-inspectable if core
workflow state exists only as visual layout or pointer affordances.

## Scope

This cycle includes:

- Semantic landmarks for shell, stage, panels, and timeline.
- Keyboard navigation for menus, timeline rows, keyframes, and panels.
- Keyboard alternatives for keyframe add/move/delete.
- Warning badge and panel accessibility checks.
- Browser keyboard-only golden path witness.

## Non-Goals

This cycle does not include:

- Full WCAG audit.
- Localization catalog extraction.
- Screen-reader snapshot tooling unless needed for proof.

## User Experience / Product Shape

Keyboard users can move through editor regions predictably. Focus never
disappears into hidden panels or canvas-only controls.

```mermaid
journey
  title Keyboard-Only Golden Path
  section Open
    Open File menu: 4: User
    Import SVG: 4: User
  section Select
    Open Layers panel: 5: User
    Select target row: 5: User
  section Edit
    Move playhead: 5: User
    Add keyframe: 5: User
    Play preview: 5: User
  section Inspect
    Open warnings: 4: User
```

## Runtime / API Contract

Keyboard commands:

- Space: play/pause.
- Home/End: seek start/end.
- Left/Right: step one frame.
- Shift+Left/Right: step ten frames.
- K: add keyframe at playhead.
- Delete: delete selected keyframe or track.
- I/O: set work area in/out.
- L: toggle loop.
- Cmd/Ctrl+S: save SVG.
- Cmd/Ctrl+O: open SVG.

## Data / State / Schema Model

No persisted schema changes. Focus state and roving index are runtime UI state.

## Security / Trust Boundary

No new SVG import boundary. Keyboard-accessible source/warning panels must not
render unsafe SVG as executable content.

## Accessibility Posture

| Surface | Requirement |
| ------- | ----------- |
| Menubar | Keyboard menu expectations. |
| Canvas selection | Layers panel alternative. |
| Timeline rows | Keyboard navigable rows and keyframes. |
| Keyframes | Focusable controls with time/value labels. |
| Warnings | Badge count and textual list. |

## Localization / Directionality Posture

Keyboard shortcut labels and accessible names are visible strings. Directional
keys must remain logical under right-to-left layout.

## Agent Inspectability

Browser witnesses inspect roles, names, focused element, shortcut effects,
warning count, and timeline state facts.

## Linked Invariants

- Canvas interactions need non-pointer alternatives.
- Visual-only information needs a non-visual equivalent.
- Browser witnesses prove lower-mode behavior.

## Alternatives Considered

### Option A: Add Accessibility Opportunistically

Pros:

- Lower immediate scope.

Cons:

- Risks inaccessible architecture after UI hardens.

### Option B: Dedicated Keyboard Witness Goal

Pros:

- Forces cross-feature proof after major shell surfaces exist.
- Gives agents reliable lower-mode assertions.

Cons:

- Some fixes may touch multiple surfaces.

## Decision

Choose Option B. Accessibility proof is a goal, not a cleanup note.

## Implementation Slices

- [ ] Slice 1: Add landmarks and accessible names.
- [ ] Slice 2: Add timeline row/keyframe focus model.
- [ ] Slice 3: Add keyboard keyframe add/move/delete commands.
- [ ] Slice 4: Add menu/dialog/panel focus return checks.
- [ ] Slice 5: Add keyboard-only golden path witness.

## Tests To Write First

- [ ] Browser witness: keyboard-only import/select/edit/play path.
- [ ] Browser witness: focus does not enter closed panels.
- [ ] Browser witness: warning badge exposes count and opens list.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| Core workflow is keyboard-operable | Keyboard-only browser witness |
| Visual state has text equivalent | Role/name assertions |
| Focus is deterministic | Focus order assertions |

## Acceptance Criteria

- [ ] Keyboard-only golden path passes.
- [ ] Focus order is deterministic.
- [ ] Keyframe controls have accessible names.
- [ ] Warning state has text equivalent.
- [ ] Local validation is green.

## Validation Plan

```bash
npm run check
npm run build
node docs/method/witness/editor-shell-production-ux/keyboard-a11y-smoke.mjs
```

## Playback / Witness

Run `keyboard-a11y-smoke.mjs` against a fixture with at least one warning and
one editable target.

## Open Questions

- @flyingrobots: Do we need Playwright accessibility snapshots, or are
  role/name assertions enough? Start with role/name assertions and add
  snapshots if gaps remain.

## Follow-On Issues

- Localization catalog strategy if visible strings continue to grow.

## Retrospective

What changed from the design:

- TBD

What the tests proved:

- TBD

What remains open:

- TBD
