---
title: "G16-001 - Editor Command Model And History"
lane: "design"
goal: "Goal 16"
issue: "https://github.com/flyingrobots/tadpole/issues/38"
pr: "https://github.com/flyingrobots/tadpole/pull/48"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-04"
---

<!-- markdownlint-disable-next-line MD025 -->
# G16-001 - Editor Command Model And History

## Linked Issue

- [G16-001 - Editor Command Model And History](https://github.com/flyingrobots/tadpole/issues/38)

## Roadmap Gate

- Goal 16: Editor Command Model And History

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/cycles/UIUX_svg-native-save-roundtrip`.
- [x] Cycle branch checked out.
- [x] GitHub issue created.
- [x] `work-in-progress` label applied when implementation starts.
- [x] Design doc, issue link, and initial cycle scaffold staged and committed.
- [x] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Goal 16 routes editor mutations through typed command intents and reversible
history entries. The UI dispatches commands; command handlers mutate editor
state; effects render preview and serialization from state.

## Sponsored Human

A user wants undo and redo for destructive edits so that timeline authoring is
safe, without manually rebuilding tracks after a mistaken operation.

## Sponsored Agent

An agent needs pure command handlers and inspectable state transitions so it
can verify editor behavior without driving every path through pixels.

## Hill

By the end of this cycle, key timeline mutations dispatch through command IDs
and can be undone/redone through menu and keyboard paths, proven by focused
command tests and browser smoke coverage.

## Current Truth

- Much editor UI behavior currently lives directly in `frontend/src/App.svelte`.
- Goal 16 adds runtime-backed command state and history objects in
  `frontend/src/EditorCommands.ts`.
- Undo/redo is exposed through the Edit menu and platform keyboard shortcuts in
  `frontend/src/App.svelte`.
- The proof set includes
  `docs/method/witness/editor-shell-production-ux/command-history-core.ts` and
  `docs/method/witness/editor-shell-production-ux/command-history-smoke.mjs`.
- Existing issues track related debt: [#17](https://github.com/flyingrobots/tadpole/issues/17)
  and [#23](https://github.com/flyingrobots/tadpole/issues/23).
- Parent design: [Public Editor Commands](../design.md#public-editor-commands).

## Problem

As the production UX grows, direct UI state mutation will make undo/redo,
serialization, witnesses, and future scripting brittle.

## Scope

This cycle includes:

- Typed command intent definitions.
- Pure timeline mutation helpers.
- Dispatch path for selection, track, and keyframe edits.
- Undo/redo for core keyframe and track operations.
- Menu/keyboard bindings for undo/redo.

## Non-Goals

This cycle does not include:

- Full application decomposition.
- Multi-document history.
- Persistence serializer implementation.
- Collaborative editing.

## User Experience / Product Shape

Users invoke commands through menus, keyboard, timeline controls, or panels.
Undo and redo appear in Edit menu and keyboard shortcuts.

```mermaid
flowchart LR
  UI[UI event] --> Command[Command intent]
  Command --> Reducer[State mutation]
  Reducer --> History[History entry]
  Reducer --> Preview[Preview effect]
  Reducer --> Export[Export/serializer state]
```

## Runtime / API Contract

Initial command types:

- `target.select`
- `track.add`
- `track.remove`
- `keyframe.set`
- `keyframe.move`
- `keyframe.delete`
- `timeline.seek`
- `edit.undo`
- `edit.redo`

Command handlers return next state plus optional history entry. Drag previews
may update state without stack growth, but commit a single `keyframe.move`
history transition when the drag ends.

## Data / State / Schema Model

History stores reversible command deltas for runtime editor state. History is
not persisted into saved SVG in this goal.

## Security / Trust Boundary

Commands that introduce SVG-derived values must use existing validation helpers
before values enter state.

## Accessibility Posture

| Surface | Requirement |
| ------- | ----------- |
| Edit menu | Undo/redo disabled state exposed by menu items and facts. |
| Keyboard | Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z redo paths. |
| Status | Undo/redo action result exposed in a command-history status chip. |
| Focus | Undo/redo must not lose selected row/keyframe unexpectedly. |

## Localization / Directionality Posture

Menu labels and status messages are visible strings. Command IDs are stable and
not localized.

## Agent Inspectability

Tests inspect command input, state output, history stack depth, selected IDs,
and browser command IDs.

## Linked Invariants

- Commands change state; effects do not.
- Runtime behavior is the proof.
- Timeline state must remain deterministic.

## Alternatives Considered

### Option A: Add Undo Directly Around UI Handlers

Pros:

- Smaller first patch.

Cons:

- Preserves brittle mutation paths.

### Option B: Introduce Command Boundary

Pros:

- Enables undo, testing, scripting, and serialization clarity.

Cons:

- Requires careful incremental extraction.

## Decision

Choose Option B. Command boundaries are the correct foundation for production
editing.

## Implementation Slices

- [x] Slice 1: Extract pure timeline mutation helpers.
- [x] Slice 2: Add command intent types and dispatcher.
- [x] Slice 3: Route keyframe set/move/delete through commands.
- [x] Slice 4: Add reversible history stack and undo/redo commands.
- [x] Slice 5: Add focused tests and browser smoke.

## Tests To Write First

- [x] Focused command test: set/move/delete keyframe changes state.
- [x] Focused command test: undo/redo restores previous state.
- [x] Browser witness: Edit > Undo reverses keyframe edit.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| Commands mutate state | Focused command tests |
| Undo/redo is reliable | State and browser tests |
| UI dispatch is inspectable | Command-id assertions |

## Acceptance Criteria

- [x] Core timeline edits dispatch through commands.
- [x] Undo/redo covers keyframe and track operations.
- [x] Existing import/preview behavior remains green.
- [x] Command tests do not require pixel scraping.
- [x] Local validation is green.

## Validation Plan

```bash
npm run check
npm run build
npm audit --audit-level=moderate
npx tsx docs/method/witness/editor-shell-production-ux/command-history-core.ts
node docs/method/witness/editor-shell-production-ux/command-history-smoke.mjs
node docs/method/witness/editor-shell-production-ux/svg-save-roundtrip-smoke.mjs
node docs/method/witness/editor-shell-production-ux/work-area-smoke.mjs
node docs/method/witness/editor-shell-production-ux/timeline-stacks-smoke.mjs
node docs/method/witness/editor-shell-production-ux/menu-dialogs-smoke.mjs
node docs/method/witness/editor-shell-production-ux/panel-host-smoke.mjs
node docs/method/witness/editor-shell-production-ux/editor-shell-smoke.mjs
```

## Playback / Witness

- `npx tsx docs/method/witness/editor-shell-production-ux/command-history-core.ts`
- `node docs/method/witness/editor-shell-production-ux/command-history-smoke.mjs`

## Open Questions

- @flyingrobots: Should import/revert be undoable in this goal or a follow-on?
  Answer: follow-on. Goal 16 covers timeline keyframe and track command history.

## Follow-On Issues

- [#17 Decompose the Svelte editor monolith](https://github.com/flyingrobots/tadpole/issues/17)
- [#23 Add undo and redo](https://github.com/flyingrobots/tadpole/issues/23)

## Retrospective

What changed from the design:

- Added `EditorCommands.ts` as the runtime command/history boundary and wired
  keyframe set/move/delete plus track add/remove through command dispatch.
- Added a single committed drag-history transition so drag previews do not flood
  undo but still produce coherent redo/undo snapshots.
- Added Edit menu undo/redo controls, platform keyboard shortcuts, and an
  inspectable command-history status chip.

What the tests proved:

- Pure command dispatch mutates state deterministically, records undo/redo
  entries, preserves drag-preview stack shape, and clears redo on new commands.
- Browser witness proves keyframe add/value edit, track duplicate/delete,
  Edit-menu undo, and keyboard undo/redo update the exported project timeline.

What remains open:

- Import/revert undo, multi-document history, full app decomposition, and
  command history persistence remain follow-ons.

PR:

- [#48](https://github.com/flyingrobots/tadpole/pull/48)
